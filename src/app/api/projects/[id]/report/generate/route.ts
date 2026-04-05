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

const FALLBACK_SYSTEM_PROMPT = `당신은 글로벌 컨설팅펌 출신의 비즈니스 보고서 전문가입니다. 스타트업 경영진과 투자자에게 제출할 수준의 종합 경영 보고서를 작성합니다.

## 보고서 구조 (마크다운 형식)

아래 구조를 반드시 따르되, 각 섹션은 이전 3단계(검토→진단→전략)의 결과를 **재가공·통합**하여 일관된 서사(narrative)를 만들어야 합니다. 단순 복붙이 아닌, 경영 보고서다운 분석적 문체로 재구성하세요.

### 1. Executive Summary (경영진 요약)
- 3~4문단으로 사업의 핵심 가치, 현재 상태, 주요 과제, 권고 방향을 요약
- 바쁜 경영진/투자자가 이 섹션만 읽어도 전체 상황을 파악할 수 있도록
- **핵심 수치**: 점수, 건강도, 주요 KPI를 볼드체로 강조

### 2. Company Profile (기업 개요)
- 기업 기본 정보, 설립 배경, 미션
- 주요 제품/서비스와 비즈니스 모델
- 현재 팀 구성과 핵심 역량

### 3. Market Analysis (시장 분석)
- TAM/SAM/SOM 분석 결과
- 시장 트렌드와 성장 동인
- 경쟁 구도 (직접/간접 경쟁사 비교표 포함)

### 4. Business Health Assessment (비즈니스 건강도 평가)
- 종합 건강도 등급과 점수
- 5대 축(PMF, 유닛 이코노믹스, 조직, 시장 포지션, 자금) 평가 요약
- SWOT 분석 매트릭스 (표 형식)

### 5. Key Issues & Risk Analysis (핵심 이슈 & 리스크)
- 심각도순 핵심 이슈 목록 (표 형식: 영역 | 심각도 | 설명 | 권고)
- 리스크 매트릭스 (발생 확률 × 영향도)

### 6. Growth Strategy (성장 전략)
- 비전 선언문
- 단기/중기/장기 전략 목표와 KPI
- Go-to-Market 전략 핵심 요약

### 7. Action Plan (실행 로드맵)
- 분기별 핵심 마일스톤 (타임라인 표 형식)
- 우선순위별 실행 항목 (표 형식: 우선순위 | 액션 | 담당 | 기한 | 기대 효과)

### 8. Financial Outlook (재무 전망)
- 현재 재무 상태 요약
- 분기별 매출/비용 전망
- 손익분기 예상 시점
- 투자 유치 계획 및 자금 활용 방안

### 9. Conclusion & Next Steps (결론 및 다음 단계)
- 종합 평가 (강점을 살리고 약점을 보완하는 방향)
- 즉시 실행해야 할 Top 3 액션
- 다음 분기 핵심 마일스톤

---

## 작성 규칙
- **문체**: 전문적이고 격식 있는 보고서 문체. 경어체 사용.
- **데이터 기반**: 모든 주장에는 앞선 분석의 수치나 근거를 인용하세요.
- **시각적 정리**: 가능한 곳에 표(table), 목록(list), 볼드체를 활용하여 가독성을 높이세요.
- **분량**: 전체 약 2,000~3,000자 수준 (A4 5~7페이지 분량)
- **일관성**: 이전 단계에서 도출된 점수, 등급, 이슈가 보고서 전체에서 일관되게 인용되어야 합니다.
- 반드시 한국어로 작성하세요.
- 마크다운 형식으로만 출력하세요.`

const FALLBACK_USER_PROMPT = `다음 3단계 분석 결과를 종합하여, 경영진과 투자자에게 제출할 수 있는 수준의 종합 경영 보고서를 작성해주세요.
단순 결과 나열이 아니라, 일관된 서사(narrative)로 재구성해주세요.

## 프로젝트명
{{project_name}}

{{company_info}}## 사업계획서 전문
{{business_plan}}

## 1단계: 사업계획 리뷰 결과 (점수: {{review_score}}/100)
{{ai_review}}

## 2단계: 비즈니스 진단 결과
{{swot_analysis}}### 종합 진단
{{diagnosis_result}}

## 3단계: 성장 전략
{{strategy_result}}

---
위 모든 자료를 통합하여 보고서 구조(9개 섹션)에 맞는 종합 경영 보고서를 마크다운으로 작성하세요.`

// POST: AI 종합 보고서 생성 (SSE 스트리밍)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireProjectOwner(id)
    await deductCredits(user.id, await getPromptCreditCost('startup_report'), 'ai_report', id)

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

    if (!review.strategy_result) {
      return errorResponse('성장 전략을 먼저 완료해주세요.', 400)
    }

    // 프로젝트 정보 조회
    const { data: project, error: projectError } = await supabase
      .from('bi_projects')
      .select('name')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return errorResponse('프로젝트를 찾을 수 없습니다.', 404)
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
    const swotBlock = review.swot_analysis
      ? `### SWOT 분석\n${JSON.stringify(review.swot_analysis, null, 2)}\n\n`
      : ''
    const diagnosisJson = JSON.stringify(review.diagnosis_result, null, 2)
    const strategyJson = JSON.stringify(review.strategy_result, null, 2)
    const reviewScore = String(review.review_score || 'N/A')

    // DB 프롬프트 조회 (관리자가 수정 가능) → 없으면 폴백
    const prepared = await preparePrompt('startup_report', {
      project_name: project.name,
      company_info: companyInfoBlock,
      business_plan: review.business_plan_text || '',
      review_score: reviewScore,
      ai_review: aiReviewJson,
      swot_analysis: swotBlock,
      diagnosis_result: diagnosisJson,
      strategy_result: strategyJson,
    })

    const systemPrompt = prepared?.systemPrompt ?? FALLBACK_SYSTEM_PROMPT
    const userPrompt = prepared?.userPrompt ?? FALLBACK_USER_PROMPT
      .replace('{{project_name}}', project.name)
      .replace('{{company_info}}', companyInfoBlock)
      .replace('{{business_plan}}', review.business_plan_text || '')
      .replace('{{review_score}}', reviewScore)
      .replace('{{ai_review}}', aiReviewJson)
      .replace('{{swot_analysis}}', swotBlock)
      .replace('{{diagnosis_result}}', diagnosisJson)
      .replace('{{strategy_result}}', strategyJson)
    const model = prepared?.model ?? 'claude-sonnet-4-20250514'
    const temperature = prepared?.temperature ?? 0.6
    const maxTokens = prepared?.maxTokens ?? 8000

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
        // Executive Summary 추출 (첫 번째 섹션의 첫 문단)
        let executiveSummary: string | null = null
        const summaryMatch = fullContent.match(/(?:Executive Summary|경영진 요약)[^\n]*\n+([\s\S]*?)(?=\n##|\n\*\*[^*]+\*\*\n|$)/)
        if (summaryMatch) {
          executiveSummary = summaryMatch[1].trim().split('\n\n')[0].trim()
        }
        if (!executiveSummary) {
          // 폴백: 첫 번째 실질적인 문단 추출
          const lines = fullContent.split('\n').filter(line => line.trim() && !line.startsWith('#') && !line.startsWith('**'))
          executiveSummary = lines[0]?.trim() || null
        }

        const supabaseUpdate = await createClient()
        await supabaseUpdate
          .from('bi_business_reviews')
          .update({
            report_content: fullContent,
            executive_summary: executiveSummary,
          })
          .eq('id', reviewId)
      } catch {
        // 저장 실패 시 무시
      }
    }

    return createSSEResponse(generateWithSave())
  } catch (error) {
    return handleApiError(error)
  }
}
