'use client'

import { useEffect, useState } from 'react'

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

interface UseCountUpOptions {
  end: number
  duration?: number
  start?: number
  enabled?: boolean
  suffix?: string
}

export function useCountUp({
  end,
  duration = 1500,
  start = 0,
  enabled = true,
  suffix = '',
}: UseCountUpOptions) {
  const [value, setValue] = useState(start)

  useEffect(() => {
    if (!enabled) {
      setValue(start)
      return
    }

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setValue(end)
      return
    }

    let startTime: number | null = null
    let animationFrame: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutExpo(progress)
      const current = Math.round(start + (end - start) * easedProgress)

      setValue(current)

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [end, duration, start, enabled])

  return `${value}${suffix}`
}
