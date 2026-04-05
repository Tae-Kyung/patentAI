import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { deductCredits } from '@/lib/credits'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, handleApiError } from '@/lib/utils/api-response'
import { preparePrompt, getPromptCreditCost } from '@/lib/prompts'
import { streamClaude, createSSEResponse } from '@/lib/ai/claude'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST: AI 아이디어 확장 (SSE 스트리밍)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireProjectOwner(id)
    await deductCredits(user.id, await getPromptCreditCost('idea_expansion'), 'ai_idea_expand', id)

    const supabase = await createClient()

    // 아이디어 조회
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

    // 프롬프트 준비
    const prompt = await preparePrompt('idea_expansion', {
      idea: ideaCard.raw_input,
    })

    if (!prompt) {
      return errorResponse('프롬프트를 찾을 수 없습니다.', 500)
    }

    // 값 복사 (클로저에서 사용)
    const ideaCardId = ideaCard.id
    const systemPrompt = prompt.systemPrompt
    const userPrompt = prompt.userPrompt
    const model = prompt.model
    const temperature = prompt.temperature
    const maxTokens = prompt.maxTokens

    // SSE 스트리밍 생성기
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

      // 스트리밍 완료 후 결과 저장
      try {
        // markdown 코드 펜스 제거 (```json ... ``` 또는 ``` ... ```)
        let cleanContent = fullContent.trim()
        const fenceMatch = cleanContent.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/)
        if (fenceMatch) {
          cleanContent = fenceMatch[1].trim()
        }
        const parsed = JSON.parse(cleanContent)

        await supabase
          .from('bi_idea_cards')
          .update({
            problem: parsed.problem || null,
            solution: parsed.solution || null,
            target: parsed.target || null,
            differentiation: parsed.differentiation || null,
            uvp: parsed.uvp || null,
            channels: parsed.channels || null,
            revenue_streams: parsed.revenue_streams || parsed.revenueStreams || null,
            cost_structure: parsed.cost_structure || parsed.costStructure || null,
            key_metrics: parsed.key_metrics || parsed.keyMetrics || null,
            ai_expanded: parsed,
            ai_model_used: model,
          })
          .eq('id', ideaCardId)
      } catch {
        // JSON 파싱 실패 시 원본 텍스트 저장
        await supabase
          .from('bi_idea_cards')
          .update({
            ai_expanded: { raw: fullContent },
            ai_model_used: model,
          })
          .eq('id', ideaCardId)
      }
    }

    return createSSEResponse(generateWithSave())
  } catch (error) {
    return handleApiError(error)
  }
}
