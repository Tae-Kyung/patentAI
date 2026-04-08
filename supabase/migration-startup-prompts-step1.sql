-- ============================================================
-- STEP 1: prompt_category enum에 'startup' 값 추가
-- 이 쿼리를 먼저 실행하고 COMMIT한 후 STEP 2를 실행하세요.
-- ============================================================

ALTER TYPE prompt_category ADD VALUE IF NOT EXISTS 'startup';
