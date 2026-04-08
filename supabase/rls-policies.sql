-- CASA MVP RLS 정책
-- 실행 순서: schema.sql 실행 후 이 파일 실행

-- ============================================
-- RLS 활성화
-- ============================================

ALTER TABLE bi_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_idea_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_prompt_variables ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 헬퍼 함수
-- ============================================

-- 현재 사용자 역할 조회
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM bi_users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 현재 사용자가 관리자인지 확인
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM bi_users
    WHERE id = auth.uid() AND role = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 현재 사용자가 멘토 이상인지 확인
CREATE OR REPLACE FUNCTION is_mentor_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM bi_users
    WHERE id = auth.uid() AND role IN ('mentor', 'admin')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 프로젝트 소유자 확인
CREATE OR REPLACE FUNCTION is_project_owner(project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM bi_projects
    WHERE id = project_id AND user_id = auth.uid()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 프로젝트 멘토 확인
CREATE OR REPLACE FUNCTION is_project_mentor(project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM bi_projects
    WHERE id = project_id AND assigned_mentor_id = auth.uid()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- bi_users 정책
-- ============================================

-- 자신의 데이터 조회
CREATE POLICY "Users can view own profile"
  ON bi_users FOR SELECT
  USING (auth.uid() = id);

-- 자신의 데이터 수정
CREATE POLICY "Users can update own profile"
  ON bi_users FOR UPDATE
  USING (auth.uid() = id);

-- 관리자는 모든 사용자 조회 가능
CREATE POLICY "Admins can view all users"
  ON bi_users FOR SELECT
  USING (is_admin());

-- 관리자는 모든 사용자 수정 가능
CREATE POLICY "Admins can update all users"
  ON bi_users FOR UPDATE
  USING (is_admin());

-- ============================================
-- bi_projects 정책
-- ============================================

-- 소유자 조회
CREATE POLICY "Users can view own projects"
  ON bi_projects FOR SELECT
  USING (user_id = auth.uid());

-- 할당된 멘토 조회
CREATE POLICY "Mentors can view assigned projects"
  ON bi_projects FOR SELECT
  USING (assigned_mentor_id = auth.uid());

-- 관리자 전체 조회
CREATE POLICY "Admins can view all projects"
  ON bi_projects FOR SELECT
  USING (is_admin());

-- 사용자 프로젝트 생성
CREATE POLICY "Users can create projects"
  ON bi_projects FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 소유자 수정
CREATE POLICY "Users can update own projects"
  ON bi_projects FOR UPDATE
  USING (user_id = auth.uid());

-- 소유자 삭제
CREATE POLICY "Users can delete own projects"
  ON bi_projects FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- bi_idea_cards 정책
-- ============================================

-- 프로젝트 소유자 조회
CREATE POLICY "Project owners can view idea cards"
  ON bi_idea_cards FOR SELECT
  USING (is_project_owner(project_id));

-- 프로젝트 멘토 조회
CREATE POLICY "Project mentors can view idea cards"
  ON bi_idea_cards FOR SELECT
  USING (is_project_mentor(project_id));

-- 관리자 전체 조회
CREATE POLICY "Admins can view all idea cards"
  ON bi_idea_cards FOR SELECT
  USING (is_admin());

-- 소유자 생성
CREATE POLICY "Project owners can create idea cards"
  ON bi_idea_cards FOR INSERT
  WITH CHECK (is_project_owner(project_id));

-- 소유자 수정
CREATE POLICY "Project owners can update idea cards"
  ON bi_idea_cards FOR UPDATE
  USING (is_project_owner(project_id));

-- ============================================
-- bi_evaluations 정책
-- ============================================

-- 프로젝트 소유자 조회
CREATE POLICY "Project owners can view evaluations"
  ON bi_evaluations FOR SELECT
  USING (is_project_owner(project_id));

-- 프로젝트 멘토 조회
CREATE POLICY "Project mentors can view evaluations"
  ON bi_evaluations FOR SELECT
  USING (is_project_mentor(project_id));

-- 관리자 전체 조회
CREATE POLICY "Admins can view all evaluations"
  ON bi_evaluations FOR SELECT
  USING (is_admin());

-- 소유자 생성
CREATE POLICY "Project owners can create evaluations"
  ON bi_evaluations FOR INSERT
  WITH CHECK (is_project_owner(project_id));

-- 소유자 수정
CREATE POLICY "Project owners can update evaluations"
  ON bi_evaluations FOR UPDATE
  USING (is_project_owner(project_id));

-- ============================================
-- bi_documents 정책
-- ============================================

-- 프로젝트 소유자 조회
CREATE POLICY "Project owners can view documents"
  ON bi_documents FOR SELECT
  USING (is_project_owner(project_id));

-- 프로젝트 멘토 조회
CREATE POLICY "Project mentors can view documents"
  ON bi_documents FOR SELECT
  USING (is_project_mentor(project_id));

-- 관리자 전체 조회
CREATE POLICY "Admins can view all documents"
  ON bi_documents FOR SELECT
  USING (is_admin());

-- 소유자 생성
CREATE POLICY "Project owners can create documents"
  ON bi_documents FOR INSERT
  WITH CHECK (is_project_owner(project_id));

-- 소유자 수정
CREATE POLICY "Project owners can update documents"
  ON bi_documents FOR UPDATE
  USING (is_project_owner(project_id));

-- ============================================
-- bi_feedbacks 정책
-- ============================================

-- 프로젝트 소유자 조회
CREATE POLICY "Project owners can view feedbacks"
  ON bi_feedbacks FOR SELECT
  USING (is_project_owner(project_id));

-- 피드백 작성자 조회
CREATE POLICY "Feedback authors can view own feedbacks"
  ON bi_feedbacks FOR SELECT
  USING (user_id = auth.uid());

-- 관리자 전체 조회
CREATE POLICY "Admins can view all feedbacks"
  ON bi_feedbacks FOR SELECT
  USING (is_admin());

-- 멘토/관리자 피드백 생성
CREATE POLICY "Mentors can create feedbacks"
  ON bi_feedbacks FOR INSERT
  WITH CHECK (is_mentor_or_admin());

-- 작성자 수정
CREATE POLICY "Feedback authors can update own feedbacks"
  ON bi_feedbacks FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================
-- bi_approvals 정책
-- ============================================

-- 프로젝트 소유자 조회
CREATE POLICY "Project owners can view approvals"
  ON bi_approvals FOR SELECT
  USING (is_project_owner(project_id));

-- 승인 요청자 조회
CREATE POLICY "Requesters can view own approvals"
  ON bi_approvals FOR SELECT
  USING (requested_by = auth.uid());

-- 관리자 전체 조회
CREATE POLICY "Admins can view all approvals"
  ON bi_approvals FOR SELECT
  USING (is_admin());

-- 프로젝트 소유자 승인 요청 생성
CREATE POLICY "Project owners can create approvals"
  ON bi_approvals FOR INSERT
  WITH CHECK (is_project_owner(project_id));

-- 멘토/관리자 승인 처리
CREATE POLICY "Mentors can update approvals"
  ON bi_approvals FOR UPDATE
  USING (is_mentor_or_admin());

-- ============================================
-- bi_prompts 정책
-- ============================================

-- 인증된 사용자 조회 (활성 프롬프트만)
CREATE POLICY "Authenticated users can view active prompts"
  ON bi_prompts FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- 관리자 전체 조회
CREATE POLICY "Admins can view all prompts"
  ON bi_prompts FOR SELECT
  USING (is_admin());

-- 관리자 생성
CREATE POLICY "Admins can create prompts"
  ON bi_prompts FOR INSERT
  WITH CHECK (is_admin());

-- 관리자 수정
CREATE POLICY "Admins can update prompts"
  ON bi_prompts FOR UPDATE
  USING (is_admin());

-- 관리자 삭제
CREATE POLICY "Admins can delete prompts"
  ON bi_prompts FOR DELETE
  USING (is_admin());

-- ============================================
-- bi_prompt_versions 정책
-- ============================================

-- 관리자만 접근
CREATE POLICY "Admins can view prompt versions"
  ON bi_prompt_versions FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can create prompt versions"
  ON bi_prompt_versions FOR INSERT
  WITH CHECK (is_admin());

-- ============================================
-- bi_prompt_variables 정책
-- ============================================

-- 인증된 사용자 조회
CREATE POLICY "Authenticated users can view prompt variables"
  ON bi_prompt_variables FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 관리자 관리
CREATE POLICY "Admins can manage prompt variables"
  ON bi_prompt_variables FOR ALL
  USING (is_admin());
