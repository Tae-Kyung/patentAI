import { createClient } from '@/lib/supabase/server'
import type { User, UserRole } from '@/types/database'

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

// 인증 필수
export async function requireAuth(): Promise<User> {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new AuthError('인증이 필요합니다.', 401)
  }

  // bi_users 테이블에서 사용자 정보 조회
  const { data: dbUser, error: dbError } = await supabase
    .from('bi_users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (dbError || !dbUser) {
    throw new AuthError('사용자 정보를 찾을 수 없습니다.', 404)
  }

  return dbUser
}

// 리소스 소유자 확인
export async function requireOwner(resourceUserId: string): Promise<User> {
  const user = await requireAuth()

  if (user.id !== resourceUserId) {
    throw new AuthError('접근 권한이 없습니다.', 403)
  }

  return user
}

// 특정 역할 필수
export async function requireRole(allowedRoles: UserRole[]): Promise<User> {
  const user = await requireAuth()

  if (!allowedRoles.includes(user.role)) {
    throw new AuthError('접근 권한이 없습니다.', 403)
  }

  return user
}

// 관리자 필수
export async function requireAdmin(): Promise<User> {
  return requireRole(['admin'])
}

// 멘토 이상 필수
export async function requireMentor(): Promise<User> {
  return requireRole(['mentor', 'admin'])
}

// 프로젝트 소유자 확인
export async function requireProjectOwner(projectId: string): Promise<User> {
  const supabase = await createClient()
  const user = await requireAuth()

  const { data: project, error } = await supabase
    .from('bi_projects')
    .select('user_id')
    .eq('id', projectId)
    .single()

  if (error || !project) {
    throw new AuthError('프로젝트를 찾을 수 없습니다.', 404)
  }

  if (project.user_id !== user.id) {
    throw new AuthError('프로젝트에 대한 접근 권한이 없습니다.', 403)
  }

  return user
}

// 프로젝트 접근 권한 확인 (소유자 또는 매칭된 멘토/기관 담당자/관리자)
export async function requireProjectAccess(projectId: string): Promise<User> {
  const supabase = await createClient()
  const user = await requireAuth()

  const { data: project, error } = await supabase
    .from('bi_projects')
    .select('user_id')
    .eq('id', projectId)
    .single()

  if (error || !project) {
    throw new AuthError('프로젝트를 찾을 수 없습니다.', 404)
  }

  // 소유자, 관리자는 항상 접근 가능
  if (project.user_id === user.id || user.role === 'admin') {
    return user
  }

  // 멘토: 해당 프로젝트에 매칭된 경우만
  if (user.role === 'mentor') {
    const { data: match } = await supabase
      .from('bi_mentor_matches')
      .select('id')
      .eq('project_id', projectId)
      .eq('mentor_id', user.id)
      .limit(1)
      .single()

    if (match) return user
  }

  // 기관 담당자: 해당 프로젝트가 소속 기관에 매핑된 경우만
  if (user.role === 'institution') {
    const { data: access } = await supabase
      .from('bi_project_institution_maps')
      .select('id, institution_id!inner(id)')
      .eq('project_id', projectId)
      .limit(1)

    if (access && access.length > 0) {
      const instIds = access.map((a: Record<string, unknown>) => (a.institution_id as Record<string, string>).id)
      const { data: membership } = await supabase
        .from('bi_institution_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_approved', true)
        .in('institution_id', instIds)
        .limit(1)
        .single()

      if (membership) return user
    }
  }

  throw new AuthError('프로젝트에 대한 접근 권한이 없습니다.', 403)
}

// 승인된 사용자 필수 (is_approved = true)
export async function requireApproved(): Promise<User> {
  const user = await requireAuth()

  if (!user.is_approved) {
    throw new AuthError('계정이 아직 승인되지 않았습니다.', 403)
  }

  return user
}

// 기관 담당자 확인 (특정 기관 소속 + 승인됨)
export async function requireInstitutionMember(institutionId: string): Promise<User> {
  const supabase = await createClient()
  const user = await requireAuth()

  if (user.role === 'admin') return user

  const { data: membership, error } = await supabase
    .from('bi_institution_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('institution_id', institutionId)
    .eq('is_approved', true)
    .limit(1)
    .single()

  if (error || !membership) {
    throw new AuthError('해당 기관에 대한 접근 권한이 없습니다.', 403)
  }

  return user
}

// 멘토 매칭 확인 (해당 프로젝트에 매칭된 멘토인지)
export async function requireMentorMatch(projectId: string): Promise<User> {
  const supabase = await createClient()
  const user = await requireAuth()

  if (user.role === 'admin') return user

  const { data: match, error } = await supabase
    .from('bi_mentor_matches')
    .select('id')
    .eq('project_id', projectId)
    .eq('mentor_id', user.id)
    .limit(1)
    .single()

  if (error || !match) {
    throw new AuthError('해당 프로젝트에 대한 멘토 권한이 없습니다.', 403)
  }

  return user
}

// 메시지 접근 권한 확인
export async function requireMessageAccess(messageId: string): Promise<User> {
  const supabase = await createClient()
  const user = await requireAuth()

  if (user.role === 'admin') return user

  const { data: message, error } = await supabase
    .from('bi_messages')
    .select('sender_id, recipient_id')
    .eq('id', messageId)
    .single()

  if (error || !message) {
    throw new AuthError('메시지를 찾을 수 없습니다.', 404)
  }

  if (message.sender_id !== user.id && message.recipient_id !== user.id) {
    throw new AuthError('메시지에 대한 접근 권한이 없습니다.', 403)
  }

  return user
}
