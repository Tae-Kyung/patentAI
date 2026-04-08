-- CASA Phase 10: 모두의 창업 연계 개선 마이그레이션
-- 실행: Supabase SQL Editor에서 실행

-- ============================================
-- 1. bi_projects에 visibility 컬럼 추가 (F8: 공개 프로필)
-- ============================================

-- visibility 타입 생성
DO $$ BEGIN
  CREATE TYPE project_visibility AS ENUM ('public', 'summary', 'private');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE bi_projects
  ADD COLUMN IF NOT EXISTS visibility project_visibility NOT NULL DEFAULT 'private';

ALTER TABLE bi_projects
  ADD COLUMN IF NOT EXISTS industry_tags JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_bi_projects_visibility ON bi_projects(visibility);

-- ============================================
-- 2. bi_users에 멘토 프로필 컬럼 추가 (F9: 멘토 매칭)
-- ============================================

ALTER TABLE bi_users
  ADD COLUMN IF NOT EXISTS expertise_tags JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE bi_users
  ADD COLUMN IF NOT EXISTS industry_tags JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE bi_users
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- ============================================
-- 3. bi_documents type에 gtm_checklist 추가 (F7: GTM)
-- ============================================

ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'gtm_checklist';

-- ============================================
-- 4. 공개 프로필용 RLS 정책 추가
-- ============================================

-- 비인증 사용자도 public/summary 프로젝트 조회 허용
CREATE POLICY "Anyone can view public projects"
  ON bi_projects
  FOR SELECT
  USING (visibility IN ('public', 'summary'));

-- 공개 프로젝트의 아이디어 카드 조회 허용
CREATE POLICY "Anyone can view public project idea cards"
  ON bi_idea_cards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bi_projects
      WHERE bi_projects.id = bi_idea_cards.project_id
      AND bi_projects.visibility IN ('public', 'summary')
    )
  );

-- 공개 프로젝트의 평가 결과 조회 허용
CREATE POLICY "Anyone can view public project evaluations"
  ON bi_evaluations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bi_projects
      WHERE bi_projects.id = bi_evaluations.project_id
      AND bi_projects.visibility IN ('public', 'summary')
    )
  );

-- 전체 공개 프로젝트의 문서 조회 허용
CREATE POLICY "Anyone can view full public project documents"
  ON bi_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bi_projects
      WHERE bi_projects.id = bi_documents.project_id
      AND bi_projects.visibility = 'public'
    )
  );
