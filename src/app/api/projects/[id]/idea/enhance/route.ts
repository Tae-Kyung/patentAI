import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { deductCredits } from '@/lib/credits'
import { errorResponse, handleApiError } from '@/lib/utils/api-response'
import { preparePrompt, getPromptCreditCost } from '@/lib/prompts'
import { streamClaude, createSSEResponse } from '@/lib/ai/claude'

interface RouteContext {
  params: Promise<{ id: string }>
}

const FALLBACK_SYSTEM_PROMPT = `당신은 창업 아이디어를 풍부하게 확장해주는 전문 컨설턴트입니다.
사용자가 간단히 작성한 아이디어를 받아, 500자 이상의 상세하고 구체적인 아이디어 설명으로 완성해주세요.

다음 요소들을 자연스럽게 포함하여 작성하세요:
- 해결하고자 하는 문제와 그 배경
- 제안하는 솔루션의 핵심 내용
- 목표 고객과 시장
- 차별화 포인트
- 기대 효과

자연스러운 문장으로 작성하되, 원래 아이디어의 핵심을 유지하면서 구체적인 내용을 추가해주세요.
JSON이 아닌 일반 텍스트로 작성하세요.`

const FALLBACK_USER_PROMPT_TEMPLATE = `다음 아이디어를 500자 이상의 상세한 설명으로 완성해주세요:

{{idea}}`

// POST: AI 아이디어 내용 완성 (SSE 스트리밍)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireProjectOwner(id)
    await deductCredits(user.id, await getPromptCreditCost('idea_enhancement'), 'ai_idea_enhance', id)

    const body = await request.json()
    const rawInput = body.raw_input

    if (!rawInput || typeof rawInput !== 'string' || rawInput.length < 50) {
      return errorResponse('아이디어를 50자 이상 입력해주세요.', 400)
    }

    // 프롬프트 준비 (DB 우선, 없으면 fallback)
    let systemPrompt = FALLBACK_SYSTEM_PROMPT
    let userPrompt = FALLBACK_USER_PROMPT_TEMPLATE.replace('{{idea}}', rawInput)
    let model = 'claude-sonnet-4-20250514'
    let temperature = 0.7
    let maxTokens = 2000

    const prompt = await preparePrompt('idea_enhancement', {
      idea: rawInput,
    })

    if (prompt) {
      systemPrompt = prompt.systemPrompt
      userPrompt = prompt.userPrompt
      model = prompt.model
      temperature = prompt.temperature
      maxTokens = prompt.maxTokens
    }

    // SSE 스트리밍 (DB 저장 없이 텍스트만 반환)
    const generator = streamClaude(systemPrompt, userPrompt, {
      model,
      temperature,
      maxTokens,
    })

    return createSSEResponse(generator)
  } catch (error) {
    return handleApiError(error)
  }
}
