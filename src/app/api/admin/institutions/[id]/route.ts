import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const updateInstitutionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  region: z.string().min(1).optional(),
  type: z.enum(['center', 'university', 'other']).optional(),
  address: z.string().nullable().optional(),
  contact_email: z.string().email().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  max_mentors: z.number().int().min(1).optional(),
  max_projects: z.number().int().min(1).optional(),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET: 기관 상세 + 통계
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin()
    const { id } = await context.params

    const supabase = await createClient()

    const { data: institution, error } = await supabase
      .from('bi_institutions')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !institution) {
      return errorResponse('기관을 찾을 수 없습니다.', 404)
    }

    // 통계 병렬 조회
    const [{ count: mentorCount }, { count: projectCount }, { count: memberCount }] = await Promise.all([
      supabase.from('bi_mentor_institution_pool').select('*', { count: 'exact', head: true }).eq('institution_id', id),
      supabase.from('bi_project_institution_maps').select('*', { count: 'exact', head: true }).eq('institution_id', id),
      supabase.from('bi_institution_members').select('*', { count: 'exact', head: true }).eq('institution_id', id),
    ])

    return successResponse({
      ...institution,
      stats: {
        mentors: mentorCount || 0,
        projects: projectCount || 0,
        members: memberCount || 0,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH: 기관 수정
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin()
    const { id } = await context.params

    const body = await request.json()
    const validatedData = updateInstitutionSchema.parse(body)

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('bi_institutions')
      .update({ ...validatedData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Institution update error:', error.message)
      return errorResponse('기관 수정에 실패했습니다.', 500)
    }

    return successResponse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}

// DELETE: 기관 삭제
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin()
    const { id } = await context.params

    const supabase = createServiceClient()

    // 1. 기관 소속 매칭 ID 조회 (세션/보고서/수당의 부모)
    const { data: matches } = await supabase
      .from('bi_mentor_matches')
      .select('id')
      .eq('institution_id', id)

    const matchIds = (matches || []).map((m) => m.id)

    if (matchIds.length > 0) {
      // 2. 세션에 연결된 피드백 삭제 (feedbacks.session_id → sessions)
      const { data: sessions } = await supabase
        .from('bi_mentoring_sessions')
        .select('id')
        .in('match_id', matchIds)

      const sessionIds = (sessions || []).map((s) => s.id)
      if (sessionIds.length > 0) {
        await supabase.from('bi_feedbacks').update({ session_id: null }).in('session_id', sessionIds)
      }

      // 3. 수당 삭제 (payouts.report_id → reports)
      await supabase.from('bi_mentor_payouts').delete().eq('institution_id', id)

      // 4. 보고서 삭제 (reports.match_id → matches, CASCADE)
      // 5. 세션 삭제 (sessions.match_id → matches, CASCADE)
      // → matches 삭제 시 CASCADE로 자동 삭제됨
    }

    // 6. 매칭 삭제 (institution_id, NO CASCADE)
    await supabase.from('bi_mentor_matches').delete().eq('institution_id', id)

    // 7. 메시지 관련 (nullable FK → NULL 처리)
    await supabase.from('bi_messages').update({ institution_id: null }).eq('institution_id', id)
    await supabase.from('bi_message_batches').delete().eq('institution_id', id)

    // 8. CASCADE로 자동 삭제되지만 명시적으로 정리
    await supabase.from('bi_mentor_institution_pool').delete().eq('institution_id', id)
    await supabase.from('bi_project_institution_maps').delete().eq('institution_id', id)
    await supabase.from('bi_institution_members').delete().eq('institution_id', id)

    // 9. 기관 삭제
    const { error } = await supabase
      .from('bi_institutions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Institution delete error:', error.message)
      return errorResponse('기관 삭제에 실패했습니다.', 500)
    }

    return successResponse({ message: '기관이 삭제되었습니다.' })
  } catch (error) {
    return handleApiError(error)
  }
}
