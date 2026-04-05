'use client'

import { useMemo } from 'react'
import { marked } from 'marked'

interface MarkdownContentProps {
  content: string
  className?: string
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  const html = useMemo(() => {
    return marked.parse(content, { async: false }) as string
  }, [content])

  return (
    <div
      className={`markdown-preview ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
