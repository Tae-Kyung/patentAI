import { NextRequest } from 'next/server'
import { preparePatentGeneration } from '@/lib/services/patent-generator'
import { callClaude } from '@/lib/ai/claude'
import { generateImage } from '@/lib/ai/gemini'
import { createServiceClient } from '@/lib/supabase/service'
import { createSSEResponse } from '@/lib/ai/claude'
import { errorResponse } from '@/lib/utils/api-response'
import type { PatentDrawingType } from '@/types/database'

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
- KIPO 특허 도면 규격 준수`

async function planDrawings(
  title: string,
  techDomain: string,
  coreInventions: unknown,
  components: { ref_number: string; name: string; description: string | null }[],
): Promise<DrawingPlan[]> {
  const systemPrompt = `You are a Korean patent attorney specialized in creating patent drawing plans.
Analyze the invention components and suggest 3-5 patent drawings.
Return ONLY a valid JSON array, no markdown, no explanation.`

  const componentList = components
    .map((c) => `${c.ref_number}. ${c.name}: ${c.description ?? ''}`)
    .join('\n')

  const userPrompt = `Invention: ${title}
Tech domain: ${techDomain}
Core inventions: ${JSON.stringify(coreInventions)}

Components:
${componentList}

Return a JSON array of 3-5 drawing plans:
[
  {
    "drawing_number": 1,
    "drawing_type": "system_architecture",
    "caption": "시스템 전체 구성도",
    "gemini_prompt": "한국 특허 도면: 시스템 전체 구성도. 흑백 선화 스타일. 모든 텍스트와 레이블은 한국어로 작성. 구성요소: 100-메인시스템, 110-입력모듈, 120-처리모듈, 130-출력모듈. 각 박스를 화살표로 연결하고 참조번호와 한국어 명칭을 함께 표기."
  }
]

drawing_type must be one of: system_architecture, flowchart, ui_wireframe, data_flow, other
caption must be in Korean (20 chars max).
gemini_prompt must be in Korean, detailed enough for Gemini to draw precise KIPO-standard patent diagram with ALL text, labels, and component names in Korean.`

  const result = await callClaude(systemPrompt, userPrompt, {
    model: 'claude-sonnet-4-20250514',
    temperature: 0.3,
    maxTokens: 2000,
  })

  const text = result.content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
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

  const { data: components } = await supabase
    .from('patentai_patent_components')
    .select('ref_number, name, description')
    .eq('project_id', id)
    .order('order_index', { ascending: true })

  if (!components?.length) {
    return errorResponse('STEP 2 구성요소가 없습니다. 먼저 구성요소를 생성해주세요.', 400)
  }

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
          { model: 'gemini-3-pro-image-preview', temperature: 0.4 },
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
