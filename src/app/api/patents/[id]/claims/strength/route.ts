import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

// 금지/주의 표현 목록 (한국 특허청 기준)
const FORBIDDEN_PATTERNS = [
  { pattern: /최선|최고|최적|최상|가장\s*좋|가장\s*우수/g, msg: '상대적 우위 표현 금지 (최선, 최고 등)' },
  { pattern: /약\s+\d|대략|거의|어느\s*정도/g, msg: '불명확한 수량 표현 (약, 대략 등)' },
  { pattern: /다수의|여러|몇\s*개의|복수\s*개의/g, msg: '불명확한 수량 표현 (다수의, 여러 등) — 구체적 수 명시 권장' },
  { pattern: /필요에\s*따라|경우에\s*따라|상황에\s*따라/g, msg: '조건부 표현으로 권리 범위 불명확' },
  { pattern: /등|기타|유사한/g, msg: '"등" 표현으로 권리 범위 불명확' },
]

// 독립항 말미 패턴: "~특징으로 하는 ~."
const INDEPENDENT_ENDING_PATTERN = /특징으로\s*하는\s+.+[.。]$/

interface StrengthIssue {
  type: 'forbidden' | 'format' | 'ref_number'
  message: string
  position?: number
}

function analyzeClaimStrength(content: string, isIndependent: boolean): {
  score: number
  issues: StrengthIssue[]
} {
  const issues: StrengthIssue[] = []

  // 1. 금지 표현 탐지
  for (const { pattern, msg } of FORBIDDEN_PATTERNS) {
    pattern.lastIndex = 0
    const match = pattern.exec(content)
    if (match) {
      issues.push({ type: 'forbidden', message: msg, position: match.index })
    }
  }

  // 2. 독립항 말미 형식 확인
  if (isIndependent && !INDEPENDENT_ENDING_PATTERN.test(content.trim())) {
    issues.push({
      type: 'format',
      message: '독립항 말미는 "~특징으로 하는 [발명의 명칭]." 형식이어야 합니다.',
    })
  }

  // 3. 참조번호 누락 확인 (숫자+괄호 패턴이 없는 경우)
  const hasRefNumbers = /\(\d+\)|\d{2,3}번/.test(content)
  if (!hasRefNumbers && content.length > 100) {
    issues.push({
      type: 'ref_number',
      message: '구성요소 참조번호 누락 — 청구항 내 구성요소에 참조번호(100)를 표기하세요.',
    })
  }

  // 점수 산출: 만점 5점에서 이슈당 -1 (최소 1점)
  const score = Math.max(1, 5 - issues.length)

  return { score, issues }
}

// POST: 전체 청구항 강도 분석 및 저장
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await requireAuth()
    const supabase = await createClient()

    const { data: project } = await supabase
      .from('patentai_patent_projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return errorResponse('프로젝트를 찾을 수 없습니다.', 404)

    const { data: claims, error } = await supabase
      .from('patentai_patent_claims')
      .select('id, claim_type, content')
      .eq('project_id', id)

    if (error || !claims) return errorResponse('청구항 조회 실패', 500)
    if (claims.length === 0) return errorResponse('분석할 청구항이 없습니다.', 400)

    const results = []
    for (const claim of claims) {
      const { score, issues } = analyzeClaimStrength(
        claim.content,
        claim.claim_type === 'independent',
      )

      await supabase
        .from('patentai_patent_claims')
        .update({ strength_score: score, strength_issues: issues as unknown as import('@/types/database').Json })
        .eq('id', claim.id)

      results.push({ id: claim.id, score, issueCount: issues.length })
    }

    const avgScore = results.reduce((s, r) => s + r.score, 0) / results.length
    const totalIssues = results.reduce((s, r) => s + r.issueCount, 0)

    return successResponse({ analyzed: results.length, avgScore, totalIssues, results })
  } catch (error) {
    return handleApiError(error)
  }
}
