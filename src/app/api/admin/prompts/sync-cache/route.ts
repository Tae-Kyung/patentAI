import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { successResponse, handleApiError } from '@/lib/utils/api-response'
import { invalidateAllPromptCache } from '@/lib/prompts/prompt-engine'

// POST: 모든 프롬프트 캐시 무효화
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    await invalidateAllPromptCache()

    return successResponse({
      message: '모든 프롬프트 캐시가 무효화되었습니다.',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return handleApiError(error)
  }
}
