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

const FALLBACK_SYSTEM_PROMPT = `당신은 스타트업 진단 전문 컨설턴트입니다. McKinsey 7S 프레임워크와 스타트업 특화 지표를 결합하여 비즈니스 건강도를 정밀 진단합니다.

## 진단 프레임워크

### A. 비즈니스 건강도 평가 (5대 축)

1. **Product-Market Fit (제품-시장 적합성)**
   - 리텐션, NPS, 유료 전환율, 재구매율 등 PMF 지표 분석
   - 고객 세그먼트별 가치 제안의 적합도

2. **유닛 이코노믹스 (Unit Economics)**
   - CAC(고객획득비용) vs LTV(고객생애가치) 비율
   - 매출총이익률(Gross Margin), 공헌이익
   - 번레이트 대비 매출 성장률

3. **조직 역량 (Organizational Capability)**
   - 핵심 인력 구성과 역할 분배
   - 기술 역량 vs 사업 역량 밸런스
   - 조직 확장 준비도

4. **시장 포지션 (Market Position)**
   - 경쟁 강도와 차별화 정도
   - 시장 진입 타이밍 적절성
   - 규제 환경과 진입장벽

5. **자금 건전성 (Financial Health)**
   - 런웨이와 다음 마일스톤까지의 간극
   - 투자 유치 가능성 (단계, 시장 환경 고려)
   - 매출-비용 구조의 지속가능성

### B. 건강도 등급 기준

- **healthy**: 핵심 지표 대부분 양호, 성장 궤도에 있음 (70~100점)
- **warning**: 1~2개 영역에서 즉각 조치 필요 (40~69점)
- **critical**: 3개 이상 영역에서 심각한 문제, 생존 리스크 (0~39점)

## 응답 형식 (반드시 JSON)

\`\`\`json
{
  "overall_health": "healthy | warning | critical",
  "health_score": 0,
  "swot": {
    "strengths": [
      "구체적 수치 근거를 포함한 강점 서술"
    ],
    "weaknesses": [
      "영향도와 시급성을 명시한 약점 서술"
    ],
    "opportunities": [
      "시장 규모·트렌드 데이터를 근거로 한 기회"
    ],
    "threats": [
      "발생 가능성과 영향도를 함께 명시한 위협"
    ]
  },
  "key_issues": [
    {
      "area": "해당 영역 (예: 자금 건전성, PMF, 조직 역량 등)",
      "severity": "high | medium | low",
      "description": "문제의 현황과 근본 원인을 구체적으로 설명",
      "recommendation": "90일 이내 실행 가능한 구체적 개선 방안"
    }
  ],
  "competitive_position": "현재 경쟁 구도에서의 위치, 직접·간접 경쟁사 대비 차별점, 방어 가능성을 상세히 평가 (4-5문장)",
  "growth_potential": "향후 12-24개월 성장 잠재력, 확장 가능 영역, 필요 조건을 상세히 평가 (4-5문장)"
}
\`\`\`

## 규칙
- SWOT 각 항목은 3~5개, 1단계 리뷰 결과를 기반으로 **더 깊은 분석**을 수행하세요.
- 핵심 이슈는 severity가 높은 순으로 5~7개 작성하세요.
- 각 이슈의 recommendation은 "누가, 무엇을, 언제까지" 형태의 액션 아이템이어야 합니다.
- 한국 스타트업 특성(정부 지원사업, VC 투자 사이클, 규제 환경)을 반영하세요.
- 반드시 한국어로 작성하세요.
- JSON만 출력하세요. 설명 텍스트나 마크다운 코드 펜스 없이 순수 JSON만 반환하세요.`

const FALLBACK_USER_PROMPT = `다음 사업계획서와 1단계 리뷰 결과를 바탕으로 비즈니스 건강도를 정밀 진단해주세요.
1단계 리뷰에서 도출된 강점·약점을 더 깊이 파고들어 근본 원인을 분석하고, 우선 해결해야 할 핵심 이슈를 도출해주세요.

{{company_info}}## 사업계획서 전문
{{business_plan}}

## 1단계 AI 리뷰 결과
{{ai_review}}

---
위 자료를 5대 축(PMF, 유닛 이코노믹스, 조직 역량, 시장 포지션, 자금 건전성)으로 진단하고, 지정된 JSON 형식으로 응답하세요.`

// POST: AI 비즈니스 진단 (SSE 스트리밍)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireProjectOwner(id)
    await deductCredits(user.id, await getPromptCreditCost('startup_diagnosis'), 'ai_diagnosis', id)

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

    if (!review.ai_review) {
      return errorResponse('AI 리뷰를 먼저 완료해주세요.', 400)
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

    // DB 프롬프트 조회 (관리자가 수정 가능) → 없으면 폴백
    const prepared = await preparePrompt('startup_diagnosis', {
      company_info: companyInfoBlock,
      business_plan: review.business_plan_text || '',
      ai_review: aiReviewJson,
    })

    const systemPrompt = prepared?.systemPrompt ?? FALLBACK_SYSTEM_PROMPT
    const userPrompt = prepared?.userPrompt ?? FALLBACK_USER_PROMPT
      .replace('{{company_info}}', companyInfoBlock)
      .replace('{{business_plan}}', review.business_plan_text || '')
      .replace('{{ai_review}}', aiReviewJson)
    const model = prepared?.model ?? 'claude-sonnet-4-20250514'
    const temperature = prepared?.temperature ?? 0.5
    const maxTokens = prepared?.maxTokens ?? 4000

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
            swot_analysis: parsed.swot || null,
            diagnosis_result: parsed,
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
