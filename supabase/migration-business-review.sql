-- 창업자 트랙: bi_business_reviews 테이블 생성
-- 실행: Supabase SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS bi_business_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bi_projects(id) ON DELETE CASCADE,

  -- Stage 1: Review 입력 데이터
  business_plan_text TEXT,
  company_name TEXT,
  industry TEXT,
  founded_year INTEGER,
  employee_count INTEGER,
  annual_revenue TEXT,
  funding_stage TEXT,

  -- Stage 1: AI Review 결과
  ai_review JSONB,
  review_score INTEGER CHECK (review_score >= 0 AND review_score <= 100),

  -- Stage 2: Diagnosis 결과
  swot_analysis JSONB,
  diagnosis_result JSONB,

  -- Stage 3: Strategy 결과
  strategy_result JSONB,
  action_items JSONB,

  -- Stage 4: Report
  report_content TEXT,
  executive_summary TEXT,

  -- 단계별 확정 플래그
  is_review_confirmed BOOLEAN NOT NULL DEFAULT false,
  review_confirmed_at TIMESTAMPTZ,
  is_diagnosis_confirmed BOOLEAN NOT NULL DEFAULT false,
  diagnosis_confirmed_at TIMESTAMPTZ,
  is_strategy_confirmed BOOLEAN NOT NULL DEFAULT false,
  strategy_confirmed_at TIMESTAMPTZ,

  ai_model_used TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bi_business_reviews_project_id ON bi_business_reviews(project_id);

-- RLS 정책
ALTER TABLE bi_business_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project reviews"
  ON bi_business_reviews FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM bi_projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own project reviews"
  ON bi_business_reviews FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM bi_projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own project reviews"
  ON bi_business_reviews FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM bi_projects WHERE user_id = auth.uid()
    )
  );
