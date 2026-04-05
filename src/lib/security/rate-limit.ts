import { Ratelimit } from '@upstash/ratelimit'
import { redis } from '@/lib/redis'
import { errorResponse } from '@/lib/utils/api-response'
import type { NextResponse } from 'next/server'

export const rateLimiters = {
  standard: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    prefix: 'rl:standard',
  }),
  aiGeneration: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    prefix: 'rl:ai',
  }),
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '15 m'),
    prefix: 'rl:auth',
  }),
  upload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 h'),
    prefix: 'rl:upload',
  }),
  message: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'rl:msg',
  }),
  bulkMessage: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'rl:bulk',
  }),
} as const

export type RateLimiterType = keyof typeof rateLimiters

export async function checkRateLimit(
  identifier: string,
  type: RateLimiterType = 'standard'
): Promise<NextResponse | null> {
  try {
    const limiter = rateLimiters[type]
    const { success, remaining, reset } = await limiter.limit(identifier)

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000)
      return errorResponse(
        '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
        429,
        'RATE_LIMITED'
      )
    }

    return null
  } catch (error) {
    console.error('Rate limit check failed:', error)
    return null
  }
}
