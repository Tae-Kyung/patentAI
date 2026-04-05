// API 응답 타입
export interface SuccessResponse<T> {
  success: true
  data: T
}

export interface ErrorResponse {
  success: false
  error: string
  code?: string
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse

// 페이지네이션 응답
export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  success: true
  data: PaginatedData<T>
}

// SSE 이벤트
export interface SSEEvent {
  phase: 'prepare' | 'processing' | 'saving' | 'done' | 'error'
  message: string
  progress: number // 0-100
  data?: unknown
}

// 페이지네이션 파라미터
export interface PaginationParams {
  page?: number
  limit?: number
}

// 필터 파라미터
export interface ProjectFilterParams extends PaginationParams {
  status?: string
  stage?: string
}
