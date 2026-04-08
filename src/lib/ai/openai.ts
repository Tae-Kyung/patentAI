import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export interface OpenAIOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  jsonMode?: boolean
}

export interface OpenAIResponse {
  content: string
  usage: {
    inputTokens: number
    outputTokens: number
  }
  stopReason: string | null
}

/**
 * OpenAI API 동기 호출
 */
export async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  options: OpenAIOptions = {}
): Promise<OpenAIResponse> {
  const {
    model = 'gpt-4o',
    temperature = 0.7,
    maxTokens = 2000,
  } = options

  const response = await openai.chat.completions.create({
    model,
    max_tokens: maxTokens,
    temperature,
    ...(options.jsonMode && { response_format: { type: 'json_object' as const } }),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })

  const content = response.choices[0]?.message?.content || ''

  return {
    content,
    usage: {
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
    },
    stopReason: response.choices[0]?.finish_reason || null,
  }
}

/**
 * OpenAI API 스트리밍 호출
 * SSE 이벤트를 생성하는 AsyncGenerator 반환
 */
export async function* streamOpenAI(
  systemPrompt: string,
  userPrompt: string,
  options: OpenAIOptions = {}
): AsyncGenerator<{ type: string; data: string }, void, unknown> {
  const {
    model = 'gpt-4o',
    temperature = 0.7,
    maxTokens = 2000,
  } = options

  const stream = await openai.chat.completions.create({
    model,
    max_tokens: maxTokens,
    temperature,
    stream: true,
    ...(options.jsonMode && { response_format: { type: 'json_object' as const } }),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta
    if (delta?.content) {
      yield { type: 'text', data: delta.content }
    }
    if (chunk.choices[0]?.finish_reason) {
      yield { type: 'done', data: '' }
    }
  }
}
