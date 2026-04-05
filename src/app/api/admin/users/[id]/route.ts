import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { isValidUUID } from '@/lib/security/validation'
import { z } from 'zod'

const updateRoleSchema = z.object({
  role: z.enum(['user', 'mentor', 'institution', 'admin']),
})

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['user', 'mentor', 'institution', 'admin']).optional(),
}).refine(data => data.name || data.email || data.password || data.role, {
  message: '최소 하나의 필드를 입력해주세요.',
})

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH: 사용자 정보 수정 (이름, 이메일, 비밀번호, 역할)
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdmin()
    const { id } = await context.params
    if (!isValidUUID(id)) return errorResponse('잘못된 ID 형식입니다.', 400)

    const body = await request.json()

    // 역할만 변경하는 기존 요청 호환
    const isRoleOnly = Object.keys(body).length === 1 && body.role
    if (isRoleOnly) {
      const parsed = updateRoleSchema.safeParse(body)
      if (!parsed.success) {
        return errorResponse('유효하지 않은 역할입니다.', 400)
      }
      if (admin.id === id) {
        return errorResponse('자기 자신의 역할은 변경할 수 없습니다.', 400)
      }
      const supabase = createServiceClient()
      const { data, error } = await supabase
        .from('bi_users')
        .update({ role: parsed.data.role })
        .eq('id', id)
        .select('id, role')
        .single()
      if (error) return errorResponse('역할 변경에 실패했습니다.', 500)

      // 멘토로 변경 시 bi_mentor_profiles row 자동 생성
      if (parsed.data.role === 'mentor') {
        await supabase
          .from('bi_mentor_profiles')
          .upsert({ user_id: id }, { onConflict: 'user_id' })
      }

      return successResponse(data)
    }

    // 사용자 정보 수정
    const parsed = updateUserSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400, 'VALIDATION_ERROR')
    }

    if (parsed.data.role && admin.id === id) {
      return errorResponse('자기 자신의 역할은 변경할 수 없습니다.', 400)
    }

    const supabase = createServiceClient()

    // bi_users 업데이트 (이름, 역할)
    const biUpdate: Record<string, string> = {}
    if (parsed.data.name) biUpdate.name = parsed.data.name
    if (parsed.data.role) biUpdate.role = parsed.data.role

    if (Object.keys(biUpdate).length > 0) {
      const { error } = await supabase
        .from('bi_users')
        .update(biUpdate)
        .eq('id', id)
      if (error) {
        console.error('User update error:', error.message)
        return errorResponse('사용자 정보 수정에 실패했습니다.', 500)
      }
    }

    // Supabase Auth 업데이트 (이메일, 비밀번호, 이름 메타데이터)
    const authUpdate: { email?: string; password?: string; user_metadata?: Record<string, string> } = {}
    if (parsed.data.email) authUpdate.email = parsed.data.email
    if (parsed.data.password) authUpdate.password = parsed.data.password
    if (parsed.data.name) authUpdate.user_metadata = { name: parsed.data.name }

    if (parsed.data.email || parsed.data.password || parsed.data.name) {
      const { error: authError } = await supabase.auth.admin.updateUserById(id, authUpdate)
      if (authError) {
        console.error('Auth update error:', authError.message)
        return errorResponse('인증 정보 수정에 실패했습니다: ' + authError.message, 500)
      }
    }

    // 이메일 변경 시 bi_users도 동기화
    if (parsed.data.email) {
      await supabase.from('bi_users').update({ email: parsed.data.email }).eq('id', id)
    }

    // 멘토로 변경 시 bi_mentor_profiles row 자동 생성
    if (parsed.data.role === 'mentor') {
      await supabase
        .from('bi_mentor_profiles')
        .upsert({ user_id: id }, { onConflict: 'user_id' })
    }

    // 업데이트된 사용자 반환
    const { data: updated } = await supabase
      .from('bi_users')
      .select('id, name, email, role')
      .eq('id', id)
      .single()

    return successResponse(updated)
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE: 사용자 삭제 (참조무결성 처리)
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdmin()
    const { id } = await context.params
    if (!isValidUUID(id)) return errorResponse('잘못된 ID 형식입니다.', 400)

    // 자기 자신은 삭제 불가
    if (admin.id === id) {
      return errorResponse('자기 자신은 삭제할 수 없습니다.', 400)
    }

    const supabase = createServiceClient()

    // 사용자 존재 확인
    const { data: user, error: userError } = await supabase
      .from('bi_users')
      .select('id, role, email')
      .eq('id', id)
      .single()

    if (userError || !user) {
      return errorResponse('사용자를 찾을 수 없습니다.', 404)
    }

    // === NO CASCADE FK 처리 ===

    // 1. 멘토 매칭 관련 (mentor_id → bi_mentor_matches)
    const { data: matches } = await supabase
      .from('bi_mentor_matches')
      .select('id')
      .eq('mentor_id', id)

    const matchIds = (matches || []).map((m) => m.id)

    if (matchIds.length > 0) {
      // 세션에 연결된 피드백 해제
      const { data: sessions } = await supabase
        .from('bi_mentoring_sessions')
        .select('id')
        .in('match_id', matchIds)

      const sessionIds = (sessions || []).map((s) => s.id)
      if (sessionIds.length > 0) {
        await supabase.from('bi_feedbacks').update({ session_id: null }).in('session_id', sessionIds)
      }

      // 수당 삭제
      await supabase.from('bi_mentor_payouts').delete().eq('mentor_id', id)

      // 매칭 삭제 (CASCADE로 sessions, reports 자동 삭제)
      await supabase.from('bi_mentor_matches').delete().eq('mentor_id', id)
    }

    // 2. 메시지 관련 (sender_id, recipient_id)
    await supabase.from('bi_messages').delete().eq('sender_id', id)
    await supabase.from('bi_messages').delete().eq('recipient_id', id)
    await supabase.from('bi_message_batches').delete().eq('sender_id', id)

    // 3. Nullable FK → SET NULL 처리
    // approved_by, matched_by, mapped_by, confirmed_by, registered_by, created_by 등
    await supabase.from('bi_approvals').update({ approved_by: null }).eq('approved_by', id)
    await supabase.from('bi_approvals').delete().eq('requested_by', id)
    await supabase.from('bi_projects').update({ assigned_mentor_id: null }).eq('assigned_mentor_id', id)
    await supabase.from('bi_institutions').update({ approved_by: null }).eq('approved_by', id)
    await supabase.from('bi_mentor_institution_pool').update({ registered_by: null }).eq('registered_by', id)
    await supabase.from('bi_project_institution_maps').update({ mapped_by: null }).eq('mapped_by', id)
    await supabase.from('bi_project_institution_maps').update({ approved_by: null }).eq('approved_by', id)
    await supabase.from('bi_mentor_matches').update({ matched_by: null }).eq('matched_by', id)
    // bi_mentoring_sessions.confirmed_by 는 타입에 없을 수 있으므로 raw query 대신 스킵
    // (세션은 매칭 삭제 시 CASCADE로 삭제됨)
    await supabase.from('bi_mentor_payouts').update({ approved_by: null }).eq('approved_by', id)
    await supabase.from('bi_audit_logs').update({ user_id: null }).eq('user_id', id)
    await supabase.from('bi_prompts').update({ created_by: null }).eq('created_by', id)
    await supabase.from('bi_prompts').update({ updated_by: null }).eq('updated_by', id)
    await supabase.from('bi_prompt_versions').update({ changed_by: null }).eq('changed_by', id)
    await supabase.from('bi_idea_cards').update({ confirmed_by: null }).eq('confirmed_by', id)
    await supabase.from('bi_evaluations').update({ confirmed_by: null }).eq('confirmed_by', id)
    await supabase.from('bi_documents').update({ confirmed_by: null }).eq('confirmed_by', id)

    // 4. bi_feedbacks.user_id (NO CASCADE)
    await supabase.from('bi_feedbacks').delete().eq('user_id', id)

    // === CASCADE FK는 bi_users 삭제 시 자동 처리 ===
    // bi_projects, bi_credit_transactions, bi_institution_members,
    // bi_mentor_profiles, bi_mentor_institution_pool, bi_notifications

    // 5. bi_users 삭제
    const { error: deleteError } = await supabase
      .from('bi_users')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('User delete error:', deleteError.message)
      return errorResponse('사용자 삭제에 실패했습니다.', 500)
    }

    // 6. Supabase Auth 사용자 삭제
    const { error: authError } = await supabase.auth.admin.deleteUser(id)
    if (authError) {
      console.error('Auth user delete error:', authError.message)
      // DB에서는 삭제됐으므로 경고만 로깅
    }

    return successResponse({ message: '사용자가 삭제되었습니다.' })
  } catch (error) {
    return handleApiError(error)
  }
}
