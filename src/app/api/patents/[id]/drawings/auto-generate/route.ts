import { NextRequest } from 'next/server'
import { z } from 'zod'
import { preparePatentGeneration, stripCodeFence } from '@/lib/services/patent-generator'
import { callClaude } from '@/lib/ai/claude'
import { generateImage } from '@/lib/ai/gemini'
import { createServiceClient } from '@/lib/supabase/service'
import { createSSEResponse } from '@/lib/ai/claude'
import { errorResponse } from '@/lib/utils/api-response'
import type { PatentDrawingType } from '@/types/database'

const bodySchema = z.object({
  target_count: z.number().int().min(1).max(10).default(3),
})

export const maxDuration = 300

interface DrawingPlan {
  drawing_number: number
  drawing_type: PatentDrawingType
  caption: string
  gemini_prompt: string
}

const DRAWING_SYSTEM_PROMPT = `당신은 한국 특허청(KIPO) 기준의 특허 도면 생성 전문가입니다.
다음 규칙에 따라 도면을 생성하세요:
- 모든 레이블, 구성요소 명칭, 설명 텍스트는 반드시 한국어로 작성
- 참조번호와 한국어 명칭을 함께 표기 (예: 100-메인시스템, 110-입력모듈)
- 단순하고 명확한 흑백 선화(line art) 스타일
- 장식 없이 기능적 구성요소만 표현
- 이미지 내부에 Fig. 번호, 도면 제목, 캡션 텍스트를 포함하지 마시오 (명세서 본문에서 별도 기술)
- 워터마크, 기관명, 'KIPO', '특허청', '도상', 도장, 로고 등 일체의 기관 식별 요소를 포함하지 마시오
- 이미지 외곽에 테두리 프레임이나 페이지 번호를 추가하지 마시오`

async function planDrawings(
  title: string,
  techDomain: string,
  coreInventions: unknown,
  components: { ref_number: string; name: string; description: string | null }[],
  drawingDescSection: string | null,
  targetCount: number,
): Promise<DrawingPlan[]> {
  const hasDrawingDesc = drawingDescSection && drawingDescSection.trim().length > 0

  // 명세서 drawing_desc에서 도면 목록만 추출 (예: "도 1 - 시스템 구성도", "도 2 - 흐름도")
  let drawingList = ''
  if (hasDrawingDesc) {
    const lines = drawingDescSection.split('\n').filter((l: string) => /도\s*\d|[Ff]ig/i.test(l))
    drawingList = lines.length > 0
      ? lines.map((l: string) => l.trim()).join('\n')
      : drawingDescSection.slice(0, 500) // 패턴 매칭 실패 시 앞부분만
  }

  const systemPrompt = hasDrawingDesc
    ? `You are a Korean patent attorney. Create drawing plans matching the specification's drawing list below.
Return ONLY a valid JSON array, no markdown, no explanation.`
    : `You are a Korean patent attorney. Suggest exactly ${targetCount} patent drawing(s).
Return ONLY a valid JSON array of exactly ${targetCount} items, no markdown, no explanation.`

  const componentList = components
    .map((c) => `${c.ref_number}. ${c.name}: ${c.description?.slice(0, 80) ?? ''}`)
    .join('\n')

  const drawingDescBlock = drawingList
    ? `\n\n## 명세서 도면 목록 (이 목록과 일치하는 도면 생성)\n${drawingList}`
    : ''

  const userPrompt = `${title} | ${techDomain}

Components:
${componentList}${drawingDescBlock}

JSON array format:
[{"drawing_number":1,"drawing_type":"system_architecture","caption":"시스템 구성도","gemini_prompt":"흑백 선화. 한국어 레이블. 참조번호 포함. 구성요소 간 화살표 연결."}]

drawing_type: system_architecture | flowchart | ui_wireframe | data_flow | other
caption: Korean, max 20 chars.
gemini_prompt: Korean, max 200 chars, diagram layout + reference numbers + connection style only.`

  const result = await callClaude(systemPrompt, userPrompt, {
    temperature: 0.3,
    maxTokens: 8000,
  })

  const text = stripCodeFence(result.content)
  return JSON.parse(text) as DrawingPlan[]
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const ctx = await preparePatentGeneration(id, 'patent_drawing_prompt_gen', 4)
  if (ctx instanceof Response) return ctx

  const { supabase, project } = ctx

  const body = await request.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(body)
  const targetCount = parsed.success ? parsed.data.target_count : 3

  const { data: components } = await supabase
    .from('patentai_patent_components')
    .select('ref_number, name, description')
    .eq('project_id', id)
    .order('order_index', { ascending: true })

  if (!components?.length) {
    return errorResponse('STEP 2 구성요소가 없습니다. 먼저 구성요소를 생성해주세요.', 400)
  }

  // 명세서 "도면의 간단한 설명" 섹션 조회
  const { data: drawingDescSection } = await supabase
    .from('patentai_patent_sections')
    .select('content')
    .eq('project_id', id)
    .eq('section_type', 'drawing_desc')
    .single()

  async function* generate() {
    // 1. 도면 계획 수립
    yield { type: 'plan_start', data: '도면 계획을 수립하는 중...' }

    let plans: DrawingPlan[]
    try {
      plans = await planDrawings(
        project.title,
        project.tech_domain ?? '',
        project.core_inventions,
        components ?? [],
        drawingDescSection?.content ?? null,
        targetCount,
      )
      yield { type: 'plan_done', data: JSON.stringify({ count: plans.length }) }
    } catch (err) {
      yield { type: 'error', data: '도면 계획 수립 실패: ' + (err instanceof Error ? err.message : String(err)) }
      yield { type: 'done', data: '' }
      return
    }

    const serviceSupabase = createServiceClient()

    // 2. 각 도면 생성
    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i]
      yield {
        type: 'drawing_start',
        data: JSON.stringify({ index: i, total: plans.length, caption: plan.caption }),
      }

      try {
        const { imageData, mimeType } = await generateImage(
          DRAWING_SYSTEM_PROMPT,
          plan.gemini_prompt,
          { temperature: 0.4 },
        )

        const filename = `${id}/${Date.now()}_fig${plan.drawing_number}.png`
        const { error: uploadError } = await serviceSupabase.storage
          .from('patent-drawings')
          .upload(filename, imageData, { contentType: mimeType, upsert: true })

        if (uploadError) {
          throw new Error(`Storage 업로드 실패: ${uploadError.message}`)
        }

        const { data: { publicUrl } } = serviceSupabase.storage
          .from('patent-drawings')
          .getPublicUrl(filename)

        // upsert by drawing_number
        const { data: existing } = await supabase
          .from('patentai_patent_drawings')
          .select('id')
          .eq('project_id', id)
          .eq('drawing_number', plan.drawing_number)
          .single()

        if (existing) {
          await supabase
            .from('patentai_patent_drawings')
            .update({
              drawing_type: plan.drawing_type,
              caption: plan.caption,
              image_url: publicUrl,
              prompt_used: plan.gemini_prompt,
            })
            .eq('id', existing.id)
        } else {
          await supabase
            .from('patentai_patent_drawings')
            .insert({
              project_id: id,
              drawing_number: plan.drawing_number,
              drawing_type: plan.drawing_type,
              caption: plan.caption,
              image_url: publicUrl,
              prompt_used: plan.gemini_prompt,
            })
        }

        yield {
          type: 'drawing_done',
          data: JSON.stringify({
            index: i,
            total: plans.length,
            drawing_number: plan.drawing_number,
            caption: plan.caption,
            image_url: publicUrl,
          }),
        }
      } catch (err) {
        yield {
          type: 'drawing_error',
          data: JSON.stringify({
            index: i,
            caption: plan.caption,
            error: err instanceof Error ? err.message : String(err),
          }),
        }
      }
    }

    yield { type: 'done', data: '' }
  }

  return createSSEResponse(generate())
}
