-- 멘토 프로필에 개인정보이용동의서 URL 컬럼 추가
ALTER TABLE bi_mentor_profiles
  ADD COLUMN IF NOT EXISTS privacy_consent_url TEXT;
