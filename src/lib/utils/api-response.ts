import { NextResponse } from 'next/server'
import type { ApiResponse, PaginatedData } from '@/types/api'
import { AuthError } from '@/lib/auth/guards'
import { InsufficientCreditsError } from '@/lib/credits'

export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status })
}

export function errorResponse(
  error: string,
  status = 400,
  code?: string
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ success: false, error, code }, { status })
}

export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): NextResponse<{ success: true; data: PaginatedData<T> }> {
  return NextResponse.json({
    success: true,
    data: {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  })
}

// 에러 핸들러
export function handleApiError(error: unknown): NextResponse<ApiResponse<never>> {
  console.error('API Error:', error)

  // 인증 에러: 사용자에게 표시해도 안전한 메시지
  if (error instanceof AuthError) {
    return errorResponse(error.message, error.statusCode, 'AUTH_ERROR')
  }

  // 크레딧 부족: 사용자에게 표시해도 안전한 메시지
  if (error instanceof InsufficientCreditsError) {
    return errorResponse(error.message, 402, 'INSUFFICIENT_CREDITS')
  }

  // 내부 에러: 상세 메시지를 클라이언트에 노출하지 않음
  if (error instanceof Error) {
    console.error('Internal Error Detail:', error.message, error.stack)
    return errorResponse('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 500, 'INTERNAL_ERROR')
  }

  return errorResponse('알 수 없는 오류가 발생했습니다.', 500, 'UNKNOWN_ERROR')
}

// SSE 스트리밍용 안전한 에러 메시지 생성
export function getSafeErrorMessage(error: unknown): string {
  console.error('SSE Error:', error)
  return '처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
}
