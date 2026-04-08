-- CASA MVP 데이터베이스 스키마
-- 실행 순서: 1. schema.sql → 2. rls-policies.sql → 3. triggers.sql → 4. seed-prompts.sql

-- ============================================
-- ENUM 타입 생성
-- ============================================

CREATE TYPE user_role AS ENUM ('user', 'mentor', 'admin');
CREATE TYPE locale AS ENUM ('ko', 'en', 'ja', 'zh');
CREATE TYPE theme AS ENUM ('light', 'dark', 'system');
CREATE TYPE project_status AS ENUM ('draft', 'in_progress', 'completed', 'archived');
CREATE TYPE project_type AS ENUM ('pre_startup', 'startup');
CREATE TYPE project_stage AS ENUM ('idea', 'evaluation', 'document', 'deploy', 'done');
CREATE TYPE gate_status AS ENUM ('gate_1', 'gate_2', 'gate_3', 'gate_4', 'completed');
CREATE TYPE document_type AS ENUM ('business_plan', 'pitch', 'landing', 'ppt', 'leaflet', 'infographic', 'startup_application');
CREATE TYPE feedback_type AS ENUM ('comment', 'approval', 'rejection', 'revision_request');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'revision_requested');
CREATE TYPE prompt_category AS ENUM ('ideation', 'evaluation', 'document', 'marketing');

-- ============================================
-- 1. bi_users 테이블
-- ============================================

CREATE TABLE bi_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role user_role NOT NULL DEFAULT 'user',
  locale locale NOT NULL DEFAULT 'ko',
  theme theme NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bi_users_email ON bi_users(email);
CREATE INDEX idx_bi_users_role ON bi_users(role);

-- ============================================
-- 2. bi_projects 테이블
-- ============================================

CREATE TABLE bi_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES bi_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  project_type project_type NOT NULL DEFAULT 'pre_startup',
  status project_status NOT NULL DEFAULT 'draft',
  current_stage project_stage NOT NULL DEFAULT 'idea',
  current_gate gate_status NOT NULL DEFAULT 'gate_1',
  gate_1_passed_at TIMESTAMPTZ,
  gate_2_passed_at TIMESTAMPTZ,
  gate_3_passed_at TIMESTAMPTZ,
  gate_4_passed_at TIMESTAMPTZ,
  mentor_approval_required BOOLEAN NOT NULL DEFAULT false,
  assigned_mentor_id UUID REFERENCES bi_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bi_projects_user_id ON bi_projects(user_id);
CREATE INDEX idx_bi_projects_status ON bi_projects(status);
CREATE INDEX idx_bi_projects_current_stage ON bi_projects(current_stage);
CREATE INDEX idx_bi_projects_assigned_mentor_id ON bi_projects(assigned_mentor_id);

-- ============================================
-- 3. bi_idea_cards 테이블
-- ============================================

CREATE TABLE bi_idea_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bi_projects(id) ON DELETE CASCADE,
  raw_input TEXT NOT NULL,
  problem TEXT,
  solution TEXT,
  target TEXT,
  differentiation TEXT,
  uvp TEXT,
  channels TEXT,
  revenue_streams TEXT,
  cost_structure TEXT,
  key_metrics TEXT,
  similar_companies JSONB,
  ai_expanded JSONB,
  ai_model_used TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES bi_users(id),
  revision_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bi_idea_cards_project_id ON bi_idea_cards(project_id);

-- ============================================
-- 4. bi_evaluations 테이블
-- ============================================

CREATE TABLE bi_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bi_projects(id) ON DELETE CASCADE,
  investor_score INTEGER CHECK (investor_score >= 0 AND investor_score <= 100),
  investor_feedback TEXT,
  investor_ai_model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  market_score INTEGER CHECK (market_score >= 0 AND market_score <= 100),
  market_feedback TEXT,
  market_ai_model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  tech_score INTEGER CHECK (tech_score >= 0 AND tech_score <= 100),
  tech_feedback TEXT,
  tech_ai_model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  total_score INTEGER CHECK (total_score >= 0 AND total_score <= 100),
  recommendations JSONB,
  debate_enabled BOOLEAN NOT NULL DEFAULT false,
  debate_rounds INTEGER NOT NULL DEFAULT 0,
  debate_log JSONB,
  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES bi_users(id),
  dispute_comment TEXT,
  reevaluation_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bi_evaluations_project_id ON bi_evaluations(project_id);

-- ============================================
-- 5. bi_documents 테이블
-- ============================================

CREATE TABLE bi_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bi_projects(id) ON DELETE CASCADE,
  type document_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  storage_path TEXT,
  file_name TEXT,
  ai_model_used TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES bi_users(id),
  revision_requests JSONB,
  revision_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bi_documents_project_id ON bi_documents(project_id);
CREATE INDEX idx_bi_documents_type ON bi_documents(type);

-- ============================================
-- 6. bi_feedbacks 테이블
-- ============================================

CREATE TABLE bi_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bi_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES bi_users(id),
  stage project_stage NOT NULL,
  gate gate_status,
  feedback_type feedback_type NOT NULL DEFAULT 'comment',
  comment TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bi_feedbacks_project_id ON bi_feedbacks(project_id);
CREATE INDEX idx_bi_feedbacks_user_id ON bi_feedbacks(user_id);

-- ============================================
-- 7. bi_approvals 테이블
-- ============================================

CREATE TABLE bi_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bi_projects(id) ON DELETE CASCADE,
  gate gate_status NOT NULL,
  requested_by UUID NOT NULL REFERENCES bi_users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_comment TEXT,
  approved_by UUID REFERENCES bi_users(id),
  approved_at TIMESTAMPTZ,
  approval_comment TEXT,
  status approval_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bi_approvals_project_id ON bi_approvals(project_id);
CREATE INDEX idx_bi_approvals_status ON bi_approvals(status);

-- ============================================
-- 8. bi_prompts 테이블
-- ============================================

CREATE TABLE bi_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category prompt_category NOT NULL,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  temperature NUMERIC(3, 2) NOT NULL DEFAULT 0.7,
  max_tokens INTEGER NOT NULL DEFAULT 2000,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES bi_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES bi_users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bi_prompts_key ON bi_prompts(key);
CREATE INDEX idx_bi_prompts_category ON bi_prompts(category);
CREATE INDEX idx_bi_prompts_is_active ON bi_prompts(is_active);

-- ============================================
-- 9. bi_prompt_versions 테이블
-- ============================================

CREATE TABLE bi_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES bi_prompts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  model TEXT NOT NULL,
  temperature NUMERIC(3, 2),
  max_tokens INTEGER,
  change_note TEXT,
  changed_by UUID REFERENCES bi_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usage_count INTEGER NOT NULL DEFAULT 0,
  avg_rating NUMERIC(3, 2)
);

CREATE INDEX idx_bi_prompt_versions_prompt_id ON bi_prompt_versions(prompt_id);
CREATE INDEX idx_bi_prompt_versions_version ON bi_prompt_versions(version);

-- ============================================
-- 10. bi_prompt_variables 테이블
-- ============================================

CREATE TABLE bi_prompt_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES bi_prompts(id) ON DELETE CASCADE,
  variable_name TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  default_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bi_prompt_variables_prompt_id ON bi_prompt_variables(prompt_id);

-- ============================================
-- updated_at 자동 갱신 트리거 함수
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 적용
CREATE TRIGGER update_bi_users_updated_at
  BEFORE UPDATE ON bi_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bi_projects_updated_at
  BEFORE UPDATE ON bi_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bi_prompts_updated_at
  BEFORE UPDATE ON bi_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
