-- 인포그래픽: Gemini 이미지 생성 모델로 전환
-- 실행: Supabase SQL Editor에서 실행

-- 1. documents 스토리지 버킷 생성 (이미 존재하면 무시)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- 2. documents 버킷 공개 읽기 정책
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public read access for documents' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Public read access for documents"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'documents');
  END IF;
END $$;

-- 3. documents 버킷 인증 사용자 업로드 정책
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload documents' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Authenticated users can upload documents"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- 4. documents 버킷 인증 사용자 업데이트 정책
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update documents' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Authenticated users can update documents"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'documents' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- 5. 인포그래픽 프롬프트 업데이트 (이미지 생성용)
INSERT INTO bi_prompts (key, name, description, category, system_prompt, user_prompt_template, model, temperature, max_tokens)
VALUES (
  'doc_infographic',
  '인포그래픽 (이미지)',
  'Gemini 이미지 생성 모델을 사용하여 실제 인포그래픽 이미지를 생성합니다.',
  'document',
  '당신은 전문 인포그래픽 디자이너입니다.
스타트업/창업 프로젝트의 핵심 정보를 시각적으로 매력적인 인포그래픽 이미지로 만들어주세요.

디자인 원칙:
- 깔끔하고 모던한 플랫 디자인 스타일
- 밝고 전문적인 컬러 팔레트 사용
- 핵심 데이터와 키워드를 시각적으로 강조
- 아이콘과 일러스트를 활용한 직관적 정보 전달
- 한국어 텍스트를 정확하게 렌더링
- 세로 방향의 인포그래픽 레이아웃 (포스터 형태)

포함할 섹션:
- 프로젝트명과 한 줄 요약 (상단 헤더)
- 해결하는 문제 (Problem)
- 제안하는 솔루션 (Solution)
- 타겟 고객
- 차별화 포인트
- 평가 점수 (시각적 차트/게이지)',
  '다음 스타트업 프로젝트의 인포그래픽 이미지를 생성해주세요.

프로젝트명: {{project_name}}

핵심 문제: {{problem}}
솔루션: {{solution}}
타겟 고객: {{target}}
차별화 포인트: {{differentiation}}

평가 점수:
- 종합: {{total_score}}점
- 투자 매력도: {{investor_score}}점
- 시장성: {{market_score}}점
- 기술 실현성: {{tech_score}}점

위 정보를 바탕으로 전문적이고 시각적으로 매력적인 인포그래픽 이미지를 생성해주세요.
한국어 텍스트를 사용하고, 깔끔한 플랫 디자인 스타일로 만들어주세요.
세로 방향 레이아웃으로, 각 섹션이 명확히 구분되도록 디자인해주세요.',
  'gemini-2.5-flash-image',
  0.7,
  4000
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  user_prompt_template = EXCLUDED.user_prompt_template,
  model = EXCLUDED.model,
  temperature = EXCLUDED.temperature,
  max_tokens = EXCLUDED.max_tokens,
  updated_at = NOW();
