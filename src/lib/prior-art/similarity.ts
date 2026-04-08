import Anthropic from '@anthropic-ai/sdk'
import { searchKipris, type KiprisPatent } from './kipris'
import { searchUsptoPatents, type UsptoPatent } from './uspto'
import type { PriorArtRisk } from '@/types/database'

export interface SimilarityResult {
  source_db: 'kipris' | 'uspto'
  patent_number: string
  title: string
  abstract: string
  similarity_score: number
  risk_level: PriorArtRisk
  conflicting_keywords: string[]
}

interface PatentForAnalysis {
  source: 'kipris' | 'uspto'
  patent_number: string
  title: string
  abstract: string
}

async function scoreWithClaude(
  inventionSummary: string,
  patents: PatentForAnalysis[],
): Promise<SimilarityResult[]> {
  if (patents.length === 0) return []

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `다음 발명과 선행기술 특허들의 유사도를 분석해주세요.

## 발명 요약
${inventionSummary}

## 선행기술 특허 목록
${patents.map((p, i) => `[${i}] ${p.source.toUpperCase()} ${p.patent_number}\n제목: ${p.title}\n초록: ${p.abstract?.slice(0, 300) ?? '없음'}`).join('\n\n')}

각 특허에 대해 JSON 배열로 응답하세요:
[
  {
    "index": 0,
    "similarity_score": 0.0~1.0,
    "risk_level": "high"|"medium"|"low",
    "conflicting_keywords": ["키워드1", "키워드2"]
  }
]

similarity_score 기준:
- 0.7 이상: high (핵심 구성요소 직접 충돌)
- 0.4~0.7: medium (부분 유사)
- 0.4 미만: low (간접 유사)`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  type ScoreItem = {
    index: number
    similarity_score: number
    risk_level: PriorArtRisk
    conflicting_keywords?: string[]
  }
  const scores: ScoreItem[] = JSON.parse(jsonMatch[0])

  return scores.map((s) => {
    const p = patents[s.index]
    return {
      source_db: p.source,
      patent_number: p.patent_number,
      title: p.title,
      abstract: p.abstract,
      similarity_score: Math.round(s.similarity_score * 100) / 100,
      risk_level: s.risk_level,
      conflicting_keywords: s.conflicting_keywords ?? [],
    }
  })
}

export async function analyzeSimilarity(
  keywords: string[],
  ipcCodes: string[],
  inventionSummary: string,
): Promise<SimilarityResult[]> {
  // KIPRIS + USPTO 동시 검색 (실패해도 계속)
  const [kiprisResults, usptoResults] = await Promise.all([
    searchKipris(keywords, ipcCodes).catch(() => [] as KiprisPatent[]),
    searchUsptoPatents(keywords).catch(() => [] as UsptoPatent[]),
  ])

  const patents: PatentForAnalysis[] = [
    ...kiprisResults.map((p) => ({
      source: 'kipris' as const,
      patent_number: p.patentNumber,
      title: p.title,
      abstract: p.abstract,
    })),
    ...usptoResults.map((p) => ({
      source: 'uspto' as const,
      patent_number: p.patentNumber,
      title: p.title,
      abstract: p.abstract,
    })),
  ].filter((p) => p.patent_number && p.title)

  if (patents.length === 0) return []

  // Claude로 유사도 분석
  return scoreWithClaude(inventionSummary, patents).catch((err) => {
    console.warn('[similarity] Claude scoring failed:', err)
    // 폴백: 기본 점수로 반환
    return patents.map((p) => ({
      source_db: p.source,
      patent_number: p.patent_number,
      title: p.title,
      abstract: p.abstract,
      similarity_score: 0.3,
      risk_level: 'low' as PriorArtRisk,
      conflicting_keywords: [],
    }))
  })
}
