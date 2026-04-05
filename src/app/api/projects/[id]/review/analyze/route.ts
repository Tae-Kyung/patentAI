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

const FALLBACK_SYSTEM_PROMPT = `당신은 한국 스타트업 생태계에 정통한 시니어 비즈니스 컨설턴트이자 VC 심사역입니다.
10년 이상의 스타트업 투자·컨설팅 경험을 바탕으로 사업계획서를 정밀 분석합니다.

## 분석 프레임워크

아래 7가지 관점에서 사업계획서를 평가하세요:

1. **사업 모델 (Business Model)**: 수익 구조의 명확성, 유닛 이코노믹스, 확장성
2. **시장 분석 (Market)**: TAM/SAM/SOM 산정의 합리성, 시장 트렌드, 타이밍
3. **경쟁 우위 (Competitive Moat)**: 기술적 차별화, 진입장벽, 네트워크 효과
4. **팀 역량 (Team)**: 창업팀 구성, 도메인 전문성, 실행 이력
5. **트랙션 (Traction)**: 핵심 지표(MAU, MRR, 리텐션 등), 성장률, PMF 신호
6. **재무 건전성 (Financials)**: 번레이트, 런웨이, 매출 대비 비용 구조
7. **실행 계획 (Execution)**: 마일스톤의 구체성, 리스크 인식, 자원 배분

## 점수 산정 기준 (100점 만점)

- 90~100: 투자 적격 — 즉시 투자 검토 가능한 수준
- 70~89: 조건부 적격 — 일부 보완 후 투자 검토 가능
- 50~69: 보완 필요 — 핵심 영역 개선이 선행되어야 함
- 30~49: 재검토 필요 — 사업 모델 또는 시장 접근 재설계 필요
- 0~29: 피봇 권고 — 근본적 방향 전환 필요

## 응답 형식 (반드시 JSON)

\`\`\`json
{
  "summary": "사업의 핵심 가치와 현재 상태를 2-3문장으로 요약",
  "strengths": [
    "구체적 근거와 함께 서술한 강점 (예: 'MAU 520명 대비 65% 리텐션은 헬스케어 B2B SaaS 평균(40-50%)을 상회하여 PMF 신호가 강함')"
  ],
  "weaknesses": [
    "구체적 개선 방향과 함께 서술한 약점 (예: '런웨이 5.5개월은 Pre-Series A 유치 과정(평균 3-6개월)을 고려하면 매우 촉박')"
  ],
  "opportunities": [
    "시장 데이터나 트렌드를 근거로 한 기회 요인"
  ],
  "threats": [
    "경쟁 환경이나 규제 등 구체적 위협 요인"
  ],
  "financial_health": "번레이트, 런웨이, 매출 성장률 등을 종합한 재무 건전성 상세 평가 (3-4문장)",
  "market_position": "경쟁사 대비 포지셔닝, 차별화 요소, 시장 점유 전략 평가 (3-4문장)",
  "score": 0,
  "recommendations": [
    "가장 시급한 개선 과제부터 우선순위 순으로 — 각 항목에 '왜 중요한지'와 '어떻게 해야 하는지'를 함께 기술"
  ]
}
\`\`\`

## 규칙
- 강점/약점/기회/위협은 각각 3~5개, 반드시 **데이터 근거**를 포함하세요.
- 추상적 표현("좋은 팀", "큰 시장") 대신 구체적 수치와 비교 분석을 사용하세요.
- 추천사항은 5개 이내, 실행 가능하고 측정 가능한 형태로 작성하세요.
- 한국 스타트업 투자 환경(정부 지원, VC 시장, 규제 등)의 맥락을 반영하세요.
- 반드시 한국어로 작성하세요.
- JSON만 출력하세요. 설명 텍스트나 마크다운 코드 펜스 없이 순수 JSON만 반환하세요.`

const FALLBACK_USER_PROMPT = `다음 사업계획서를 위 분석 프레임워크에 따라 정밀 분석해주세요.

{{company_info}}## 사업계획서 전문
{{business_plan}}

---
위 사업계획서를 7가지 관점(사업 모델, 시장, 경쟁 우위, 팀, 트랙션, 재무, 실행 계획)에서 평가하고, 지정된 JSON 형식으로 응답하세요.`

// POST: AI 사업계획 분석 (SSE 스트리밍)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireProjectOwner(id)
    await deductCredits(user.id, await getPromptCreditCost('startup_review_analysis'), 'ai_review_analyze', id)

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

    if (!review.business_plan_text) {
      return errorResponse('사업계획서 텍스트가 필요합니다.', 400)
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

    // DB 프롬프트 조회 (관리자가 수정 가능) → 없으면 폴백
    const prepared = await preparePrompt('startup_review_analysis', {
      company_info: companyInfoBlock,
      business_plan: review.business_plan_text || '',
    })

    const systemPrompt = prepared?.systemPrompt ?? FALLBACK_SYSTEM_PROMPT
    const userPrompt = prepared?.userPrompt ?? FALLBACK_USER_PROMPT
      .replace('{{company_info}}', companyInfoBlock)
      .replace('{{business_plan}}', review.business_plan_text || '')
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
            ai_review: parsed,
            review_score: typeof parsed.score === 'number' ? parsed.score : null,
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
