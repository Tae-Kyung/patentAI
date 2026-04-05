-- bi_institutions에 세션 단가 컬럼 추가 (기본값 200,000원)
ALTER TABLE bi_institutions
ADD COLUMN IF NOT EXISTS session_unit_price integer NOT NULL DEFAULT 200000;

COMMENT ON COLUMN bi_institutions.session_unit_price IS '멘토링 세션 기본 단가 (원)';

-- bi_mentor_matches에 매칭별 단가 컬럼 추가 (기본값 200,000원)
ALTER TABLE bi_mentor_matches
ADD COLUMN IF NOT EXISTS unit_price integer NOT NULL DEFAULT 200000;

COMMENT ON COLUMN bi_mentor_matches.unit_price IS '매칭별 세션 단가 (원), 매칭 생성 시 기관 기본 단가에서 복사';
