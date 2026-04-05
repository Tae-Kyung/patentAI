-- ============================================
-- CASA 확장판 마이그레이션 (모두의 창업 에디션)
-- 실행 순서: Supabase SQL Editor에서 실행
-- 롤백: migration-expansion-down.sql
-- ============================================

-- ============================================
-- STEP 1: 기존 ENUM/테이블 수정
-- ============================================

-- 1-1. user_role ENUM에 'institution' 추가
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'institution';

-- 1-2. bi_users에 승인 관련 컬럼 추가
ALTER TABLE bi_users
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 1-3. bi_projects에 기관 지원 관련 컬럼 추가
ALTER TABLE bi_projects
  ADD COLUMN IF NOT EXISTS support_type TEXT DEFAULT 'personal'
    CHECK (support_type IN ('personal', 'institutional')),
  ADD COLUMN IF NOT EXISTS program_id UUID;

-- 1-4. bi_feedbacks에 멘토링 세션 연결 컬럼 추가
ALTER TABLE bi_feedbacks
  ADD COLUMN IF NOT EXISTS session_id UUID,
  ADD COLUMN IF NOT EXISTS feedback_source TEXT DEFAULT 'general'
    CHECK (feedback_source IN ('general', 'mentoring', 'institution'));

-- ============================================
-- STEP 2: 신규 테이블 생성 (14개)
-- ============================================

-- 2-1. bi_programs (프로그램 관리)
CREATE TABLE IF NOT EXISTS bi_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  round INTEGER DEFAULT 1,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'preparing'
    CHECK (status IN ('preparing', 'active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2-2. bi_institutions (기관 정보)
CREATE TABLE IF NOT EXISTS bi_institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  type TEXT DEFAULT 'center'
    CHECK (type IN ('center', 'university', 'other')),
  address TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  is_approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES bi_users(id),
  max_mentors INTEGER DEFAULT 50,
  max_projects INTEGER DEFAULT 200,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2-3. bi_institution_members (기관 담당자)
CREATE TABLE IF NOT EXISTS bi_institution_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES bi_users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES bi_institutions(id) ON DELETE CASCADE,
  role_in_institution TEXT DEFAULT 'staff'
    CHECK (role_in_institution IN ('manager', 'staff')),
  is_approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES bi_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, institution_id)
);

-- 2-4. bi_mentor_profiles (멘토 프로필)
CREATE TABLE IF NOT EXISTS bi_mentor_profiles (
  user_id UUID PRIMARY KEY REFERENCES bi_users(id) ON DELETE CASCADE,
  resume_url TEXT,
  bank_account_url TEXT,
  bank_name TEXT,
  account_number_masked TEXT,
  account_number_encrypted TEXT,
  account_holder TEXT,
  specialty TEXT[],
  career_summary TEXT,
  is_approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES bi_users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2-5. bi_mentor_institution_pool (멘토-기관 다대다)
CREATE TABLE IF NOT EXISTS bi_mentor_institution_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES bi_users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES bi_institutions(id) ON DELETE CASCADE,
  registered_by UUID REFERENCES bi_users(id),
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(mentor_id, institution_id)
);

-- 2-6. bi_project_institution_maps (프로젝트-기관 매핑)
CREATE TABLE IF NOT EXISTS bi_project_institution_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bi_projects(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES bi_institutions(id) ON DELETE CASCADE,
  program_id UUID REFERENCES bi_programs(id),
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  mapped_by UUID REFERENCES bi_users(id),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES bi_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, institution_id, program_id)
);

-- 2-7. bi_mentor_matches (멘토-프로젝트 매칭)
CREATE TABLE IF NOT EXISTS bi_mentor_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bi_projects(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES bi_users(id),
  institution_id UUID NOT NULL REFERENCES bi_institutions(id),
  program_id UUID REFERENCES bi_programs(id),
  mentor_role TEXT DEFAULT 'primary'
    CHECK (mentor_role IN ('primary', 'secondary')),
  status TEXT DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'in_progress', 'review', 'completed', 'cancelled')),
  matched_by UUID REFERENCES bi_users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, mentor_id, program_id)
);

-- 2-8. bi_mentoring_sessions (멘토링 세션)
CREATE TABLE IF NOT EXISTS bi_mentoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES bi_mentor_matches(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL DEFAULT 1,
  session_type TEXT DEFAULT 'review'
    CHECK (session_type IN ('review', 'feedback', 'revision', 'final')),
  comments JSONB DEFAULT '[]',
  revision_summary TEXT,
  session_date TIMESTAMPTZ,
  duration_minutes INTEGER,
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'acknowledged')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- bi_feedbacks.session_id FK 추가 (테이블 생성 후)
ALTER TABLE bi_feedbacks
  ADD CONSTRAINT fk_feedbacks_session
  FOREIGN KEY (session_id) REFERENCES bi_mentoring_sessions(id);

-- 2-9. bi_mentoring_reports (최종 의견서)
CREATE TABLE IF NOT EXISTS bi_mentoring_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES bi_mentor_matches(id) ON DELETE CASCADE,
  mentor_opinion TEXT,
  strengths TEXT,
  improvements TEXT,
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  ai_summary TEXT,
  ai_generated_report TEXT,
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'confirmed', 'rejected')),
  submitted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES bi_users(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2-10. bi_mentor_payouts (수당 지급)
CREATE TABLE IF NOT EXISTS bi_mentor_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES bi_mentoring_reports(id),
  mentor_id UUID NOT NULL REFERENCES bi_users(id),
  institution_id UUID NOT NULL REFERENCES bi_institutions(id),
  program_id UUID REFERENCES bi_programs(id),
  amount DECIMAL(10, 0),
  total_sessions INTEGER,
  total_hours DECIMAL(5, 1),
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'processing', 'paid', 'cancelled')),
  approved_by UUID REFERENCES bi_users(id),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2-11. bi_notifications (알림)
CREATE TABLE IF NOT EXISTS bi_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES bi_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2-12. bi_messages (메시지)
CREATE TABLE IF NOT EXISTS bi_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES bi_users(id),
  recipient_id UUID NOT NULL REFERENCES bi_users(id),
  institution_id UUID REFERENCES bi_institutions(id),
  project_id UUID REFERENCES bi_projects(id),
  thread_id UUID REFERENCES bi_messages(id),
  subject TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2-13. bi_message_batches (일괄 발송 기록)
CREATE TABLE IF NOT EXISTS bi_message_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES bi_users(id),
  institution_id UUID NOT NULL REFERENCES bi_institutions(id),
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  recipient_type TEXT NOT NULL
    CHECK (recipient_type IN ('mentors', 'applicants', 'all', 'custom')),
  recipient_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2-14. bi_audit_logs (감사 로그)
CREATE TABLE IF NOT EXISTS bi_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES bi_users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- bi_projects.program_id FK 추가
ALTER TABLE bi_projects
  ADD CONSTRAINT fk_projects_program
  FOREIGN KEY (program_id) REFERENCES bi_programs(id);

-- ============================================
-- STEP 3: 인덱스 생성
-- ============================================

CREATE INDEX IF NOT EXISTS idx_programs_status ON bi_programs(status);
CREATE INDEX IF NOT EXISTS idx_programs_year ON bi_programs(year, round);

CREATE INDEX IF NOT EXISTS idx_institutions_region ON bi_institutions(region);
CREATE INDEX IF NOT EXISTS idx_institutions_approved ON bi_institutions(is_approved);

CREATE INDEX IF NOT EXISTS idx_institution_members_user ON bi_institution_members(user_id);
CREATE INDEX IF NOT EXISTS idx_institution_members_inst ON bi_institution_members(institution_id);

CREATE INDEX IF NOT EXISTS idx_mentor_profiles_active ON bi_mentor_profiles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_approved ON bi_mentor_profiles(is_approved);

CREATE INDEX IF NOT EXISTS idx_mentor_pool_mentor ON bi_mentor_institution_pool(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_pool_inst ON bi_mentor_institution_pool(institution_id);

CREATE INDEX IF NOT EXISTS idx_project_maps_project ON bi_project_institution_maps(project_id);
CREATE INDEX IF NOT EXISTS idx_project_maps_inst ON bi_project_institution_maps(institution_id);
CREATE INDEX IF NOT EXISTS idx_project_maps_program ON bi_project_institution_maps(program_id);

CREATE INDEX IF NOT EXISTS idx_mentor_matches_project ON bi_mentor_matches(project_id);
CREATE INDEX IF NOT EXISTS idx_mentor_matches_mentor ON bi_mentor_matches(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_matches_inst ON bi_mentor_matches(institution_id);
CREATE INDEX IF NOT EXISTS idx_mentor_matches_status ON bi_mentor_matches(status);

CREATE INDEX IF NOT EXISTS idx_mentoring_sessions_match ON bi_mentoring_sessions(match_id);
CREATE INDEX IF NOT EXISTS idx_mentoring_sessions_status ON bi_mentoring_sessions(status);

CREATE INDEX IF NOT EXISTS idx_mentoring_reports_match ON bi_mentoring_reports(match_id);
CREATE INDEX IF NOT EXISTS idx_mentoring_reports_status ON bi_mentoring_reports(status);

CREATE INDEX IF NOT EXISTS idx_payouts_mentor ON bi_mentor_payouts(mentor_id);
CREATE INDEX IF NOT EXISTS idx_payouts_inst ON bi_mentor_payouts(institution_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON bi_mentor_payouts(status);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON bi_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON bi_notifications(user_id) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_messages_recipient ON bi_messages(recipient_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON bi_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON bi_messages(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_project ON bi_messages(project_id) WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON bi_audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON bi_audit_logs(action, resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON bi_audit_logs(resource_type, resource_id);

-- ============================================
-- STEP 4: RLS 정책 활성화 및 생성
-- ============================================

-- 4-1. bi_programs RLS
ALTER TABLE bi_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Programs: 인증 사용자 읽기" ON bi_programs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Programs: admin만 생성" ON bi_programs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Programs: admin만 수정" ON bi_programs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Programs: admin만 삭제" ON bi_programs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );

-- 4-2. bi_institutions RLS
ALTER TABLE bi_institutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institutions: 인증 사용자 읽기" ON bi_institutions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Institutions: admin만 생성" ON bi_institutions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Institutions: admin만 수정" ON bi_institutions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );

-- 4-3. bi_institution_members RLS
ALTER TABLE bi_institution_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "InstitutionMembers: 본인+같은기관+admin 읽기" ON bi_institution_members
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM bi_institution_members im
      WHERE im.user_id = auth.uid() AND im.institution_id = bi_institution_members.institution_id AND im.is_approved = true
    )
    OR EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "InstitutionMembers: 본인 가입" ON bi_institution_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "InstitutionMembers: admin 승인" ON bi_institution_members
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );

-- 4-4. bi_mentor_profiles RLS
ALTER TABLE bi_mentor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MentorProfiles: 본인+기관담당자+admin 읽기" ON bi_mentor_profiles
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM bi_mentor_institution_pool mip
      JOIN bi_institution_members im ON im.institution_id = mip.institution_id AND im.is_approved = true
      WHERE mip.mentor_id = bi_mentor_profiles.user_id AND im.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "MentorProfiles: 본인만 생성" ON bi_mentor_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "MentorProfiles: 본인만 수정" ON bi_mentor_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- 4-5. bi_mentor_institution_pool RLS
ALTER TABLE bi_mentor_institution_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MentorPool: admin+기관담당자+해당멘토 읽기" ON bi_mentor_institution_pool
  FOR SELECT USING (
    auth.uid() = mentor_id
    OR EXISTS (
      SELECT 1 FROM bi_institution_members im
      WHERE im.institution_id = bi_mentor_institution_pool.institution_id AND im.user_id = auth.uid() AND im.is_approved = true
    )
    OR EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "MentorPool: admin+기관담당자 생성" ON bi_mentor_institution_pool
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bi_institution_members im
      WHERE im.institution_id = bi_mentor_institution_pool.institution_id AND im.user_id = auth.uid() AND im.is_approved = true
    )
    OR EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "MentorPool: admin+기관담당자 수정" ON bi_mentor_institution_pool
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM bi_institution_members im
      WHERE im.institution_id = bi_mentor_institution_pool.institution_id AND im.user_id = auth.uid() AND im.is_approved = true
    )
    OR EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "MentorPool: admin+기관담당자 삭제" ON bi_mentor_institution_pool
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM bi_institution_members im
      WHERE im.institution_id = bi_mentor_institution_pool.institution_id AND im.user_id = auth.uid() AND im.is_approved = true
    )
    OR EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );

-- 4-6. bi_project_institution_maps RLS
ALTER TABLE bi_project_institution_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ProjectMaps: 관련자 읽기" ON bi_project_institution_maps
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM bi_projects p WHERE p.id = project_id AND p.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM bi_institution_members im
      WHERE im.institution_id = bi_project_institution_maps.institution_id AND im.user_id = auth.uid() AND im.is_approved = true
    )
    OR EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "ProjectMaps: admin+지원자 생성" ON bi_project_institution_maps
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM bi_projects p WHERE p.id = project_id AND p.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "ProjectMaps: admin+기관담당자 수정" ON bi_project_institution_maps
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM bi_institution_members im
      WHERE im.institution_id = bi_project_institution_maps.institution_id AND im.user_id = auth.uid() AND im.is_approved = true
    )
    OR EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );

-- 4-7. bi_mentor_matches RLS
ALTER TABLE bi_mentor_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MentorMatches: 관련자 읽기" ON bi_mentor_matches
  FOR SELECT USING (
    auth.uid() = mentor_id
    OR EXISTS (SELECT 1 FROM bi_projects p WHERE p.id = project_id AND p.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM bi_institution_members im
      WHERE im.institution_id = bi_mentor_matches.institution_id AND im.user_id = auth.uid() AND im.is_approved = true
    )
    OR EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "MentorMatches: 기관담당자+admin 생성" ON bi_mentor_matches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bi_institution_members im
      WHERE im.institution_id = bi_mentor_matches.institution_id AND im.user_id = auth.uid() AND im.is_approved = true
    )
    OR EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "MentorMatches: 기관담당자+admin 수정" ON bi_mentor_matches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM bi_institution_members im
      WHERE im.institution_id = bi_mentor_matches.institution_id AND im.user_id = auth.uid() AND im.is_approved = true
    )
    OR EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );

-- 4-8. bi_mentoring_sessions RLS
ALTER TABLE bi_mentoring_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MentoringSessions: 관련자 읽기" ON bi_mentoring_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bi_mentor_matches mm
      WHERE mm.id = match_id AND (
        mm.mentor_id = auth.uid()
        OR EXISTS (SELECT 1 FROM bi_projects p WHERE p.id = mm.project_id AND p.user_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM bi_institution_members im
          WHERE im.institution_id = mm.institution_id AND im.user_id = auth.uid() AND im.is_approved = true
        )
      )
    )
    OR EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "MentoringSessions: 매칭된 멘토만 생성" ON bi_mentoring_sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bi_mentor_matches mm
      WHERE mm.id = match_id AND mm.mentor_id = auth.uid()
    )
  );

CREATE POLICY "MentoringSessions: 매칭된 멘토만 수정" ON bi_mentoring_sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM bi_mentor_matches mm
      WHERE mm.id = match_id AND mm.mentor_id = auth.uid()
    )
  );

-- 4-9. bi_mentoring_reports RLS
ALTER TABLE bi_mentoring_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MentoringReports: 관련자 읽기" ON bi_mentoring_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bi_mentor_matches mm
      WHERE mm.id = match_id AND (
        mm.mentor_id = auth.uid()
        OR EXISTS (SELECT 1 FROM bi_projects p WHERE p.id = mm.project_id AND p.user_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM bi_institution_members im
          WHERE im.institution_id = mm.institution_id AND im.user_id = auth.uid() AND im.is_approved = true
        )
      )
    )
    OR EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "MentoringReports: 멘토 생성" ON bi_mentoring_reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bi_mentor_matches mm
      WHERE mm.id = match_id AND mm.mentor_id = auth.uid()
    )
  );

CREATE POLICY "MentoringReports: 멘토+기관담당자 수정" ON bi_mentoring_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM bi_mentor_matches mm
      WHERE mm.id = match_id AND (
        mm.mentor_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM bi_institution_members im
          WHERE im.institution_id = mm.institution_id AND im.user_id = auth.uid() AND im.is_approved = true
        )
      )
    )
    OR EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );

-- 4-10. bi_mentor_payouts RLS
ALTER TABLE bi_mentor_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payouts: 본인멘토+기관담당자+admin 읽기" ON bi_mentor_payouts
  FOR SELECT USING (
    auth.uid() = mentor_id
    OR EXISTS (
      SELECT 1 FROM bi_institution_members im
      WHERE im.institution_id = bi_mentor_payouts.institution_id AND im.user_id = auth.uid() AND im.is_approved = true
    )
    OR EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Payouts: 기관담당자+admin 생성" ON bi_mentor_payouts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bi_institution_members im
      WHERE im.institution_id = bi_mentor_payouts.institution_id AND im.user_id = auth.uid() AND im.is_approved = true
    )
    OR EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Payouts: 기관담당자+admin 수정" ON bi_mentor_payouts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM bi_institution_members im
      WHERE im.institution_id = bi_mentor_payouts.institution_id AND im.user_id = auth.uid() AND im.is_approved = true
    )
    OR EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );

-- 4-11. bi_notifications RLS
ALTER TABLE bi_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notifications: 본인만 읽기" ON bi_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Notifications: 시스템 생성 (service role)" ON bi_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Notifications: 본인만 수정 (읽음처리)" ON bi_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 4-12. bi_messages RLS
ALTER TABLE bi_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Messages: 발신자/수신자 읽기" ON bi_messages
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );

CREATE POLICY "Messages: 인증사용자 발송" ON bi_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Messages: 수신자 읽음처리" ON bi_messages
  FOR UPDATE USING (auth.uid() = recipient_id);

-- 4-13. bi_message_batches RLS
ALTER TABLE bi_message_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MessageBatches: 발송자+admin 읽기" ON bi_message_batches
  FOR SELECT USING (
    auth.uid() = sender_id
    OR EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "MessageBatches: 기관담당자만 생성" ON bi_message_batches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bi_institution_members im
      WHERE im.institution_id = bi_message_batches.institution_id AND im.user_id = auth.uid() AND im.is_approved = true
    )
  );

-- 4-14. bi_audit_logs RLS (INSERT만, 수정/삭제 불가)
ALTER TABLE bi_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AuditLogs: admin만 읽기" ON bi_audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM bi_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "AuditLogs: 인증사용자 생성" ON bi_audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE/DELETE 정책 없음 = 수정/삭제 불가
