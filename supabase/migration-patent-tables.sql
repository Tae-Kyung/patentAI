-- ============================================================
-- PatentAI 테이블 마이그레이션
-- 실행 순서: Supabase SQL Editor에서 이 파일 전체를 한 번에 실행
-- 전제 조건: schema.sql (bi_users 테이블) 이미 실행되어 있어야 함
-- ============================================================

-- ============================================================
-- STEP 1: prompt_category ENUM에 'patent' 추가
-- ============================================================

ALTER TYPE prompt_category ADD VALUE IF NOT EXISTS 'patent';


-- ============================================================
-- STEP 2: ENUM 타입 정의
-- ============================================================

DO $$ BEGIN
  CREATE TYPE patent_status AS ENUM (
    'draft',
    'step1_done',
    'step2_done',
    'step3_done',
    'step4_done',
    'step5_done',
    'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE patent_input_type AS ENUM ('idea', 'prd', 'paper', 'mixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE patent_claim_type AS ENUM ('independent', 'dependent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE patent_section_type AS ENUM (
    'title',
    'tech_field',
    'background',
    'problem',
    'solution',
    'effect',
    'drawing_desc',
    'detailed_desc',
    'abstract'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE patent_drawing_type AS ENUM (
    'system_architecture',
    'flowchart',
    'ui_wireframe',
    'data_flow',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE prior_art_risk AS ENUM ('high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE prior_art_source AS ENUM ('kipris', 'uspto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- STEP 3: bi_patent_projects 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS bi_patent_projects (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES bi_users(id) ON DELETE CASCADE,
  title                   VARCHAR(500) NOT NULL DEFAULT '새 특허 프로젝트',
  status                  patent_status NOT NULL DEFAULT 'draft',
  input_type              patent_input_type NOT NULL DEFAULT 'idea',
  ipc_codes               JSONB NOT NULL DEFAULT '[]',
  tech_domain             TEXT,
  core_inventions         JSONB NOT NULL DEFAULT '[]',
  overall_prior_art_risk  prior_art_risk,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bi_patent_projects_user_id ON bi_patent_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_bi_patent_projects_status  ON bi_patent_projects(status);

ALTER TABLE bi_patent_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patent_projects_owner_all" ON bi_patent_projects;
CREATE POLICY "patent_projects_owner_all" ON bi_patent_projects
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ============================================================
-- STEP 4: bi_patent_inputs 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS bi_patent_inputs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES bi_patent_projects(id) ON DELETE CASCADE,
  type             VARCHAR(10) NOT NULL CHECK (type IN ('text', 'file')),
  content          TEXT,
  file_name        VARCHAR(500),
  file_url         TEXT,
  file_size_bytes  BIGINT,
  analysis_result  JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bi_patent_inputs_project_id ON bi_patent_inputs(project_id);

ALTER TABLE bi_patent_inputs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patent_inputs_owner_all" ON bi_patent_inputs;
CREATE POLICY "patent_inputs_owner_all" ON bi_patent_inputs
  USING (EXISTS (
    SELECT 1 FROM bi_patent_projects p
    WHERE p.id = project_id AND p.user_id = auth.uid()
  ));


-- ============================================================
-- STEP 5: bi_patent_components 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS bi_patent_components (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id               UUID NOT NULL REFERENCES bi_patent_projects(id) ON DELETE CASCADE,
  parent_id                UUID REFERENCES bi_patent_components(id) ON DELETE CASCADE,
  ref_number               VARCHAR(10) NOT NULL,
  name                     VARCHAR(200) NOT NULL,
  description              TEXT,
  order_index              INT NOT NULL DEFAULT 0,
  has_prior_art_conflict   BOOLEAN NOT NULL DEFAULT false,
  conflict_risk            prior_art_risk,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bi_patent_components_project_id ON bi_patent_components(project_id);
CREATE INDEX IF NOT EXISTS idx_bi_patent_components_parent_id  ON bi_patent_components(parent_id);

ALTER TABLE bi_patent_components ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patent_components_owner_all" ON bi_patent_components;
CREATE POLICY "patent_components_owner_all" ON bi_patent_components
  USING (EXISTS (
    SELECT 1 FROM bi_patent_projects p
    WHERE p.id = project_id AND p.user_id = auth.uid()
  ));


-- ============================================================
-- STEP 6: bi_patent_prior_art 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS bi_patent_prior_art (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                   UUID NOT NULL REFERENCES bi_patent_projects(id) ON DELETE CASCADE,
  source_db                    prior_art_source NOT NULL,
  patent_number                VARCHAR(50) NOT NULL,
  title                        TEXT NOT NULL,
  abstract                     TEXT,
  similarity_score             INT CHECK (similarity_score BETWEEN 0 AND 100),
  risk_level                   prior_art_risk NOT NULL,
  conflicting_component_ids    JSONB NOT NULL DEFAULT '[]',
  avoidance_suggestion         TEXT,
  searched_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bi_patent_prior_art_project_id  ON bi_patent_prior_art(project_id);
CREATE INDEX IF NOT EXISTS idx_bi_patent_prior_art_risk_level  ON bi_patent_prior_art(risk_level);

ALTER TABLE bi_patent_prior_art ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patent_prior_art_owner_all" ON bi_patent_prior_art;
CREATE POLICY "patent_prior_art_owner_all" ON bi_patent_prior_art
  USING (EXISTS (
    SELECT 1 FROM bi_patent_projects p
    WHERE p.id = project_id AND p.user_id = auth.uid()
  ));


-- ============================================================
-- STEP 7: bi_patent_claims 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS bi_patent_claims (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES bi_patent_projects(id) ON DELETE CASCADE,
  claim_number    INT NOT NULL,
  claim_type      patent_claim_type NOT NULL DEFAULT 'independent',
  parent_claim_id UUID REFERENCES bi_patent_claims(id) ON DELETE SET NULL,
  content         TEXT NOT NULL,
  strength_score  INT CHECK (strength_score BETWEEN 0 AND 100),
  strength_issues JSONB NOT NULL DEFAULT '[]',
  is_confirmed    BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, claim_number)
);

CREATE INDEX IF NOT EXISTS idx_bi_patent_claims_project_id ON bi_patent_claims(project_id);

ALTER TABLE bi_patent_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patent_claims_owner_all" ON bi_patent_claims;
CREATE POLICY "patent_claims_owner_all" ON bi_patent_claims
  USING (EXISTS (
    SELECT 1 FROM bi_patent_projects p
    WHERE p.id = project_id AND p.user_id = auth.uid()
  ));


-- ============================================================
-- STEP 8: bi_patent_sections 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS bi_patent_sections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES bi_patent_projects(id) ON DELETE CASCADE,
  section_type  patent_section_type NOT NULL,
  content       TEXT,
  version       INT NOT NULL DEFAULT 1,
  is_confirmed  BOOLEAN NOT NULL DEFAULT false,
  confirmed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, section_type)
);

CREATE INDEX IF NOT EXISTS idx_bi_patent_sections_project_id ON bi_patent_sections(project_id);

ALTER TABLE bi_patent_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patent_sections_owner_all" ON bi_patent_sections;
CREATE POLICY "patent_sections_owner_all" ON bi_patent_sections
  USING (EXISTS (
    SELECT 1 FROM bi_patent_projects p
    WHERE p.id = project_id AND p.user_id = auth.uid()
  ));


-- ============================================================
-- STEP 9: bi_patent_drawings 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS bi_patent_drawings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES bi_patent_projects(id) ON DELETE CASCADE,
  drawing_number INT NOT NULL,
  drawing_type   patent_drawing_type NOT NULL,
  caption        TEXT,
  prompt_used    TEXT,
  image_url      TEXT,
  is_confirmed   BOOLEAN NOT NULL DEFAULT false,
  confirmed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, drawing_number)
);

CREATE INDEX IF NOT EXISTS idx_bi_patent_drawings_project_id ON bi_patent_drawings(project_id);

ALTER TABLE bi_patent_drawings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patent_drawings_owner_all" ON bi_patent_drawings;
CREATE POLICY "patent_drawings_owner_all" ON bi_patent_drawings
  USING (EXISTS (
    SELECT 1 FROM bi_patent_projects p
    WHERE p.id = project_id AND p.user_id = auth.uid()
  ));


-- ============================================================
-- STEP 10: bi_patent_gates 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS bi_patent_gates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES bi_patent_projects(id) ON DELETE CASCADE,
  gate_number  INT NOT NULL CHECK (gate_number BETWEEN 1 AND 5),
  status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'returned')),
  approved_by  UUID REFERENCES bi_users(id),
  notes        TEXT,
  approved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, gate_number)
);

CREATE INDEX IF NOT EXISTS idx_bi_patent_gates_project_id ON bi_patent_gates(project_id);

ALTER TABLE bi_patent_gates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patent_gates_owner_all" ON bi_patent_gates;
CREATE POLICY "patent_gates_owner_all" ON bi_patent_gates
  USING (EXISTS (
    SELECT 1 FROM bi_patent_projects p
    WHERE p.id = project_id AND p.user_id = auth.uid()
  ));


-- ============================================================
-- STEP 11: updated_at 자동 갱신 트리거
-- ============================================================

-- 함수는 schema.sql에서 이미 생성됨 (update_updated_at_column)

CREATE OR REPLACE TRIGGER update_bi_patent_projects_updated_at
  BEFORE UPDATE ON bi_patent_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_bi_patent_components_updated_at
  BEFORE UPDATE ON bi_patent_components
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_bi_patent_claims_updated_at
  BEFORE UPDATE ON bi_patent_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_bi_patent_sections_updated_at
  BEFORE UPDATE ON bi_patent_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_bi_patent_drawings_updated_at
  BEFORE UPDATE ON bi_patent_drawings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
