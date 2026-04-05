import { Redis } from '@upstash/redis'

// Upstash Redis 클라이언트
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// 캐시 키 프리픽스
export const CACHE_KEYS = {
  PROMPT: 'prompt:',
  PROMPT_LIST: 'prompts:list',
} as const

// 캐시 TTL (초)
export const CACHE_TTL = {
  PROMPT: 60 * 60, // 1시간
  PROMPT_LIST: 60 * 5, // 5분
} as const
