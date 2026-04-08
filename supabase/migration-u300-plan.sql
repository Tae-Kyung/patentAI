-- U-300 사업계획서 문서 타입 추가
-- document_type enum에 u300_plan 값 추가

ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'u300_plan';
