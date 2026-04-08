import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

// GET: 도면 목록
export async function GET(
  _request: NextRequest,
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

    const { data, error } = await supabase
      .from('patentai_patent_drawings')
      .select('*')
      .eq('project_id', id)
      .order('drawing_number', { ascending: true })

    if (error) return errorResponse('도면 조회 실패', 500)
    return successResponse(data ?? [])
  } catch (error) {
    return handleApiError(error)
  }
}
