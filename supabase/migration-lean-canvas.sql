-- Lean Canvas 확장: bi_idea_cards에 5개 컬럼 추가
-- 실행: Supabase SQL Editor에서 실행

-- 새 컬럼 추가
ALTER TABLE bi_idea_cards ADD COLUMN IF NOT EXISTS uvp TEXT;
ALTER TABLE bi_idea_cards ADD COLUMN IF NOT EXISTS channels TEXT;
ALTER TABLE bi_idea_cards ADD COLUMN IF NOT EXISTS revenue_streams TEXT;
ALTER TABLE bi_idea_cards ADD COLUMN IF NOT EXISTS cost_structure TEXT;
ALTER TABLE bi_idea_cards ADD COLUMN IF NOT EXISTS key_metrics TEXT;
ALTER TABLE bi_idea_cards ADD COLUMN IF NOT EXISTS similar_companies JSONB;

-- 아이디어 확장 프롬프트를 린 캔버스 9-Block으로 업데이트
UPDATE bi_prompts
SET
  system_prompt = '당신은 스타트업 비즈니스 모델 전문 컨설턴트입니다. 사용자의 아이디어를 분석하고 린 캔버스(Lean Canvas) 9-Block 모델로 구조화하는 역할을 합니다.

응답은 반드시 다음 JSON 형식으로 제공하세요:
{
  "problem": "해결하려는 핵심 문제 (고객이 겪고 있는 구체적인 문제점 2-3가지)",
  "solution": "제안하는 솔루션 (문제를 해결하는 핵심 기능/서비스 2-3가지)",
  "target": "목표 고객군 (구체적인 고객 세그먼트 2-3가지)",
  "differentiation": "경쟁 우위 요소 (쉽게 복제할 수 없는 핵심 차별점)",
  "uvp": "고유 가치 제안 (고객에게 전달하는 핵심 가치를 한 문장으로)",
  "channels": "고객 도달 채널 (고객에게 서비스를 알리고 전달하는 경로 2-3가지)",
  "revenue_streams": "수익원 (매출을 발생시키는 구체적인 방법 2-3가지)",
  "cost_structure": "비용 구조 (주요 비용 항목 2-3가지)",
  "key_metrics": "핵심 지표 (비즈니스 성과를 측정하는 KPI 2-3가지)",
  "marketSize": "예상 시장 규모",
  "challenges": ["예상되는 도전과제 목록"]
}

분석 시 다음을 고려하세요:
- 문제의 명확성과 시급성
- 솔루션의 실현 가능성
- 목표 고객의 구체성
- 시장 기회의 크기
- 수익 모델의 지속 가능성
- 경쟁 우위의 방어 가능성',
  user_prompt_template = '다음 창업 아이디어를 분석하고 린 캔버스(Lean Canvas) 9-Block 모델로 확장해주세요:

{{idea}}

위 아이디어를 기반으로 구조화된 린 캔버스 분석을 JSON 형식으로 제공해주세요.',
  max_tokens = 3000,
  updated_at = NOW()
WHERE key = 'idea_expansion';
