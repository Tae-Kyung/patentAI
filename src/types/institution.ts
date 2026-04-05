import type {
  Institution,
  InstitutionMember,
  Program,
} from './database'

export interface InstitutionWithStats extends Institution {
  member_count?: number
  mentor_count?: number
  project_count?: number
}

export interface InstitutionMemberWithUser extends InstitutionMember {
  user?: {
    id: string
    name: string | null
    email: string
  }
}

export interface ProgramWithStats extends Program {
  institution_count?: number
  project_count?: number
  mentor_count?: number
}

export interface InstitutionDashboardData {
  institution: Institution
  programs: ProgramWithStats[]
  members: InstitutionMemberWithUser[]
  stats: {
    total_projects: number
    total_mentors: number
    active_sessions: number
    pending_reports: number
    pending_payouts: number
  }
}

export interface MappingRequest {
  project_id: string
  institution_id: string
  program_id?: string
}

export interface BulkMappingRequest {
  project_ids: string[]
  institution_id: string
  program_id?: string
}
