import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { deductCredits } from '@/lib/credits'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, handleApiError } from '@/lib/utils/api-response'
import { streamClaude, createSSEResponse } from '@/lib/ai/claude'
import { preparePrompt, getPromptCreditCost } from '@/lib/prompts'

interface RouteContext {
  params: Promise<{ id: string }>
}

const FALLBACK_SYSTEM_PROMPT = `당신은 한국 스타트업 전문 전략 컨설턴트입니다. 맥킨지·베인 수준의 전략 프레임워크를 스타트업 맥락에 맞게 적용하여, 실행 가능하고 투자자에게 설득력 있는 성장 전략을 수립합니다.

## 전략 수립 프레임워크

### 1. 비전 & 미션 재정립
- 진단 결과를 반영한 현실적이면서도 야심 찬 비전
- 투자자와 팀 모두에게 영감을 주는 방향성

### 2. 전략 목표 (OKR 방식)
- **단기 (0~6개월)**: 생존과 PMF 강화에 집중
- **중기 (6~12개월)**: 성장 가속화와 시장 확대
- **장기 (12~24개월)**: 스케일업과 시장 리더십 확보
- 각 목표에 측정 가능한 KPI 3개 이상

### 3. Go-to-Market 전략
- 고객 세그먼트별 접근 전략
- 가격 전략 및 수익 모델 최적화
- 채널 전략 (직접 영업, 파트너십, 온라인 등)

### 4. 실행 계획 (Action Plan)
- 분기별 핵심 마일스톤
- 각 액션에 담당자, 기한, 예산, 성공 기준 명시
- 의존 관계와 선후 관계 고려

### 5. 자원 & 투자 전략
- 다음 라운드까지 필요한 자금과 조달 전략
- 핵심 채용 계획 (어떤 역할이 언제 필요한지)
- 기술 인프라 투자 계획

### 6. 리스크 관리
- 리스크별 발생 확률 × 영향도 매트릭스
- 각 리스크에 대한 사전 예방책 + 발생 시 대응책

## 응답 형식 (반드시 JSON)

\`\`\`json
{
  "vision": "진단 결과를 반영한 구체적이고 측정 가능한 비전 선언문 (2-3문장)",
  "strategic_goals": [
    {
      "goal": "전략 목표 (SMART 원칙: 구체적, 측정 가능, 달성 가능, 관련성, 시한)",
      "timeline": "0-6개월 | 6-12개월 | 12-24개월",
      "kpis": ["측정 가능한 KPI (예: MRR 1억 원 달성)", "KPI2", "KPI3"]
    }
  ],
  "action_plan": [
    {
      "priority": "high | medium | low",
      "action": "구체적인 실행 항목 (예: '수도권 3개 대학병원 대상 파일럿 제안서 발송')",
      "responsible": "담당 (예: CEO + 영업팀)",
      "timeline": "구체적 기간 (예: 2025.Q2)",
      "expected_outcome": "정량적 기대 효과 (예: '병원 5곳 추가 계약, MRR +3,000만 원')"
    }
  ],
  "resource_requirements": {
    "budget": "분기별 필요 예산과 주요 지출 항목을 구체적으로 기술",
    "team": "필요 인력의 역할, 인원, 우선순위를 명시 (예: '시니어 백엔드 1명(Q1), 영업 매니저 2명(Q2)')",
    "technology": "필요 기술 스택, 인프라, 인증/보안 요건 등"
  },
  "risk_mitigation": [
    {
      "risk": "위험 요소 (발생 확률: 높음/중간/낮음)",
      "mitigation": "예방책: ... / 발생 시 대응: ..."
    }
  ],
  "financial_projections": {
    "revenue_target": "분기별 매출 목표와 근거 (예: 'Q1: 7,500만, Q2: 1.2억 — 병원 5곳 추가 기준')",
    "cost_optimization": "구체적인 비용 절감 방안과 목표 금액",
    "break_even": "손익분기 시점과 전제 조건을 명시"
  }
}
\`\`\`

## 규칙
- 전략 목표는 단기/중기/장기 각 1~2개씩, 총 3~5개 작성하세요.
- 실행 계획은 6~10개, 반드시 priority high 항목이 먼저 오도록 정렬하세요.
- 모든 수치는 진단 결과의 데이터를 근거로 현실적으로 제시하세요.
- 한국 스타트업 환경(TIPS, 창업성장기술개발사업 등 정부 지원, VC 투자 트렌드)을 반영하세요.
- 반드시 한국어로 작성하세요.
- JSON만 출력하세요. 설명 텍스트나 마크다운 코드 펜스 없이 순수 JSON만 반환하세요.`

const FALLBACK_USER_PROMPT = `다음 사업계획서, 리뷰, 진단 결과를 종합하여 실행 가능한 성장 전략을 수립해주세요.
특히 진단에서 도출된 핵심 이슈(key_issues)를 해결하는 방향으로 전략을 설계해주세요.

{{company_info}}## 사업계획서 전문
{{business_plan}}

## 1단계: AI 리뷰 결과
{{ai_review}}

## 2단계: 비즈니스 진단 결과
{{diagnosis_result}}

---
위 자료를 종합하여 비전, 전략 목표(OKR), 실행 계획, 자원 계획, 리스크 대응, 재무 전망을 포함한 성장 전략을 지정된 JSON 형식으로 응답하세요.`

// POST: AI 성장 전략 생성 (SSE 스트리밍)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireProjectOwner(id)
    await deductCredits(user.id, await getPromptCreditCost('startup_strategy'), 'ai_strategy', id)

    const supabase = await createClient()

    // 사업 리뷰 조회
    const { data: review, error: reviewError } = await supabase
      .from('bi_business_reviews')
      .select('*')
      .eq('project_id', id)
      .limit(1)
      .single()

    if (reviewError || !review) {
      return errorResponse('사업 리뷰를 먼저 작성해주세요.', 400)
    }

    if (!review.diagnosis_result) {
      return errorResponse('비즈니스 진단을 먼저 완료해주세요.', 400)
    }

    // 기업 정보 구성
    const companyInfo = [
      review.company_name && `회사명: ${review.company_name}`,
      review.industry && `산업: ${review.industry}`,
      review.founded_year && `설립연도: ${review.founded_year}`,
      review.employee_count && `직원 수: ${review.employee_count}명`,
      review.annual_revenue && `연 매출: ${review.annual_revenue}`,
      review.funding_stage && `투자 단계: ${review.funding_stage}`,
    ].filter(Boolean).join('\n')

    const companyInfoBlock = companyInfo ? `## 기업 정보\n${companyInfo}\n\n` : ''
    const aiReviewJson = JSON.stringify(review.ai_review, null, 2)
    const diagnosisJson = JSON.stringify(review.diagnosis_result, null, 2)

    // DB 프롬프트 조회 (관리자가 수정 가능) → 없으면 폴백
    const prepared = await preparePrompt('startup_strategy', {
      company_info: companyInfoBlock,
      business_plan: review.business_plan_text || '',
      ai_review: aiReviewJson,
      diagnosis_result: diagnosisJson,
    })

    const systemPrompt = prepared?.systemPrompt ?? FALLBACK_SYSTEM_PROMPT
    const userPrompt = prepared?.userPrompt ?? FALLBACK_USER_PROMPT
      .replace('{{company_info}}', companyInfoBlock)
      .replace('{{business_plan}}', review.business_plan_text || '')
      .replace('{{ai_review}}', aiReviewJson)
      .replace('{{diagnosis_result}}', diagnosisJson)
    const model = prepared?.model ?? 'claude-sonnet-4-20250514'
    const temperature = prepared?.temperature ?? 0.6
    const maxTokens = prepared?.maxTokens ?? 5000

    const reviewId = review.id

    async function* generateWithSave() {
      let fullContent = ''

      const stream = streamClaude(systemPrompt, userPrompt, {
        model,
        temperature,
        maxTokens,
      })

      for await (const event of stream) {
        if (event.type === 'text') {
          fullContent += event.data
        }
        yield event
      }

      // 스트리밍 완료 후 DB 저장
      try {
        let cleanContent = fullContent.trim()
        const fenceMatch = cleanContent.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/)
        if (fenceMatch) {
          cleanContent = fenceMatch[1].trim()
        }
        const parsed = JSON.parse(cleanContent)

        const supabaseUpdate = await createClient()
        await supabaseUpdate
          .from('bi_business_reviews')
          .update({
            strategy_result: parsed,
            action_items: parsed.action_plan || null,
          })
          .eq('id', reviewId)
      } catch {
        // 파싱 실패 시 무시
      }
    }

    return createSSEResponse(generateWithSave())
  } catch (error) {
    return handleApiError(error)
  }
}
