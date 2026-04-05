import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { deductCredit } from '@/lib/credits'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, handleApiError } from '@/lib/utils/api-response'
import { streamClaude, createSSEResponse } from '@/lib/ai/claude'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST: 유사 기업 탐색 (SSE 스트리밍 + DB 저장)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireProjectOwner(id)
    await deductCredit(user.id, 'ai_similar_companies', id)

    const supabase = await createClient()

    const { data: ideaCard, error: ideaError } = await supabase
      .from('bi_idea_cards')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (ideaError || !ideaCard) {
      return errorResponse('아이디어를 먼저 입력해주세요.', 400)
    }

    const canvasSummary = [
      ideaCard.problem && `문제: ${ideaCard.problem}`,
      ideaCard.solution && `솔루션: ${ideaCard.solution}`,
      ideaCard.target && `타겟: ${ideaCard.target}`,
      ideaCard.uvp && `UVP: ${ideaCard.uvp}`,
      ideaCard.revenue_streams && `수익원: ${ideaCard.revenue_streams}`,
    ].filter(Boolean).join('\n')

    const systemPrompt = `당신은 스타트업 투자 분석 전문가입니다. 주어진 비즈니스 모델과 유사한 실제 기업/스타트업을 분석합니다.

응답은 반드시 다음 JSON 형식으로 제공하세요:
{
  "companies": [
    {
      "name": "기업명",
      "description": "한 줄 설명",
      "stage": "투자 단계 (Seed/Series A/B/C 등)",
      "funding": "투자 유치 금액",
      "similarity": "유사도 (0-100 숫자)",
      "similarPoints": "유사한 점 (간단히)"
    }
  ]
}

규칙:
- 실제로 존재하거나 존재했던 기업만 언급하세요.
- 3~5개 기업을 유사도 순으로 정렬하세요.
- 유사도는 비즈니스 모델, 타겟 고객, 솔루션 접근 방식을 기준으로 산정하세요.`

    const userPrompt = `다음 비즈니스 모델과 유사한 기업을 분석해주세요:

${canvasSummary}

원본 아이디어:
${ideaCard.raw_input}`

    const ideaCardId = ideaCard.id

    async function* generateWithSave() {
      let fullContent = ''

      const stream = streamClaude(systemPrompt, userPrompt, {
        model: 'claude-sonnet-4-20250514',
        temperature: 0.5,
        maxTokens: 2000,
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

        await supabase
          .from('bi_idea_cards')
          .update({
            similar_companies: parsed.companies || parsed,
          })
          .eq('id', ideaCardId)
      } catch {
        // 파싱 실패 시 무시
      }
    }

    return createSSEResponse(generateWithSave())
  } catch (error) {
    return handleApiError(error)
  }
}
