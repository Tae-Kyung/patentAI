import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { successResponse, handleApiError } from '@/lib/utils/api-response'
import { getPromptVersions } from '@/lib/prompts/version-manager'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET: 프롬프트 버전 이력 조회
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireAdmin()

    const { id } = await context.params
    const versions = await getPromptVersions(id)

    return successResponse(versions)
  } catch (error) {
    return handleApiError(error)
  }
}
