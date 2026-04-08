-- 홍보 리플렛: Gemini 이미지 생성 모델로 전환
-- 실행: Supabase SQL Editor에서 실행

-- 리플렛 프롬프트 업데이트 (이미지 생성용)
INSERT INTO bi_prompts (key, name, description, category, system_prompt, user_prompt_template, model, temperature, max_tokens)
VALUES (
  'doc_leaflet',
  '홍보 리플렛 (이미지)',
  'Gemini 이미지 생성 모델을 사용하여 A4 홍보 리플렛 이미지를 생성합니다.',
  'document',
  '당신은 전문 그래픽 디자이너입니다.
스타트업/창업 프로젝트의 홍보용 리플렛(전단지) 이미지를 만들어주세요.

디자인 원칙:
- A4 세로 방향의 홍보 리플렛 레이아웃
- 깔끔하고 세련된 마케팅 디자인
- 눈에 띄는 헤드라인과 비주얼 요소
- 브랜드 느낌의 일관된 컬러 스킴
- 한국어 텍스트를 정확하게 렌더링
- 핵심 메시지가 한눈에 전달되도록 구성
- 실제 인쇄하거나 디지털 배포할 수 있는 수준의 품질

포함할 내용:
- 프로젝트/서비스명 (크고 눈에 띄게)
- 핵심 가치 제안 (한 줄 캐치프레이즈)
- 주요 기능 또는 장점 (3~4개, 아이콘과 함께)
- 타겟 고객에게 전달하는 메시지
- 차별화 포인트 강조',
  '다음 스타트업 프로젝트의 홍보 리플렛 이미지를 생성해주세요.

프로젝트명: {{project_name}}

핵심 문제: {{problem}}
솔루션: {{solution}}
타겟 고객: {{target}}
차별화 포인트: {{differentiation}}

위 정보를 바탕으로 매력적인 홍보 리플렛 이미지를 생성해주세요.
A4 세로 방향으로, 한국어 텍스트를 사용하고,
실제 마케팅에 활용할 수 있을 정도로 전문적이고 세련된 디자인으로 만들어주세요.
핵심 가치와 장점이 한눈에 들어오도록 구성해주세요.',
  'gemini-3-pro-image-preview',
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
