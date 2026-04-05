-- 멘토 프로필에 신분증 및 서류 확인 컬럼 추가
ALTER TABLE bi_mentor_profiles
  ADD COLUMN IF NOT EXISTS id_card_url TEXT,
  ADD COLUMN IF NOT EXISTS documents_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS documents_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS documents_confirmed_by UUID REFERENCES auth.users(id);
