import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateImage } from '@/lib/ai/gemini'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const bodySchema = z.object({
  drawing_number: z.number().int().min(1),
  drawing_type: z.enum(['system_architecture', 'flowchart', 'ui_wireframe', 'data_flow', 'other']),
  caption: z.string().min(1).max(200),
  custom_prompt: z.string().optional(),
})

const DRAWING_SYSTEM_PROMPT = `당신은 한국 특허청(KIPO) 기준의 특허 도면 생성 전문가입니다.
다음 규칙에 따라 도면을 생성하세요:
- 모든 레이블, 구성요소 명칭, 설명 텍스트는 반드시 한국어로 작성
- 참조번호와 한국어 명칭을 함께 표기 (예: 100-메인시스템, 110-입력모듈)
- 단순하고 명확한 흑백 선화(line art) 스타일
- 장식 없이 기능적 구성요소만 표현
- 이미지 내부에 Fig. 번호, 도면 제목, 캡션 텍스트를 포함하지 마시오 (명세서 본문에서 별도 기술)
- 워터마크, 기관명, 'KIPO', '특허청', '도상', 도장, 로고 등 일체의 기관 식별 요소를 포함하지 마시오
- 이미지 외곽에 테두리 프레임이나 페이지 번호를 추가하지 마시오`

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await requireAuth()
    const supabase = await createClient()

    const { data: project } = await supabase
      .from('patentai_patent_projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return errorResponse('프로젝트를 찾을 수 없습니다.', 404)

    // GATE 4 확인
    const { data: gate4 } = await supabase
      .from('patentai_patent_gates')
      .select('status')
      .eq('project_id', id)
      .eq('gate_number', 4)
      .single()

    if (!gate4 || gate4.status !== 'approved') {
      return errorResponse('GATE 4 승인이 필요합니다.', 400)
    }

    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400)

    const userPrompt = parsed.data.custom_prompt?.trim() ||
      `한국 특허 도면을 생성하세요. 도면 유형: ${parsed.data.drawing_type.replace(/_/g, ' ')}, 제목: ${parsed.data.caption}. 모든 텍스트와 레이블은 한국어로 작성하고, 참조번호는 100번부터 시작하세요.`

    // Gemini로 이미지 생성
    const { imageData, mimeType } = await generateImage(DRAWING_SYSTEM_PROMPT, userPrompt, {
      model: 'gemini-3-pro-image-preview',
      temperature: 0.4,
    })

    // Supabase Storage 업로드 (service role)
    const serviceSupabase = createServiceClient()
    const filename = `${id}/${Date.now()}_fig${parsed.data.drawing_number}.png`
    const { error: uploadError } = await serviceSupabase.storage
      .from('patent-drawings')
      .upload(filename, imageData, { contentType: mimeType, upsert: true })

    if (uploadError) {
      console.error('[drawings/generate] upload error:', uploadError)
      return errorResponse('이미지 업로드 실패', 500)
    }

    const { data: { publicUrl } } = serviceSupabase.storage
      .from('patent-drawings')
      .getPublicUrl(filename)

    // DB 저장 (upsert by drawing_number)
    const { data: existing } = await supabase
      .from('patentai_patent_drawings')
      .select('id')
      .eq('project_id', id)
      .eq('drawing_number', parsed.data.drawing_number)
      .single()

    let savedDrawing
    if (existing) {
      const { data } = await supabase
        .from('patentai_patent_drawings')
        .update({
          drawing_type: parsed.data.drawing_type,
          caption: parsed.data.caption,
          image_url: publicUrl,
          prompt_used: userPrompt,
        })
        .eq('id', existing.id)
        .select()
        .single()
      savedDrawing = data
    } else {
      const { data } = await supabase
        .from('patentai_patent_drawings')
        .insert({
          project_id: id,
          drawing_number: parsed.data.drawing_number,
          drawing_type: parsed.data.drawing_type,
          caption: parsed.data.caption,
          image_url: publicUrl,
          prompt_used: userPrompt,
        })
        .select()
        .single()
      savedDrawing = data
    }

    return successResponse(savedDrawing)
  } catch (error) {
    return handleApiError(error)
  }
}
