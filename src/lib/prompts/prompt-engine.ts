import { redis, CACHE_KEYS, CACHE_TTL } from '@/lib/redis'
import { createServiceClient } from '@/lib/supabase/service'
import type { Prompt, PromptCategory } from '@/types/database'

export interface PreparedPrompt {
  systemPrompt: string
  userPrompt: string
  model: string
  temperature: number
  maxTokens: number
  creditCost: number
}

/**
 * 프롬프트 조회 (캐시 우선)
 */
export async function getPrompt(key: string): Promise<Prompt | null> {
  const cacheKey = `${CACHE_KEYS.PROMPT}${key}`

  // 1. 캐시에서 조회
  try {
    const cached = await redis.get<Prompt>(cacheKey)
    if (cached) {
      return cached
    }
  } catch (error) {
    console.error('Redis cache error:', error)
  }

  // 2. DB에서 조회
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('bi_prompts')
    .select('*')
    .eq('key', key)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return null
  }

  // 3. 캐시에 저장
  try {
    await redis.set(cacheKey, data, { ex: CACHE_TTL.PROMPT })
  } catch (error) {
    console.error('Redis set error:', error)
  }

  return data
}

/**
 * 템플릿 변수 치환
 * {{variable}} 형식의 변수를 치환합니다.
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] ?? match
  })
}

/**
 * 프롬프트 준비 (조회 + 변수 치환)
 */
export async function preparePrompt(
  key: string,
  variables: Record<string, string> = {}
): Promise<PreparedPrompt | null> {
  const prompt = await getPrompt(key)

  if (!prompt) {
    return null
  }

  return {
    systemPrompt: renderTemplate(prompt.system_prompt, variables),
    userPrompt: renderTemplate(prompt.user_prompt_template, variables),
    model: prompt.model,
    temperature: prompt.temperature,
    maxTokens: prompt.max_tokens,
    creditCost: prompt.credit_cost ?? 1,
  }
}

/**
 * 프롬프트의 크레딧 비용 조회 (캐시 우선)
 * 프롬프트가 없으면 기본값 1 반환
 */
export async function getPromptCreditCost(key: string): Promise<number> {
  const prompt = await getPrompt(key)
  return prompt?.credit_cost ?? 1
}

/**
 * 특정 프롬프트 캐시 무효화
 */
export async function invalidatePromptCache(key: string): Promise<void> {
  const cacheKey = `${CACHE_KEYS.PROMPT}${key}`
  try {
    await redis.del(cacheKey)
  } catch (error) {
    console.error('Redis delete error:', error)
  }
}

/**
 * 모든 프롬프트 캐시 무효화
 */
export async function invalidateAllPromptCache(): Promise<void> {
  try {
    // 패턴 기반 삭제 (Upstash는 SCAN을 지원하지 않으므로 목록 조회 후 삭제)
    const supabase = createServiceClient()
    const { data: prompts } = await supabase
      .from('bi_prompts')
      .select('key')

    if (prompts) {
      const keys = prompts.map((p) => `${CACHE_KEYS.PROMPT}${p.key}`)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    }
  } catch (error) {
    console.error('Redis invalidate all error:', error)
  }
}

/**
 * 프롬프트 목록 조회 (카테고리 필터)
 */
export async function listPrompts(category?: PromptCategory): Promise<Prompt[]> {
  const supabase = createServiceClient()

  let query = supabase
    .from('bi_prompts')
    .select('*')
    .order('category')
    .order('name')

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('List prompts error:', error)
    return []
  }

  return data || []
}
