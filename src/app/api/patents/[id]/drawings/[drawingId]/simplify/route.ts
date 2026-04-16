import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { simplifyDrawingToPatentStyle } from '@/lib/ai/gemini'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

export const maxDuration = 180

const PATENT_STYLE_SYSTEM_PROMPT = `당신은 한국 특허청(KIPO) 기준의 특허 도면 변환 전문가입니다.
첨부된 기술 도면을 참고하여 특허 명세서에 적합한 도면으로 재생성하세요:
- 흑백 선화(line art) 스타일로 단순화
- 핵심 구성요소만 남기고 불필요한 장식 제거
- 참조번호와 한국어 명칭을 함께 표기 (예: 100-메인시스템)
- 이미지 내부에 Fig. 번호, 제목, 캡션 텍스트를 포함하지 마시오
- 워터마크, 기관명, 'KIPO', '특허청', '도상', 도장, 로고 등 기관 식별 요소를 포함하지 마시오
- 이미지 외곽에 테두리 프레임이나 페이지 번호를 추가하지 마시오`

// POST: 외부 도면을 특허 도면 스타일로 변환
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; drawingId: string }> },
) {
  try {
    const { id, drawingId } = await params
    const user = await requireAuth()
    const supabase = await createClient()

    // 프로젝트 소유권 + 도면 확인
    const { data: drawing } = await supabase
      .from('patentai_patent_drawings')
      .select('id, project_id, image_url, caption, drawing_type, drawing_number')
      .eq('id', drawingId)
      .eq('project_id', id)
      .single()

    if (!drawing) return errorResponse('도면을 찾을 수 없습니다.', 404)

    const { data: project } = await supabase
      .from('patentai_patent_projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return errorResponse('접근 권한이 없습니다.', 403)

    if (!drawing.image_url) return errorResponse('변환할 이미지가 없습니다.', 400)

    // 원본 이미지 다운로드
    const imgResponse = await fetch(drawing.image_url)
    if (!imgResponse.ok) return errorResponse('원본 이미지를 불러올 수 없습니다.', 500)

    const imgBuffer = Buffer.from(await imgResponse.arrayBuffer())
    const contentType = imgResponse.headers.get('content-type') || 'image/png'

    const userPrompt = `위 도면을 참고하여 한국 특허 도면 규격에 맞게 재생성하세요.
도면 제목: ${drawing.caption ?? '기술 도면'}
도면 유형: ${drawing.drawing_type.replace(/_/g, ' ')}
모든 레이블과 명칭은 한국어로 표기하세요.`

    // Gemini로 특허 도면 스타일 변환
    const { imageData, mimeType } = await simplifyDrawingToPatentStyle(
      imgBuffer,
      contentType,
      PATENT_STYLE_SYSTEM_PROMPT,
      userPrompt,
    )

    // Storage 업로드
    const serviceSupabase = createServiceClient()
    const filename = `${id}/${Date.now()}_simplified_${drawingId}.png`
    const { error: uploadError } = await serviceSupabase.storage
      .from('patent-drawings')
      .upload(filename, imageData, { contentType: mimeType, upsert: true })

    if (uploadError) return errorResponse('변환 이미지 업로드 실패', 500)

    const { data: { publicUrl } } = serviceSupabase.storage
      .from('patent-drawings')
      .getPublicUrl(filename)

    // DB 업데이트 — 변환된 이미지로 교체
    const { data: updated, error: updateError } = await supabase
      .from('patentai_patent_drawings')
      .update({ image_url: publicUrl, prompt_used: 'external_simplified' })
      .eq('id', drawingId)
      .select()
      .single()

    if (updateError) return errorResponse('도면 업데이트 실패', 500)

    return successResponse({ drawing: updated, simplified_url: publicUrl })
  } catch (error) {
    return handleApiError(error)
  }
}
