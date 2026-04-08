'use client'

import { useState, useCallback, useRef } from 'react'

export interface SSEOptions {
  onMessage?: (data: string) => void
  onError?: (error: string) => void
  onDone?: () => void
}

export interface UseSSEResult {
  data: string
  isLoading: boolean
  error: string | null
  start: (url: string, body?: Record<string, unknown>) => Promise<void>
  stop: () => void
}

export function useSSE(options: SSEOptions = {}): UseSSEResult {
  const [data, setData] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsLoading(false)
  }, [])

  const start = useCallback(
    async (url: string, body?: Record<string, unknown>) => {
      // 이전 요청 중단
      stop()

      setData('')
      setError(null)
      setIsLoading(true)

      abortControllerRef.current = new AbortController()

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('No response body')
        }

        const decoder = new TextDecoder()
        let buffer = ''
        let currentEventType: string | null = null
        let doneReceived = false

        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEventType = line.slice(7)
            } else if (line.startsWith('data: ')) {
              const eventType = currentEventType || 'text'
              try {
                const eventData = JSON.parse(line.slice(6))

                if (eventType === 'text') {
                  setData((prev) => prev + eventData)
                  options.onMessage?.(eventData)
                } else if (eventType === 'error') {
                  setError(eventData)
                  options.onError?.(eventData)
                } else if (eventType === 'done') {
                  doneReceived = true
                  options.onDone?.()
                }
              } catch {
                // JSON 파싱 실패 무시
              }
              currentEventType = null
            }
          }
        }

        if (!doneReceived) {
          options.onDone?.()
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // 사용자가 중단한 경우
          return
        }
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        options.onError?.(errorMessage)
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    },
    [options, stop]
  )

  return {
    data,
    isLoading,
    error,
    start,
    stop,
  }
}
