import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { rollbackPrompt } from '@/lib/prompts/version-manager'

interface RouteContext {
  params: Promise<{ id: string; version: string }>
}

// POST: 특정 버전으로 롤백
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireAdmin()

    const { id, version } = await context.params
    const targetVersion = parseInt(version)

    if (isNaN(targetVersion)) {
      return errorResponse('유효하지 않은 버전 번호입니다.', 400)
    }

    const rolledBackPrompt = await rollbackPrompt(id, targetVersion, user.id)

    if (!rolledBackPrompt) {
      return errorResponse('롤백에 실패했습니다. 버전을 확인해주세요.', 400)
    }

    return successResponse(rolledBackPrompt)
  } catch (error) {
    return handleApiError(error)
  }
}
