-- 프로젝트 타입 추가: 예비창업자 / 창업자 구분
-- 실행: Supabase SQL Editor에서 실행

-- project_type enum 생성
DO $$ BEGIN
  CREATE TYPE project_type AS ENUM ('pre_startup', 'startup');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- bi_projects에 project_type 컬럼 추가 (기본값: pre_startup)
ALTER TABLE bi_projects ADD COLUMN IF NOT EXISTS project_type project_type NOT NULL DEFAULT 'pre_startup';

-- 쇼케이스 관련 컬럼이 없다면 추가 (visibility, industry_tags)
ALTER TABLE bi_projects ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';
ALTER TABLE bi_projects ADD COLUMN IF NOT EXISTS industry_tags TEXT[];

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_bi_projects_project_type ON bi_projects(project_type);
