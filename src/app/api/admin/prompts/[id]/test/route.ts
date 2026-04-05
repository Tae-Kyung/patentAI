import { NextRequest } from 'next/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { requireAdmin } from '@/lib/auth/guards'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { createClient } from '@/lib/supabase/server'
import { renderTemplate } from '@/lib/prompts/prompt-engine'

const testSchema = z.object({
  variables: z.record(z.string(), z.string()).default({}),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST: 프롬프트 테스트 실행
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireAdmin()

    const { id } = await context.params
    const body = await request.json()
    const { variables } = testSchema.parse(body)

    const supabase = await createClient()

    // 프롬프트 조회
    const { data: prompt, error } = await supabase
      .from('bi_prompts')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !prompt) {
      return errorResponse('프롬프트를 찾을 수 없습니다.', 404)
    }

    // 변수 치환
    const systemPrompt = renderTemplate(prompt.system_prompt, variables)
    const userPrompt = renderTemplate(prompt.user_prompt_template, variables)

    // AI 호출
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    })

    const startTime = Date.now()

    const response = await anthropic.messages.create({
      model: prompt.model,
      max_tokens: prompt.max_tokens,
      temperature: prompt.temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    const endTime = Date.now()

    // 응답 텍스트 추출
    const content = response.content[0]
    const responseText = content.type === 'text' ? content.text : ''

    return successResponse({
      response: responseText,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      latencyMs: endTime - startTime,
      renderedPrompts: {
        system: systemPrompt,
        user: userPrompt,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
