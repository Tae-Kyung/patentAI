-- PatentAI Storage 버킷 및 RLS 마이그레이션
-- Supabase SQL Editor에서 실행

-- ============================================
-- 1. Storage 버킷 생성
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'patent-drawings',
    'patent-drawings',
    true,                          -- public read
    10485760,                      -- 10MB
    ARRAY['image/png', 'image/jpeg', 'image/webp']
  ),
  (
    'patent-files',
    'patent-files',
    false,                         -- private (소유자만)
    52428800,                      -- 50MB
    ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. patent-drawings RLS 정책
-- ============================================

-- 공개 읽기 (누구나)
DROP POLICY IF EXISTS "Public read patent-drawings" ON storage.objects;
CREATE POLICY "Public read patent-drawings"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'patent-drawings');

-- Service role 전체 권한 (INSERT/UPDATE/DELETE)
DROP POLICY IF EXISTS "Service role manage patent-drawings" ON storage.objects;
CREATE POLICY "Service role manage patent-drawings"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'patent-drawings')
  WITH CHECK (bucket_id = 'patent-drawings');

-- 인증된 사용자: 본인 폴더(project_id/) 업로드
DROP POLICY IF EXISTS "Authenticated upload patent-drawings" ON storage.objects;
CREATE POLICY "Authenticated upload patent-drawings"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'patent-drawings');

-- ============================================
-- 3. patent-files RLS 정책
-- ============================================

-- Service role 전체 권한
DROP POLICY IF EXISTS "Service role manage patent-files" ON storage.objects;
CREATE POLICY "Service role manage patent-files"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'patent-files')
  WITH CHECK (bucket_id = 'patent-files');

-- 인증된 사용자: 업로드
DROP POLICY IF EXISTS "Authenticated upload patent-files" ON storage.objects;
CREATE POLICY "Authenticated upload patent-files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'patent-files');

-- 인증된 사용자: 본인 파일 읽기
DROP POLICY IF EXISTS "Authenticated read patent-files" ON storage.objects;
CREATE POLICY "Authenticated read patent-files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'patent-files');
