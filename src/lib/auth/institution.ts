import { createClient } from '@/lib/supabase/server'
import { requireAuth, AuthError } from '@/lib/auth/guards'
import type { User } from '@/types/database'

/**
 * 현재 사용자의 소속 기관 ID를 반환합니다.
 * admin은 모든 기관에 접근 가능하므로, 쿼리 파라미터로 기관 ID를 받을 수 있습니다.
 */
export async function requireInstitutionAccess(institutionIdOverride?: string | null): Promise<{
  user: User
  institutionId: string
}> {
  const user = await requireAuth()

  // admin은 기관 ID를 직접 지정 가능
  if (user.role === 'admin') {
    if (institutionIdOverride) {
      return { user, institutionId: institutionIdOverride }
    }
    throw new AuthError('기관 ID를 지정해주세요.', 400)
  }

  // institution 역할: 소속 기관 조회
  if (user.role !== 'institution') {
    throw new AuthError('기관 담당자 권한이 필요합니다.', 403)
  }

  const supabase = await createClient()
  const { data: membership, error } = await supabase
    .from('bi_institution_members')
    .select('institution_id')
    .eq('user_id', user.id)
    .eq('is_approved', true)
    .limit(1)
    .single()

  if (error || !membership) {
    throw new AuthError('승인된 기관 소속이 아닙니다.', 403)
  }

  return { user, institutionId: membership.institution_id }
}
