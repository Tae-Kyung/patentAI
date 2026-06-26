/**
 * AI 모델 설정 관리
 * DB(patentai_ai_settings)에서 관리자가 설정한 모델을 읽어옴
 * 인메모리 캐시(5분 TTL)로 DB 조회 최소화
 */

import { createServiceClient } from '@/lib/supabase/service'

export interface AIModelSetting {
  key: string
  value: string
  label: string
  description: string | null
  updated_at: string
  updated_by: string | null
}

// 기본값 (DB 조회 실패 시 폴백)
const DEFAULTS: Record<string, string> = {
  'claude.default': 'claude-sonnet-4-6',
  'gemini.default': 'gemini-2.5-flash',
  'gemini.image': 'gemini-2.5-flash-image',
  'openai.default': 'gpt-4o',
}

// 인메모리 캐시
let cache: Record<string, string> | null = null
let cacheExpiry = 0
const CACHE_TTL = 5 * 60 * 1000 // 5분

async function loadSettings(): Promise<Record<string, string>> {
  const now = Date.now()
  if (cache && now < cacheExpiry) return cache

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('patentai_ai_settings')
      .select('key, value')

    if (error || !data) {
      console.error('[model-settings] DB load failed:', error?.message)
      return { ...DEFAULTS }
    }

    const settings: Record<string, string> = { ...DEFAULTS }
    for (const row of data) {
      settings[row.key] = row.value
    }

    cache = settings
    cacheExpiry = now + CACHE_TTL
    return settings
  } catch (err) {
    console.error('[model-settings] loadSettings error:', err)
    return { ...DEFAULTS }
  }
}

/** 캐시 무효화 (설정 변경 후 호출) */
export function invalidateModelSettingsCache(): void {
  cache = null
  cacheExpiry = 0
}

/** 특정 키의 모델 ID 가져오기 */
export async function getModelSetting(key: string): Promise<string> {
  const settings = await loadSettings()
  return settings[key] ?? DEFAULTS[key] ?? ''
}

/** 모든 설정 가져오기 */
export async function getAllModelSettings(): Promise<Record<string, string>> {
  return loadSettings()
}

/** 편의 함수들 */
export async function getClaudeModel(): Promise<string> {
  return getModelSetting('claude.default')
}

export async function getGeminiModel(): Promise<string> {
  return getModelSetting('gemini.default')
}

export async function getGeminiImageModel(): Promise<string> {
  return getModelSetting('gemini.image')
}

export async function getOpenAIModel(): Promise<string> {
  return getModelSetting('openai.default')
}

/** 선택 가능한 모델 목록 */
export const AVAILABLE_MODELS = {
  claude: [
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', tier: 'recommended' },
    { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', tier: 'premium' },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', tier: 'fast' },
    { id: 'claude-fable-5', name: 'Claude Fable 5', tier: 'premium' },
    { id: 'claude-opus-4-7', name: 'Claude Opus 4.7', tier: 'legacy' },
    { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', tier: 'legacy' },
    { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', tier: 'legacy' },
  ],
  gemini: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tier: 'recommended' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', tier: 'premium' },
    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', tier: 'latest' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', tier: 'fast' },
  ],
  geminiImage: [
    { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image', tier: 'recommended' },
    { id: 'gemini-3-pro-image', name: 'Gemini 3 Pro Image', tier: 'premium' },
    { id: 'gemini-3.1-flash-image', name: 'Gemini 3.1 Flash Image', tier: 'latest' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', tier: 'recommended' },
    { id: 'gpt-4.1', name: 'GPT-4.1', tier: 'latest' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', tier: 'fast' },
  ],
} as const
