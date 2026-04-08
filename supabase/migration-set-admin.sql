-- admin@cbnu.ac.kr 계정을 시스템 관리자로 설정
-- Supabase SQL Editor에서 실행하세요.

UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'admin@cbnu.ac.kr';

-- 확인
SELECT id, email, raw_app_meta_data
FROM auth.users
WHERE email = 'admin@cbnu.ac.kr';
