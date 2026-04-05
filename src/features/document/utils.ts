/**
 * 기존 JSON 형식 피치를 마크다운으로 변환하는 헬퍼
 */
export function formatPitchContent(content: string): string {
  try {
    const parsed = JSON.parse(content)
    if (typeof parsed !== 'object' || parsed === null) return content

    const lines: string[] = ['# 요약 피치', '']
    if (parsed.oneLiner) lines.push('## 한 줄 요약 (One-Liner)', '', parsed.oneLiner, '')
    if (parsed.hook) lines.push('## 훅 (Hook)', '', parsed.hook, '')
    if (parsed.pitch30s) lines.push('## 30초 피치', '', parsed.pitch30s, '')
    if (parsed.pitch2m) lines.push('## 2분 피치', '', parsed.pitch2m, '')
    if (Array.isArray(parsed.keyMessages) && parsed.keyMessages.length > 0) {
      lines.push('## 핵심 메시지', '')
      parsed.keyMessages.forEach((msg: string) => lines.push(`- ${msg}`))
      lines.push('')
    }
    return lines.join('\n')
  } catch {
    return content
  }
}

/**
 * 문서에서 섹션 목록 추출 (## 로 시작하는 헤더)
 */
export function extractSections(content: string | null, docType?: string): string[] {
  if (!content) return []
  const normalized = docType === 'pitch' ? formatPitchContent(content) : content
  const matches = normalized.match(/^##\s+(.+)$/gm)
  return matches ? matches.map(m => m.replace(/^##\s+/, '').trim()) : []
}
