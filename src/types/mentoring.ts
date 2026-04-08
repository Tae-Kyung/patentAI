import type {
  MentorMatch,
  MentoringSession,
  MentoringReport,
  MentorPayout,
  MentorProfile,
  Json,
} from './database'

export interface MentorMatchWithDetails extends MentorMatch {
  project?: {
    id: string
    name: string
    user_id: string
  }
  mentor?: {
    id: string
    name: string | null
    email: string
  }
  institution?: {
    id: string
    name: string
  }
}

export interface SessionComment {
  id: string
  author_id: string
  author_name: string
  content: string
  created_at: string
}

export interface MentoringSessionWithComments extends Omit<MentoringSession, 'comments'> {
  comments: SessionComment[]
}

export interface MentoringReportWithMatch extends MentoringReport {
  match?: MentorMatchWithDetails
}

export interface PayoutSummary {
  total_amount: number
  total_sessions: number
  total_hours: number
  pending_count: number
  paid_count: number
}

export interface MentorProfileWithUser extends MentorProfile {
  user?: {
    id: string
    name: string | null
    email: string
  }
}

export interface MentorDashboardData {
  profile: MentorProfile | null
  active_matches: MentorMatchWithDetails[]
  pending_sessions: number
  total_payouts: PayoutSummary
}
