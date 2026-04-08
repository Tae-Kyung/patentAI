import { NextRequest } from 'next/server'
import { preparePatentGeneration, stripCodeFence } from '@/lib/services/patent-generator'
import { streamClaude, createSSEResponse } from '@/lib/ai/claude'
import { preparePrompt } from '@/lib/prompts'
import { errorResponse } from '@/lib/utils/api-response'
import type { PatentSectionType } from '@/types/database'

export const maxDuration = 300 // 5분 — 9개 섹션 병렬 생성

const SECTION_PROMPT_MAP: Record<PatentSectionType, string> = {
  title: 'patent_section_title',
  tech_field: 'patent_section_tech_field',
  background: 'patent_section_background',
  problem: 'patent_section_problem',
  solution: 'patent_section_solution',
  effect: 'patent_section_effect',
  drawing_desc: 'patent_section_drawing_desc',
  detailed_desc: 'patent_section_detailed_desc',
  abstract: 'patent_section_abstract',
}

const SECTION_ORDER: PatentSectionType[] = [
  'title', 'tech_field', 'background', 'problem',
  'solution', 'effect', 'drawing_desc', 'detailed_desc', 'abstract',
]

async function buildContext(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  projectId: string,
  project: import('@/types/database').PatentProject,
) {
  const [{ data: claims }, { data: components }, { data: drawings }, { data: latestInput }] = await Promise.all([
    supabase.from('patentai_patent_claims').select('claim_number, claim_type, content').eq('project_id', projectId).order('claim_number', { ascending: true }),
    supabase.from('patentai_patent_components').select('ref_number, name, description').eq('project_id', projectId).order('order_index', { ascending: true }),
    supabase.from('patentai_patent_drawings').select('drawing_number, caption, drawing_type').eq('project_id', projectId).order('drawing_number', { ascending: true }),
    supabase.from('patentai_patent_inputs').select('analysis_result').eq('project_id', projectId).not('analysis_result', 'is', null).order('created_at', { ascending: false }).limit(1).single(),
  ])

  const analysisResult = latestInput?.analysis_result as Record<string, unknown> | null
  const problemsSolved = analysisResult?.problems_solved ?? []
  const effects = analysisResult?.effects ?? []
  const coreInventions = Array.isArray(project.core_inventions) ? (project.core_inventions as string[]) : []

  const inventionSummary = [
    `발명명칭: ${project.title}`,
    `기술분야: ${project.tech_domain ?? ''}`,
    `핵심 발명 포인트:\n${coreInventions.map((v, i) => `  ${i + 1}. ${v}`).join('\n')}`,
    `해결 과제:\n${(problemsSolved as string[]).map((v, i) => `  ${i + 1}. ${v}`).join('\n')}`,
    `기술적 효과:\n${(effects as string[]).map((v, i) => `  ${i + 1}. ${v}`).join('\n')}`,
  ].join('\n\n')

  const claimsList = claims ?? []
  const claimsSummary = claimsList.map((c) => `청구항 ${c.claim_number} (${c.claim_type}): ${c.content}`).join('\n\n')
  const claim1 = claimsList.find((c) => c.claim_number === 1)?.content ?? ''

  return {
    tech_domain: project.tech_domain ?? '',
    core_inventions: JSON.stringify(project.core_inventions, null, 2),
    ipc_codes: JSON.stringify(project.ipc_codes),
    claims: JSON.stringify(claimsList, null, 2),
    components: JSON.stringify(components ?? [], null, 2),
    drawings: JSON.stringify(drawings ?? [], null, 2),
    invention_summary: inventionSummary,
    problems_solved: JSON.stringify(problemsSolved, null, 2),
    effects: JSON.stringify(effects, null, 2),
    claims_summary: claimsSummary,
    claim_1: claim1,
  }
}

interface SectionResult {
  sectionType: PatentSectionType
  content: string
  error?: string
}

async function generateOneSection(
  sectionType: PatentSectionType,
  context: Record<string, string>,
): Promise<SectionResult> {
  const promptKey = SECTION_PROMPT_MAP[sectionType]
  const prepared = await preparePrompt(promptKey, context)
  if (!prepared) return { sectionType, content: '', error: '프롬프트 없음' }

  let fullText = ''
  try {
    for await (const event of streamClaude(prepared.systemPrompt, prepared.userPrompt, {
      model: prepared.model,
      temperature: prepared.temperature,
      maxTokens: prepared.maxTokens,
    })) {
      if (event.type === 'text') fullText += event.data
    }
  } catch {
    return { sectionType, content: '', error: 'Claude 오류' }
  }

  return { sectionType, content: stripCodeFence(fullText) }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  // GATE 3 확인 + 크레딧 1회 차감 (9개 섹션 일괄)
  const ctx = await preparePatentGeneration(id, 'patent_section_detailed_desc', 3)
  if (ctx instanceof Response) return ctx

  const { supabase, project } = ctx
  const context = await buildContext(supabase, id, project)

  async function* generate() {
    // 완료된 결과를 담는 큐 + notify 패턴
    const queue: SectionResult[] = []
    let notify: (() => void) | null = null
    let received = 0

    const waitOne = () => new Promise<void>((resolve) => {
      notify = resolve
    })

    // 9개 섹션을 병렬 시작
    for (const sectionType of SECTION_ORDER) {
      generateOneSection(sectionType, context).then((result) => {
        queue.push(result)
        const fn = notify
        notify = null
        fn?.()
      }).catch(() => {
        queue.push({ sectionType, content: '', error: '생성 실패' })
        const fn = notify
        notify = null
        fn?.()
      })
    }

    // 완료되는 순서대로 스트리밍
    while (received < SECTION_ORDER.length) {
      if (queue.length === 0) {
        await waitOne()
      }

      while (queue.length > 0) {
        const result = queue.shift()!
        received++

        // 성공한 섹션은 DB에 저장
        if (result.content && !result.error) {
          await supabase.from('patentai_patent_sections').upsert(
            {
              project_id: id,
              section_type: result.sectionType,
              content: result.content,
              version: 1,
            },
            { onConflict: 'project_id,section_type' },
          )
        }

        yield {
          type: 'section_done',
          data: JSON.stringify({
            section_type: result.sectionType,
            content: result.content,
            error: result.error,
            done: received,
            total: SECTION_ORDER.length,
          }),
        }
      }
    }

    yield { type: 'done', data: '' }
  }

  return createSSEResponse(generate())
}
