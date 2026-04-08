import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const patchSchema = z.object({
  caption: z.string().min(1).max(200).optional(),
  drawing_type: z.enum(['system_architecture', 'flowchart', 'ui_wireframe', 'data_flow', 'other']).optional(),
})

async function verifyDrawing(projectId: string, drawingId: string, userId: string) {
  const supabase = await createClient()
  const { data: drawing } = await supabase
    .from('patentai_patent_drawings')
    .select('id, project_id, image_url')
    .eq('id', drawingId)
    .eq('project_id', projectId)
    .single()
  if (!drawing) return null
  const { data: project } = await supabase
    .from('patentai_patent_projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()
  return project ? { supabase, drawing } : null
}

// PATCH: 캡션/유형 수정 또는 외부 이미지 교체
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; drawingId: string }> },
) {
  try {
    const { id, drawingId } = await params
    const user = await requireAuth()

    const result = await verifyDrawing(id, drawingId, user.id)
    if (!result) return errorResponse('도면을 찾을 수 없습니다.', 404)
    const { supabase } = result

    const contentType = request.headers.get('content-type') ?? ''

    // 이미지 파일 교체 (multipart)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('image') as File | null
      if (!file) return errorResponse('이미지 파일이 필요합니다.', 400)

      const buffer = Buffer.from(await file.arrayBuffer())
      const filename = `${id}/${Date.now()}_replaced_${drawingId}.png`

      const serviceSupabase = createServiceClient()
      const { error: uploadError } = await serviceSupabase.storage
        .from('patent-drawings')
        .upload(filename, buffer, { contentType: file.type, upsert: true })

      if (uploadError) return errorResponse('이미지 업로드 실패', 500)

      const { data: { publicUrl } } = serviceSupabase.storage
        .from('patent-drawings')
        .getPublicUrl(filename)

      const { data, error } = await supabase
        .from('patentai_patent_drawings')
        .update({ image_url: publicUrl })
        .eq('id', drawingId)
        .select()
        .single()

      if (error) return errorResponse('도면 업데이트 실패', 500)
      return successResponse(data)
    }

    // JSON 필드 수정
    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400)
    if (Object.keys(parsed.data).length === 0) return errorResponse('수정할 항목이 없습니다.', 400)

    const { data, error } = await supabase
      .from('patentai_patent_drawings')
      .update(parsed.data)
      .eq('id', drawingId)
      .select()
      .single()

    if (error) return errorResponse('도면 수정 실패', 500)
    return successResponse(data)
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE: 도면 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; drawingId: string }> },
) {
  try {
    const { id, drawingId } = await params
    const user = await requireAuth()

    const result = await verifyDrawing(id, drawingId, user.id)
    if (!result) return errorResponse('도면을 찾을 수 없습니다.', 404)
    const { supabase } = result

    const { error } = await supabase
      .from('patentai_patent_drawings')
      .delete()
      .eq('id', drawingId)

    if (error) return errorResponse('도면 삭제 실패', 500)
    return successResponse({ deleted: drawingId })
  } catch (error) {
    return handleApiError(error)
  }
}
