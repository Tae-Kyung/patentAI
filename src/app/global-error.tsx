'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'sans-serif',
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
            Something went wrong
          </h1>
          <button
            onClick={reset}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '1rem',
              cursor: 'pointer',
              borderRadius: '0.375rem',
              border: '1px solid #ccc',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
