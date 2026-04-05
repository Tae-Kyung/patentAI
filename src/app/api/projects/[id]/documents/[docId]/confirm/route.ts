import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ id: string; docId: string }>
}

// POST: 문서 확정
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id, docId } = await context.params
    const user = await requireProjectOwner(id)

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

    if (document.is_confirmed) {
      return errorResponse('이미 확정된 문서입니다.', 400)
    }

    if (!document.content) {
      return errorResponse('문서 내용이 없습니다. 먼저 문서를 생성해주세요.', 400)
    }

    // 문서 확정
    const { data: updatedDoc, error: updateError } = await supabase
      .from('bi_documents')
      .update({
        is_confirmed: true,
        confirmed_at: new Date().toISOString(),
        confirmed_by: user.id,
      })
      .eq('id', docId)
      .select()
      .single()

    if (updateError) throw updateError

    // 모든 문서 확정 여부 확인 (Gate 3 통과 조건)
    const { data: allDocs } = await supabase
      .from('bi_documents')
      .select('type, is_confirmed')
      .eq('project_id', id)

    const requiredTypes = ['business_plan', 'pitch', 'landing'] as const
    const confirmedTypes = allDocs
      ?.filter(d => d.is_confirmed)
      .map(d => d.type) || []

    const allConfirmed = requiredTypes.every(type => confirmedTypes.includes(type as typeof confirmedTypes[number]))

    if (allConfirmed) {
      // Gate 3 통과
      await supabase
        .from('bi_projects')
        .update({
          current_stage: 'deploy',
          current_gate: 'gate_4',
          gate_3_passed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      return successResponse({
        message: 'Gate 3를 통과했습니다! 이제 배포 단계로 진행할 수 있습니다.',
        document: updatedDoc,
        gate3Passed: true,
      })
    }

    return successResponse({
      message: '문서가 확정되었습니다.',
      document: updatedDoc,
      gate3Passed: false,
      remainingTypes: requiredTypes.filter(type => !confirmedTypes.includes(type)),
    })
  } catch (error) {
    return handleApiError(error)
  }
}
