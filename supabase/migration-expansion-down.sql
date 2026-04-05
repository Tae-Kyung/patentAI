-- ============================================
-- CASA 확장판 롤백 마이그레이션 (모두의 창업 에디션)
-- 실행 순서: Supabase SQL Editor에서 실행
-- 주의: migration-expansion-up.sql의 역순
-- ============================================

-- ============================================
-- STEP 1: RLS 정책 삭제
-- ============================================

-- 4-14. bi_audit_logs
DROP POLICY IF EXISTS "AuditLogs: 인증사용자 생성" ON bi_audit_logs;
DROP POLICY IF EXISTS "AuditLogs: admin만 읽기" ON bi_audit_logs;
ALTER TABLE bi_audit_logs DISABLE ROW LEVEL SECURITY;

-- 4-13. bi_message_batches
DROP POLICY IF EXISTS "MessageBatches: 기관담당자만 생성" ON bi_message_batches;
DROP POLICY IF EXISTS "MessageBatches: 발송자+admin 읽기" ON bi_message_batches;
ALTER TABLE bi_message_batches DISABLE ROW LEVEL SECURITY;

-- 4-12. bi_messages
DROP POLICY IF EXISTS "Messages: 수신자 읽음처리" ON bi_messages;
DROP POLICY IF EXISTS "Messages: 인증사용자 발송" ON bi_messages;
DROP POLICY IF EXISTS "Messages: 발신자/수신자 읽기" ON bi_messages;
ALTER TABLE bi_messages DISABLE ROW LEVEL SECURITY;

-- 4-11. bi_notifications
DROP POLICY IF EXISTS "Notifications: 본인만 수정 (읽음처리)" ON bi_notifications;
DROP POLICY IF EXISTS "Notifications: 시스템 생성 (service role)" ON bi_notifications;
DROP POLICY IF EXISTS "Notifications: 본인만 읽기" ON bi_notifications;
ALTER TABLE bi_notifications DISABLE ROW LEVEL SECURITY;

-- 4-10. bi_mentor_payouts
DROP POLICY IF EXISTS "Payouts: 기관담당자+admin 수정" ON bi_mentor_payouts;
DROP POLICY IF EXISTS "Payouts: 기관담당자+admin 생성" ON bi_mentor_payouts;
DROP POLICY IF EXISTS "Payouts: 본인멘토+기관담당자+admin 읽기" ON bi_mentor_payouts;
ALTER TABLE bi_mentor_payouts DISABLE ROW LEVEL SECURITY;

-- 4-9. bi_mentoring_reports
DROP POLICY IF EXISTS "MentoringReports: 멘토+기관담당자 수정" ON bi_mentoring_reports;
DROP POLICY IF EXISTS "MentoringReports: 멘토 생성" ON bi_mentoring_reports;
DROP POLICY IF EXISTS "MentoringReports: 관련자 읽기" ON bi_mentoring_reports;
ALTER TABLE bi_mentoring_reports DISABLE ROW LEVEL SECURITY;

-- 4-8. bi_mentoring_sessions
DROP POLICY IF EXISTS "MentoringSessions: 매칭된 멘토만 수정" ON bi_mentoring_sessions;
DROP POLICY IF EXISTS "MentoringSessions: 매칭된 멘토만 생성" ON bi_mentoring_sessions;
DROP POLICY IF EXISTS "MentoringSessions: 관련자 읽기" ON bi_mentoring_sessions;
ALTER TABLE bi_mentoring_sessions DISABLE ROW LEVEL SECURITY;

-- 4-7. bi_mentor_matches
DROP POLICY IF EXISTS "MentorMatches: 기관담당자+admin 수정" ON bi_mentor_matches;
DROP POLICY IF EXISTS "MentorMatches: 기관담당자+admin 생성" ON bi_mentor_matches;
DROP POLICY IF EXISTS "MentorMatches: 관련자 읽기" ON bi_mentor_matches;
ALTER TABLE bi_mentor_matches DISABLE ROW LEVEL SECURITY;

-- 4-6. bi_project_institution_maps
DROP POLICY IF EXISTS "ProjectMaps: admin+기관담당자 수정" ON bi_project_institution_maps;
DROP POLICY IF EXISTS "ProjectMaps: admin+지원자 생성" ON bi_project_institution_maps;
DROP POLICY IF EXISTS "ProjectMaps: 관련자 읽기" ON bi_project_institution_maps;
ALTER TABLE bi_project_institution_maps DISABLE ROW LEVEL SECURITY;

-- 4-5. bi_mentor_institution_pool
DROP POLICY IF EXISTS "MentorPool: admin+기관담당자 삭제" ON bi_mentor_institution_pool;
DROP POLICY IF EXISTS "MentorPool: admin+기관담당자 수정" ON bi_mentor_institution_pool;
DROP POLICY IF EXISTS "MentorPool: admin+기관담당자 생성" ON bi_mentor_institution_pool;
DROP POLICY IF EXISTS "MentorPool: admin+기관담당자+해당멘토 읽기" ON bi_mentor_institution_pool;
ALTER TABLE bi_mentor_institution_pool DISABLE ROW LEVEL SECURITY;

-- 4-4. bi_mentor_profiles
DROP POLICY IF EXISTS "MentorProfiles: 본인만 수정" ON bi_mentor_profiles;
DROP POLICY IF EXISTS "MentorProfiles: 본인만 생성" ON bi_mentor_profiles;
DROP POLICY IF EXISTS "MentorProfiles: 본인+기관담당자+admin 읽기" ON bi_mentor_profiles;
ALTER TABLE bi_mentor_profiles DISABLE ROW LEVEL SECURITY;

-- 4-3. bi_institution_members
DROP POLICY IF EXISTS "InstitutionMembers: admin 승인" ON bi_institution_members;
DROP POLICY IF EXISTS "InstitutionMembers: 본인 가입" ON bi_institution_members;
DROP POLICY IF EXISTS "InstitutionMembers: 본인+같은기관+admin 읽기" ON bi_institution_members;
ALTER TABLE bi_institution_members DISABLE ROW LEVEL SECURITY;

-- 4-2. bi_institutions
DROP POLICY IF EXISTS "Institutions: admin만 수정" ON bi_institutions;
DROP POLICY IF EXISTS "Institutions: admin만 생성" ON bi_institutions;
DROP POLICY IF EXISTS "Institutions: 인증 사용자 읽기" ON bi_institutions;
ALTER TABLE bi_institutions DISABLE ROW LEVEL SECURITY;

-- 4-1. bi_programs
DROP POLICY IF EXISTS "Programs: admin만 삭제" ON bi_programs;
DROP POLICY IF EXISTS "Programs: admin만 수정" ON bi_programs;
DROP POLICY IF EXISTS "Programs: admin만 생성" ON bi_programs;
DROP POLICY IF EXISTS "Programs: 인증 사용자 읽기" ON bi_programs;
ALTER TABLE bi_programs DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: 인덱스 삭제
-- ============================================

DROP INDEX IF EXISTS idx_audit_logs_resource;
DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_audit_logs_user;

DROP INDEX IF EXISTS idx_messages_project;
DROP INDEX IF EXISTS idx_messages_thread;
DROP INDEX IF EXISTS idx_messages_sender;
DROP INDEX IF EXISTS idx_messages_recipient;

DROP INDEX IF EXISTS idx_notifications_unread;
DROP INDEX IF EXISTS idx_notifications_user;

DROP INDEX IF EXISTS idx_payouts_status;
DROP INDEX IF EXISTS idx_payouts_inst;
DROP INDEX IF EXISTS idx_payouts_mentor;

DROP INDEX IF EXISTS idx_mentoring_reports_status;
DROP INDEX IF EXISTS idx_mentoring_reports_match;

DROP INDEX IF EXISTS idx_mentoring_sessions_status;
DROP INDEX IF EXISTS idx_mentoring_sessions_match;

DROP INDEX IF EXISTS idx_mentor_matches_status;
DROP INDEX IF EXISTS idx_mentor_matches_inst;
DROP INDEX IF EXISTS idx_mentor_matches_mentor;
DROP INDEX IF EXISTS idx_mentor_matches_project;

DROP INDEX IF EXISTS idx_project_maps_program;
DROP INDEX IF EXISTS idx_project_maps_inst;
DROP INDEX IF EXISTS idx_project_maps_project;

DROP INDEX IF EXISTS idx_mentor_pool_inst;
DROP INDEX IF EXISTS idx_mentor_pool_mentor;

DROP INDEX IF EXISTS idx_mentor_profiles_approved;
DROP INDEX IF EXISTS idx_mentor_profiles_active;

DROP INDEX IF EXISTS idx_institution_members_inst;
DROP INDEX IF EXISTS idx_institution_members_user;

DROP INDEX IF EXISTS idx_institutions_approved;
DROP INDEX IF EXISTS idx_institutions_region;

DROP INDEX IF EXISTS idx_programs_year;
DROP INDEX IF EXISTS idx_programs_status;

-- ============================================
-- STEP 3: FK 제약조건 삭제
-- ============================================

ALTER TABLE bi_projects DROP CONSTRAINT IF EXISTS fk_projects_program;
ALTER TABLE bi_feedbacks DROP CONSTRAINT IF EXISTS fk_feedbacks_session;

-- ============================================
-- STEP 4: 신규 테이블 삭제 (역순, FK 의존성 고려)
-- ============================================

DROP TABLE IF EXISTS bi_audit_logs;
DROP TABLE IF EXISTS bi_message_batches;
DROP TABLE IF EXISTS bi_messages;
DROP TABLE IF EXISTS bi_notifications;
DROP TABLE IF EXISTS bi_mentor_payouts;
DROP TABLE IF EXISTS bi_mentoring_reports;
DROP TABLE IF EXISTS bi_mentoring_sessions;
DROP TABLE IF EXISTS bi_mentor_matches;
DROP TABLE IF EXISTS bi_project_institution_maps;
DROP TABLE IF EXISTS bi_mentor_institution_pool;
DROP TABLE IF EXISTS bi_mentor_profiles;
DROP TABLE IF EXISTS bi_institution_members;
DROP TABLE IF EXISTS bi_institutions;
DROP TABLE IF EXISTS bi_programs;

-- ============================================
-- STEP 5: 기존 테이블 변경사항 복원
-- ============================================

-- bi_feedbacks 컬럼 제거
ALTER TABLE bi_feedbacks
  DROP COLUMN IF EXISTS session_id,
  DROP COLUMN IF EXISTS feedback_source;

-- bi_projects 컬럼 제거 (CHECK 제약조건 포함)
ALTER TABLE bi_projects
  DROP COLUMN IF EXISTS support_type,
  DROP COLUMN IF EXISTS program_id;

-- bi_users 컬럼 제거
ALTER TABLE bi_users
  DROP COLUMN IF EXISTS is_approved,
  DROP COLUMN IF EXISTS approved_at;

-- 주의: PostgreSQL ENUM에서 값 제거는 직접 불가
-- 'institution' 값은 ENUM에 남아있지만 사용되지 않음
-- 완전 제거 필요 시: ENUM 재생성 필요 (아래 주석 참조)
--
-- ALTER TYPE user_role RENAME TO user_role_old;
-- CREATE TYPE user_role AS ENUM ('user', 'mentor', 'admin');
-- ALTER TABLE bi_users ALTER COLUMN role TYPE user_role USING role::text::user_role;
-- DROP TYPE user_role_old;
