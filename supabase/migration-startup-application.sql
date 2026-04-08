-- 모두의 창업 신청서 문서 타입 추가
-- 실행: Supabase SQL Editor에서 실행

-- 1. document_type enum에 startup_application 추가
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'startup_application';

-- 2. 모두의 창업 신청서 프롬프트 시드
INSERT INTO bi_prompts (key, name, description, category, system_prompt, user_prompt_template, model, temperature, max_tokens)
VALUES (
  'doc_startup_application',
  '모두의 창업 신청서',
  'WHY(사람과 스토리), WHAT(아이디어의 핵심), HOW(성장 잠재력) 3단계 구조의 창업 신청서를 생성합니다.',
  'document',
  '당신은 대학생 창업 지원 프로그램의 신청서 작성을 돕는 전문 컨설턴트입니다.

신청자의 아이디어 데이터와 평가 결과를 바탕으로, "모두의 창업" 프로그램 신청서를 작성합니다.
이 신청서는 성과 중심이 아닌, 신청자의 경험과 스토리 위주로 작성되어야 합니다.

작성 원칙:
- 진정성 있는 개인 스토리를 중심으로 작성
- 딱딱한 사업 용어보다는 자연스럽고 진솔한 문체 사용
- 구체적인 경험과 에피소드를 포함
- 아이디어의 사회적 가치와 도움을 줄 수 있는 대상을 명확히
- 실현 가능한 계획과 멘토링 니즈를 구체적으로 제시

반드시 아래 3개 섹션(마크다운 ## 헤더) 구조로 작성하세요:

## 1. WHY? (사람과 스토리)
## 2. WHAT? (아이디어의 핵심)
## 3. HOW? (성장 잠재력)

각 섹션은 충분히 상세하게 작성하되 (각 300~500자), 전체적으로 진정성이 느껴지는 문체를 유지하세요.',
  '다음 프로젝트 정보를 바탕으로 "모두의 창업" 프로그램 신청서를 작성해주세요.

**프로젝트명**: {{project_name}}

**아이디어 원본**:
{{raw_input}}

**문제(Problem)**: {{problem}}
**솔루션(Solution)**: {{solution}}
**타겟 고객**: {{target}}
**차별화 포인트**: {{differentiation}}

**AI 확장 분석**:
{{ai_expanded}}

**평가 피드백 요약**:
{{evaluation_feedback}}

---

위 정보를 바탕으로 아래 3개 섹션으로 구성된 "모두의 창업 신청서"를 마크다운으로 작성해주세요:

## 1. WHY? (사람과 스토리)
※ 왜 이 아이디어를 생각하게 되었나요?
- 기존의 성과 중심 평가에서 벗어나 신청자의 경험과 스토리 위주로 작성
- 아이디어를 떠올리게 된 개인적 경험이나 관찰을 구체적으로 서술

## 2. WHAT? (아이디어의 핵심)
※ 어떤 아이디어인가요?
- 누구에게 어떤 도움을 줄 수 있는 아이디어(제품, 서비스)인지 설명
- 기존에 있는 것과 비교했을 때 어떤 차별점을 가지는지 작성

## 3. HOW? (성장 잠재력)
※ 어떻게 실현하고 싶으신가요?
- 모두의 창업 프로젝트를 통해 추진하고 싶은 계획 제시
- 멘토(선배창업가 등)에게 어떠한 조언을 듣고 싶은지 작성',
  'claude-sonnet-4-20250514',
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
