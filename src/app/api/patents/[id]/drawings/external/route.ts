import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { analyzeImageWithVision } from '@/lib/ai/gemini'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

export const maxDuration = 120

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'application/pdf']
const MAX_FILE_SIZE_MB = 10

const metaSchema = z.object({
  drawing_number: z.coerce.number().int().min(1),
  drawing_type: z.enum(['system_architecture', 'flowchart', 'ui_wireframe', 'data_flow', 'other']).default('other'),
  caption: z.string().min(1).max(200),
})

const ANALYSIS_PROMPT = `이 도면은 특허 명세서에 포함될 기술 도면입니다.
다음 항목을 한국어로 분석하여 JSON으로 반환하세요:

{
  "description": "도면 전체 설명 (2-3문장, 특허 명세서 S8 섹션에 적합한 문체)",
  "components": [
    { "ref_number": "100", "name": "구성요소명", "description": "기능 설명" }
  ],
  "drawing_flow": "도면이 표현하는 동작 흐름 또는 구조 관계 (1-2문장)",
  "drawing_desc_line": "도면의 간단한 설명 한 줄 (S7 섹션용, 예: '도 1은 시스템 전체 구성도이다.')"
}

참조번호가 없으면 100번부터 주요 구성요소에 순서대로 부여하세요.
반드시 JSON만 반환하고 마크다운 코드블록 없이 순수 JSON으로 답하세요.`

// POST: 외부 도면 업로드 + AI 해석
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await requireAuth()
    const supabase = await createClient()

    // 프로젝트 소유권 확인
    const { data: project } = await supabase
      .from('patentai_patent_projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return errorResponse('프로젝트를 찾을 수 없습니다.', 404)

    const formData = await request.formData()
    const file = formData.get('image') as File | null
    const metaRaw = {
      drawing_number: formData.get('drawing_number'),
      drawing_type: formData.get('drawing_type'),
      caption: formData.get('caption'),
    }

    if (!file) return errorResponse('이미지 파일이 필요합니다.', 400)

    // MIME 타입 검증
    const fileMime = file.type || 'application/octet-stream'
    const ext = file.name.split('.').pop()?.toLowerCase()
    const mimeType = fileMime !== 'application/octet-stream'
      ? fileMime
      : ext === 'png' ? 'image/png'
      : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
      : ext === 'webp' ? 'image/webp'
      : ext === 'svg' ? 'image/svg+xml'
      : ext === 'pdf' ? 'application/pdf'
      : fileMime

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return errorResponse(`지원하지 않는 파일 형식입니다. (PNG, JPG, WebP, SVG, PDF 허용)`, 400)
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return errorResponse(`파일 크기는 ${MAX_FILE_SIZE_MB}MB 이하여야 합니다.`, 400)
    }

    const parsed = metaSchema.safeParse(metaRaw)
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400)

    const buffer = Buffer.from(await file.arrayBuffer())

    // Supabase Storage 업로드 (원본)
    const serviceSupabase = createServiceClient()
    const filename = `${id}/${Date.now()}_external_fig${parsed.data.drawing_number}.${ext ?? 'png'}`
    const { error: uploadError } = await serviceSupabase.storage
      .from('patent-drawings')
      .upload(filename, buffer, { contentType: mimeType, upsert: true })

    if (uploadError) return errorResponse('이미지 업로드 실패', 500)

    const { data: { publicUrl } } = serviceSupabase.storage
      .from('patent-drawings')
      .getPublicUrl(filename)

    // PDF는 Vision 분석에서 제외 (이미지만 분석)
    let analysis: {
      description: string
      components: { ref_number: string; name: string; description: string }[]
      drawing_flow: string
      drawing_desc_line: string
    } | null = null

    if (mimeType !== 'application/pdf') {
      try {
        const raw = await analyzeImageWithVision(buffer, mimeType, ANALYSIS_PROMPT, {
          model: 'gemini-2.5-flash',
          temperature: 0.2,
        })
        const jsonText = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
        analysis = JSON.parse(jsonText)
      } catch {
        // 분석 실패 시 null로 계속 진행
      }
    }

    // DB 저장 (upsert by drawing_number)
    const { data: existing } = await supabase
      .from('patentai_patent_drawings')
      .select('id')
      .eq('project_id', id)
      .eq('drawing_number', parsed.data.drawing_number)
      .single()

    let savedDrawing
    const drawingPayload = {
      drawing_type: parsed.data.drawing_type,
      caption: parsed.data.caption,
      image_url: publicUrl,
      prompt_used: 'external',
    }

    if (existing) {
      const { data } = await supabase
        .from('patentai_patent_drawings')
        .update(drawingPayload)
        .eq('id', existing.id)
        .select()
        .single()
      savedDrawing = data
    } else {
      const { data } = await supabase
        .from('patentai_patent_drawings')
        .insert({ project_id: id, drawing_number: parsed.data.drawing_number, ...drawingPayload })
        .select()
        .single()
      savedDrawing = data
    }

    return successResponse({ drawing: savedDrawing, analysis })
  } catch (error) {
    return handleApiError(error)
  }
}
