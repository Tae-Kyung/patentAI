import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export interface ClaudeOptions {
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface ClaudeResponse {
  content: string
  usage: {
    inputTokens: number
    outputTokens: number
  }
  stopReason: string | null
}

/**
 * Claude API 동기 호출
 */
export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  options: ClaudeOptions = {}
): Promise<ClaudeResponse> {
  const {
    model = 'claude-sonnet-4-20250514',
    temperature = 0.7,
    maxTokens = 2000,
  } = options

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  })

  const content = response.content[0]
  const text = content.type === 'text' ? content.text : ''

  return {
    content: text,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
    stopReason: response.stop_reason,
  }
}

/**
 * Claude API 스트리밍 호출
 * SSE 이벤트를 생성하는 AsyncGenerator 반환
 */
export async function* streamClaude(
  systemPrompt: string,
  userPrompt: string,
  options: ClaudeOptions = {}
): AsyncGenerator<{ type: string; data: string }, void, unknown> {
  const {
    model = 'claude-sonnet-4-20250514',
    temperature = 0.7,
    maxTokens = 2000,
  } = options

  const stream = await anthropic.messages.stream({
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta') {
      const delta = event.delta
      if ('text' in delta) {
        yield { type: 'text', data: delta.text }
      }
    } else if (event.type === 'message_stop') {
      yield { type: 'done', data: '' }
    }
  }
}

/**
 * SSE Response 생성 헬퍼
 */
export function createSSEResponse(
  generator: AsyncGenerator<{ type: string; data: string }, void, unknown>
): Response {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of generator) {
          const data = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
          controller.enqueue(encoder.encode(data))
        }
      } catch (error) {
        let errorMessage = 'Unknown error'
        if (error instanceof Error) {
          errorMessage = error.message
        } else if (typeof error === 'string') {
          errorMessage = error
        } else if (error && typeof error === 'object') {
          errorMessage = JSON.stringify(error)
        }
        console.error('[SSE Generator Error]', error)
        const errorData = `event: error\ndata: ${JSON.stringify(errorMessage)}\n\n`
        controller.enqueue(encoder.encode(errorData))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
