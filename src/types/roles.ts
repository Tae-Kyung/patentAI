import type { UserRole } from './database'

export interface RoleConfig {
  role: UserRole
  label: string
  labelKey: string
  requiresApproval: boolean
  defaultRedirect: string
}

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  user: {
    role: 'user',
    label: '일반 사용자',
    labelKey: 'roles.user',
    requiresApproval: false,
    defaultRedirect: '/dashboard',
  },
  mentor: {
    role: 'mentor',
    label: '멘토',
    labelKey: 'roles.mentor',
    requiresApproval: true,
    defaultRedirect: '/dashboard',
  },
  institution: {
    role: 'institution',
    label: '기관 담당자',
    labelKey: 'roles.institution',
    requiresApproval: true,
    defaultRedirect: '/institution/dashboard',
  },
  admin: {
    role: 'admin',
    label: '관리자',
    labelKey: 'roles.admin',
    requiresApproval: false,
    defaultRedirect: '/admin/overview',
  },
}

export const SELECTABLE_ROLES: UserRole[] = ['user', 'mentor', 'institution']

export interface UserWithApproval {
  id: string
  email: string
  name: string | null
  role: UserRole
  is_approved: boolean
  approved_at: string | null
}
