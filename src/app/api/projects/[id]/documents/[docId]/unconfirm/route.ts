import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ id: string; docId: string }>
}

// POST: 문서 확정 해제
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id, docId } = await context.params
    await requireProjectOwner(id)

    const supabase = await createClient()

    // 문서 조회
    const { data: document, error: docError } = await supabase
      .from('bi_documents')
      .select('*')
      .eq('id', docId)
      .eq('project_id', id)
      .single()

    if (docError || !document) {
      return errorResponse('문서를 찾을 수 없습니다.', 404)
    }

    if (!document.is_confirmed) {
      return errorResponse('확정되지 않은 문서입니다.', 400)
    }

    // 문서 확정 해제
    const { error: updateError } = await supabase
      .from('bi_documents')
      .update({
        is_confirmed: false,
        confirmed_at: null,
        confirmed_by: null,
      })
      .eq('id', docId)

    if (updateError) throw updateError

    // Gate 3가 통과된 상태였으면 되돌리기
    const { data: project } = await supabase
      .from('bi_projects')
      .select('gate_3_passed_at')
      .eq('id', id)
      .single()

    if (project?.gate_3_passed_at) {
      await supabase
        .from('bi_projects')
        .update({
          current_stage: 'document',
          current_gate: 'gate_3',
          gate_3_passed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
    }

    return successResponse({
      message: '문서 확정이 해제되었습니다.',
      documentId: docId,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
