import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

// 인증 필수 — Supabase auth.users User 반환
export async function requireAuth(): Promise<User> {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new AuthError('인증이 필요합니다.', 401)
  }

  return user
}

// 특허 프로젝트 소유자 확인
export async function requirePatentProjectOwner(projectId: string): Promise<User> {
  const supabase = await createClient()
  const user = await requireAuth()

  const { data: project, error } = await supabase
    .from('patentai_patent_projects')
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

// 하위 호환: requireProjectOwner → requirePatentProjectOwner
export const requireProjectOwner = requirePatentProjectOwner

// 관리자 필수 (Supabase app_metadata.role = 'admin' 으로 설정)
export async function requireAdmin(): Promise<User> {
  const user = await requireAuth()

  if (user.app_metadata?.role !== 'admin') {
    throw new AuthError('관리자 권한이 필요합니다.', 403)
  }

  return user
}
