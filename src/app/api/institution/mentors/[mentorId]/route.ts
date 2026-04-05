import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ mentorId: string }>
}

// GET: 멘토 상세
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { searchParams } = new URL(request.url)
    await requireInstitutionAccess(searchParams.get('institution_id'))
    const { mentorId } = await context.params

    const supabase = createServiceClient()

    const { data: profile, error } = await supabase
      .from('bi_mentor_profiles')
      .select('*, user:user_id(id, email, name)')
      .eq('user_id', mentorId)
      .single()

    if (error || !profile) {
      return errorResponse('멘토를 찾을 수 없습니다.', 404)
    }

    // 매칭 정보
    const { data: matches } = await supabase
      .from('bi_mentor_matches')
      .select('*, project:project_id(id, name, current_stage)')
      .eq('mentor_id', mentorId)

    // 수당 정보
    const { data: payouts } = await supabase
      .from('bi_mentor_payouts')
      .select('*')
      .eq('mentor_id', mentorId)
      .order('created_at', { ascending: false })
      .limit(10)

    return successResponse({
      ...profile,
      matches: matches || [],
      recentPayouts: payouts || [],
    })
  } catch (error) {
    return handleApiError(error)
  }
}

const updatePoolSchema = z.object({
  status: z.enum(['active', 'inactive']),
})

// PATCH: 멘토 풀 상태 변경
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { searchParams } = new URL(request.url)
    const { institutionId } = await requireInstitutionAccess(searchParams.get('institution_id'))
    const { mentorId } = await context.params

    const body = await request.json()
    const { status } = updatePoolSchema.parse(body)

    const supabase = createServiceClient()

    const { error } = await supabase
      .from('bi_mentor_institution_pool')
      .update({ status })
      .eq('mentor_id', mentorId)
      .eq('institution_id', institutionId)

    if (error) {
      console.error('Mentor pool update error:', error.message)
      return errorResponse('상태 변경에 실패했습니다.', 500)
    }

    return successResponse({ message: '상태가 변경되었습니다.' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}

// DELETE: 멘토 풀에서 제거
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { searchParams } = new URL(request.url)
    const { institutionId } = await requireInstitutionAccess(searchParams.get('institution_id'))
    const { mentorId } = await context.params

    const supabase = createServiceClient()

    const { error } = await supabase
      .from('bi_mentor_institution_pool')
      .delete()
      .eq('mentor_id', mentorId)
      .eq('institution_id', institutionId)

    if (error) {
      console.error('Mentor pool delete error:', error.message)
      return errorResponse('멘토 제거에 실패했습니다.', 500)
    }

    return successResponse({ message: '멘토가 풀에서 제거되었습니다.' })
  } catch (error) {
    return handleApiError(error)
  }
}
