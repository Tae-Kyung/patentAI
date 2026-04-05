/**
 * 통합 AI 클라이언트
 * Claude, OpenAI, Gemini를 통합하여 사용
 */

import { callClaude, streamClaude, createSSEResponse } from './claude'
import { callOpenAI, streamOpenAI } from './openai'
import { callGemini, streamGemini } from './gemini'

export type AIProvider = 'claude' | 'openai' | 'gemini'

export interface AIOptions {
  provider?: AIProvider
  model?: string
  temperature?: number
  maxTokens?: number
  jsonMode?: boolean
}

export interface AIResponse {
  content: string
  usage: {
    inputTokens: number
    outputTokens: number
  }
  stopReason: string | null
  provider: AIProvider
}

// 기본 모델 설정
const DEFAULT_MODELS: Record<AIProvider, string> = {
  claude: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  gemini: 'gemini-2.5-flash',
}

// 환경변수에서 기본 프로바이더 결정
function getDefaultProvider(): AIProvider {
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (process.env.GOOGLE_AI_API_KEY) return 'gemini'
  if (process.env.ANTHROPIC_API_KEY) return 'claude'
  return 'openai' // 기본값
}

// 모델명에서 프로바이더 자동 감지
function detectProviderFromModel(model: string): AIProvider | null {
  if (model.startsWith('claude')) return 'claude'
  if (model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3') || model.startsWith('o4')) return 'openai'
  if (model.startsWith('gemini')) return 'gemini'
  return null
}

// 프로바이더 + 모델 결정 (모델에서 프로바이더 감지, 해당 프로바이더 불가 시 대체)
function resolveProviderAndModel(options: AIOptions): { provider: AIProvider; model: string } {
  if (options.provider) {
    return {
      provider: options.provider,
      model: options.model || DEFAULT_MODELS[options.provider],
    }
  }

  if (options.model) {
    const detected = detectProviderFromModel(options.model)
    if (detected && isProviderAvailable(detected)) {
      return { provider: detected, model: options.model }
    }
    // 감지된 프로바이더가 불가하면 기본 프로바이더 + 기본 모델 사용
    const fallback = getDefaultProvider()
    return { provider: fallback, model: DEFAULT_MODELS[fallback] }
  }

  const provider = getDefaultProvider()
  return { provider, model: DEFAULT_MODELS[provider] }
}

// API 키 존재 여부 확인
function isProviderAvailable(provider: AIProvider): boolean {
  switch (provider) {
    case 'claude':
      return !!process.env.ANTHROPIC_API_KEY
    case 'openai':
      return !!process.env.OPENAI_API_KEY
    case 'gemini':
      return !!process.env.GOOGLE_AI_API_KEY
    default:
      return false
  }
}

/**
 * 통합 AI 호출 (동기)
 */
export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  options: AIOptions = {}
): Promise<AIResponse> {
  const { provider, model } = resolveProviderAndModel(options)

  if (!isProviderAvailable(provider)) {
    throw new Error(`${provider} API key is not configured`)
  }

  const providerOptions = {
    model,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    jsonMode: options.jsonMode,
  }

  let response

  switch (provider) {
    case 'claude':
      response = await callClaude(systemPrompt, userPrompt, providerOptions)
      break
    case 'openai':
      response = await callOpenAI(systemPrompt, userPrompt, providerOptions)
      break
    case 'gemini':
      response = await callGemini(systemPrompt, userPrompt, providerOptions)
      break
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }

  return {
    ...response,
    provider,
  }
}

/**
 * 통합 AI 스트리밍 호출
 */
export async function* streamAI(
  systemPrompt: string,
  userPrompt: string,
  options: AIOptions = {}
): AsyncGenerator<{ type: string; data: string }, void, unknown> {
  const { provider, model } = resolveProviderAndModel(options)

  if (!isProviderAvailable(provider)) {
    throw new Error(`${provider} API key is not configured`)
  }

  const providerOptions = {
    model,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    jsonMode: options.jsonMode,
  }

  let generator

  switch (provider) {
    case 'claude':
      generator = streamClaude(systemPrompt, userPrompt, providerOptions)
      break
    case 'openai':
      generator = streamOpenAI(systemPrompt, userPrompt, providerOptions)
      break
    case 'gemini':
      generator = streamGemini(systemPrompt, userPrompt, providerOptions)
      break
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }

  yield* generator
}

/**
 * 사용 가능한 프로바이더 목록 반환
 */
export function getAvailableProviders(): AIProvider[] {
  const providers: AIProvider[] = []
  if (isProviderAvailable('claude')) providers.push('claude')
  if (isProviderAvailable('openai')) providers.push('openai')
  if (isProviderAvailable('gemini')) providers.push('gemini')
  return providers
}

// 기존 함수들도 re-export
export { callClaude, streamClaude, createSSEResponse } from './claude'
export { callOpenAI, streamOpenAI } from './openai'
export { callGemini, streamGemini } from './gemini'
