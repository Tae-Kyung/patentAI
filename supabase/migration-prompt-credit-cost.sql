-- bi_prompts 테이블에 credit_cost 컬럼 추가
-- 각 프롬프트 실행 시 차감할 크레딧 수 (기본값 1)

ALTER TABLE bi_prompts
ADD COLUMN IF NOT EXISTS credit_cost INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN bi_prompts.credit_cost IS '프롬프트 실행 시 차감할 크레딧 수 (0=무료, 기본값=1)';
