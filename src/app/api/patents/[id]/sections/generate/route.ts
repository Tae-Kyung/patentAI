import { NextRequest } from 'next/server'
import { z } from 'zod'
import { preparePatentGeneration, stripCodeFence } from '@/lib/services/patent-generator'
import { streamClaude, createSSEResponse } from '@/lib/ai/claude'
import { preparePrompt } from '@/lib/prompts'
import { errorResponse } from '@/lib/utils/api-response'
import type { PatentSectionType } from '@/types/database'

export const maxDuration = 300 // 5분 — 상세한 설명은 생성에 시간이 걸림

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


const bodySchema = z.object({
  section_type: z.enum([
    'title', 'tech_field', 'background', 'problem',
    'solution', 'effect', 'drawing_desc', 'detailed_desc', 'abstract',
  ] as [PatentSectionType, ...PatentSectionType[]]),
  // 전체 순차 생성 모드
  generate_all: z.boolean().default(false),
})

async function buildContext(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  projectId: string,
  project: import('@/types/database').PatentProject,
) {
  const [{ data: claims }, { data: components }, { data: drawings }, { data: latestInput }] = await Promise.all([
    supabase
      .from('patentai_patent_claims')
      .select('claim_number, claim_type, content')
      .eq('project_id', projectId)
      .order('claim_number', { ascending: true }),
    supabase
      .from('patentai_patent_components')
      .select('ref_number, name, description')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true }),
    supabase
      .from('patentai_patent_drawings')
      .select('drawing_number, caption, drawing_type')
      .eq('project_id', projectId)
      .order('drawing_number', { ascending: true }),
    supabase
      .from('patentai_patent_inputs')
      .select('analysis_result')
      .eq('project_id', projectId)
      .not('analysis_result', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  const analysisResult = latestInput?.analysis_result as Record<string, unknown> | null
  const problemsSolved = analysisResult?.problems_solved ?? []
  const effects = analysisResult?.effects ?? []
  const coreInventions = Array.isArray(project.core_inventions)
    ? (project.core_inventions as string[])
    : []

  const inventionSummary = [
    `발명명칭: ${project.title}`,
    `기술분야: ${project.tech_domain ?? ''}`,
    `핵심 발명 포인트:\n${coreInventions.map((v, i) => `  ${i + 1}. ${v}`).join('\n')}`,
    `해결 과제:\n${(problemsSolved as string[]).map((v, i) => `  ${i + 1}. ${v}`).join('\n')}`,
    `기술적 효과:\n${(effects as string[]).map((v, i) => `  ${i + 1}. ${v}`).join('\n')}`,
  ].join('\n\n')

  const claimsList = claims ?? []
  const claimsSummary = claimsList
    .map((c) => `청구항 ${c.claim_number} (${c.claim_type}): ${c.content}`)
    .join('\n\n')
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const body = await request.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400)

  const sectionType = parsed.data.section_type
  const promptKey = SECTION_PROMPT_MAP[sectionType]

  // GATE 3 통과 확인
  const ctx = await preparePatentGeneration(id, promptKey, 3)
  if (ctx instanceof Response) return ctx

  const { supabase, project } = ctx
  const context = await buildContext(supabase, id, project)

  const prepared = await preparePrompt(promptKey, context)
  if (!prepared) return errorResponse('프롬프트를 불러올 수 없습니다.', 500)

  async function* generate() {
    let fullText = ''

    for await (const event of streamClaude(prepared!.systemPrompt, prepared!.userPrompt, {
      model: prepared!.model,
      temperature: prepared!.temperature,
      maxTokens: prepared!.maxTokens,
    })) {
      if (event.type === 'text') {
        fullText += event.data
        yield { type: 'text', data: event.data }
      }
    }

    // 코드펜스 제거 (일부 섹션은 마크다운 반환)
    const content = stripCodeFence(fullText)

    // UPSERT
    const { error } = await supabase
      .from('patentai_patent_sections')
      .upsert(
        {
          project_id: id,
          section_type: sectionType,
          content,
          version: 1,
        },
        { onConflict: 'project_id,section_type' },
      )

    if (error) {
      yield { type: 'error', data: '섹션 저장 실패' }
    } else {
      yield { type: 'result', data: JSON.stringify({ section_type: sectionType, content }) }
    }

    yield { type: 'done', data: '' }
  }

  return createSSEResponse(generate())
}
