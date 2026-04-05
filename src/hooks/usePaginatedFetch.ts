'use client'

import { useState, useEffect, useCallback } from 'react'

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface UsePaginatedFetchOptions {
  /** API endpoint URL (without query params) */
  url: string
  /** Items per page */
  limit?: number
  /** Additional query parameters (filters, search, etc.) */
  params?: Record<string, string>
  /** Path to items array in response data (e.g. 'items', 'users') */
  dataKey?: string
  /** Path to pagination object in response data */
  paginationKey?: string
  /** Whether to fetch immediately on mount */
  enabled?: boolean
}

interface UsePaginatedFetchResult<T> {
  data: T[]
  pagination: PaginationInfo | null
  isLoading: boolean
  currentPage: number
  setCurrentPage: (page: number) => void
  refetch: () => void
}

export function usePaginatedFetch<T = unknown>({
  url,
  limit = 10,
  params = {},
  dataKey = 'items',
  paginationKey = 'pagination',
  enabled = true,
}: UsePaginatedFetchOptions): UsePaginatedFetchResult<T> {
  const [data, setData] = useState<T[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  // Reset page when filters change
  const paramsKey = JSON.stringify(params)
  useEffect(() => {
    setCurrentPage(1)
  }, [paramsKey])

  const fetchData = useCallback(async () => {
    if (!enabled) return
    setIsLoading(true)
    try {
      const searchParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        ...params,
      })

      const response = await fetch(`${url}?${searchParams}`)
      const result = await response.json()

      if (result.success) {
        const responseData = result.data
        // Support nested data keys (e.g. 'users') or direct array
        setData(dataKey ? (responseData[dataKey] ?? responseData) : responseData)
        // Support both { pagination: {...} } and flat { totalPages } patterns
        const paginationData = responseData[paginationKey] ?? null
        if (paginationData) {
          setPagination(paginationData)
        } else if (responseData.totalPages != null) {
          setPagination({
            page: currentPage,
            limit,
            total: responseData.total ?? 0,
            totalPages: responseData.totalPages,
          })
        } else {
          setPagination(null)
        }
      }
    } catch {
      // Error handled by caller via empty data
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, currentPage, limit, paramsKey, enabled])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    pagination,
    isLoading,
    currentPage,
    setCurrentPage,
    refetch: fetchData,
  }
}
