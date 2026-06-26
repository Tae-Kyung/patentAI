-- AI 모델 설정 테이블
CREATE TABLE IF NOT EXISTS patentai_ai_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- RLS
ALTER TABLE patentai_ai_settings ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 읽기 가능 (AI 호출 시 모델 설정을 읽어야 함)
CREATE POLICY "Authenticated users can read AI settings"
  ON patentai_ai_settings FOR SELECT
  TO authenticated
  USING (true);

-- 관리자만 수정 가능
CREATE POLICY "Admins can update AI settings"
  ON patentai_ai_settings FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can insert AI settings"
  ON patentai_ai_settings FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 기본값 시드
INSERT INTO patentai_ai_settings (key, value, label, description) VALUES
  ('claude.default', 'claude-sonnet-4-6', 'Claude 기본 모델', '텍스트 생성(분석, 청구항, 명세서)에 사용되는 기본 Claude 모델'),
  ('gemini.default', 'gemini-2.5-flash', 'Gemini 기본 모델', '텍스트 분석에 사용되는 기본 Gemini 모델'),
  ('gemini.image', 'gemini-2.5-flash-image', 'Gemini 이미지 모델', '특허 도면 생성에 사용되는 Gemini 이미지 모델'),
  ('openai.default', 'gpt-4o', 'OpenAI 기본 모델', 'PDF OCR에 사용되는 OpenAI 모델')
ON CONFLICT (key) DO NOTHING;
