-- ============================================================
-- 크레딧 시스템 마이그레이션
-- bi_users에 크레딧 컬럼 추가 + bi_credit_logs 테이블 생성
-- ============================================================

-- 1. bi_users에 크레딧 컬럼 추가
ALTER TABLE bi_users ADD COLUMN IF NOT EXISTS ai_credits integer NOT NULL DEFAULT 30;

-- 2. 크레딧 사용/충전 로그 테이블
CREATE TABLE IF NOT EXISTS bi_credit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES bi_users(id) ON DELETE CASCADE,
  amount integer NOT NULL,              -- 양수: 충전, 음수: 차감
  balance_after integer NOT NULL,       -- 변경 후 잔액
  reason text NOT NULL,                 -- 사용 사유 (예: 'ai_idea_expand', 'admin_recharge')
  project_id uuid REFERENCES bi_projects(id) ON DELETE SET NULL,
  created_by uuid REFERENCES bi_users(id) ON DELETE SET NULL,  -- 관리자 충전 시 관리자 ID
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_credit_logs_user_id ON bi_credit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_logs_created_at ON bi_credit_logs(created_at DESC);

-- 3. RLS 정책
ALTER TABLE bi_credit_logs ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 로그만 조회 가능
CREATE POLICY "Users can view own credit logs"
  ON bi_credit_logs FOR SELECT
  USING (auth.uid() = user_id);

-- 서비스 역할로만 삽입 가능 (API에서 처리)
CREATE POLICY "Service role can insert credit logs"
  ON bi_credit_logs FOR INSERT
  WITH CHECK (true);

-- 4. 기존 사용자에게 기본 크레딧 부여 (이미 DEFAULT 30이므로 기존 사용자만 업데이트)
UPDATE bi_users SET ai_credits = 30 WHERE ai_credits IS NULL;
