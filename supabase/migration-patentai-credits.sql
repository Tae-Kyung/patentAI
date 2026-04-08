-- PatentAI 크레딧 시스템 마이그레이션
-- Supabase SQL Editor에서 실행

-- ============================================
-- 1. 사용자 크레딧 잔액 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS patentai_user_credits (
  user_id   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits   INTEGER NOT NULL DEFAULT 30,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. 크레딧 로그 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS patentai_credit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL,           -- 양수: 충전, 음수: 사용
  balance_after INTEGER NOT NULL,
  reason      TEXT NOT NULL,
  project_id  UUID REFERENCES patentai_patent_projects(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patentai_credit_logs_user ON patentai_credit_logs(user_id);

-- ============================================
-- 3. RLS
-- ============================================
ALTER TABLE patentai_user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE patentai_credit_logs ENABLE ROW LEVEL SECURITY;

-- 본인 크레딧만 조회/수정
CREATE POLICY "Users can view own credits"
  ON patentai_user_credits FOR SELECT
  USING (auth.uid() = user_id);

-- 서비스 롤은 모든 조작 가능 (credit deduction uses service role)
CREATE POLICY "Service role manages credits"
  ON patentai_user_credits FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view own credit logs"
  ON patentai_credit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages credit logs"
  ON patentai_credit_logs FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 4. 신규 가입 시 기본 크레딧 부여 함수
-- ============================================
CREATE OR REPLACE FUNCTION patentai_init_user_credits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO patentai_user_credits (user_id, credits)
  VALUES (NEW.id, 30)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- auth.users 트리거 (가입 시 크레딧 생성)
CREATE OR REPLACE TRIGGER on_auth_user_created_patentai_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION patentai_init_user_credits();
