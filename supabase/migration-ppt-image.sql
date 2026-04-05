-- ppt_image 문서 타입 추가
-- document_type enum에 ppt_image 값 추가

ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'ppt_image';

-- ppt-images 폴더에 대한 Storage 정책 (documents 버킷이 이미 존재한다고 가정)
-- 이미 documents 버킷에 대한 정책이 있으므로 추가 설정 불필요
