import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET: 프로젝트 문서 목록 조회
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)

    const supabase = await createClient()

    const { data: documents, error } = await supabase
      .from('bi_documents')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return successResponse(documents || [])
  } catch (error) {
    return handleApiError(error)
  }
}
