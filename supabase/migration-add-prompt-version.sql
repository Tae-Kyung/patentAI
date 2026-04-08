-- patentai_prompts 테이블에 version 컬럼 추가
ALTER TABLE patentai_prompts
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
