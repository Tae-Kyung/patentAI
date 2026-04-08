import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const FORBIDDEN_PATTERNS = [/최선|최고|최적|최상/, /대략|거의/, /다수의/, /필요에\s*따라/]

interface CheckResult {
  id: string
  label: string
  passed: boolean
  detail?: string
}

export async function GET(
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

    const [
      { data: claims },
      { data: components },
      { data: sections },
      { data: drawings },
    ] = await Promise.all([
      supabase.from('patentai_patent_claims').select('claim_number, content, claim_type').eq('project_id', id).order('claim_number'),
      supabase.from('patentai_patent_components').select('ref_number, name').eq('project_id', id),
      supabase.from('patentai_patent_sections').select('section_type, content').eq('project_id', id),
      supabase.from('patentai_patent_drawings').select('drawing_number, caption').eq('project_id', id).order('drawing_number'),
    ])

    const checks: CheckResult[] = []
    const sectionMap = new Map<string, string>((sections ?? []).map((s) => [s.section_type as string, s.content ?? '']))

    // 1. 청구항 번호 연속성
    const claimNums = (claims ?? []).map((c) => c.claim_number).sort((a, b) => a - b)
    const hasGap = claimNums.some((n, i) => i > 0 && n !== claimNums[i - 1] + 1)
    checks.push({
      id: 'claim_continuity',
      label: '청구항 번호 연속성',
      passed: !hasGap && claimNums.length > 0,
      detail: hasGap ? `번호 불연속: ${claimNums.join(', ')}` : undefined,
    })

    // 2. 모든 참조번호가 상세설명에 등장하는지
    const detailedDesc = sectionMap.get('detailed_desc') ?? ''
    const missingRefs = (components ?? []).filter((c) => !detailedDesc.includes(c.ref_number))
    checks.push({
      id: 'ref_numbers_in_desc',
      label: '구성요소 참조번호 상세설명 포함',
      passed: missingRefs.length === 0,
      detail: missingRefs.length > 0 ? `누락된 참조번호: ${missingRefs.map((c) => c.ref_number).join(', ')}` : undefined,
    })

    // 3. 도면 번호 ↔ 도면 간단 설명 일치
    const drawingDesc = sectionMap.get('drawing_desc') ?? ''
    const missingFigs = (drawings ?? []).filter((d) => !drawingDesc.includes(`${d.drawing_number}`))
    checks.push({
      id: 'drawing_desc_match',
      label: '도면 간단 설명 일치',
      passed: missingFigs.length === 0,
      detail: missingFigs.length > 0 ? `미언급 도면: FIG.${missingFigs.map((d) => d.drawing_number).join(', FIG.')}` : undefined,
    })

    // 4. 요약서 200자 이내
    const abstract = sectionMap.get('abstract') ?? ''
    checks.push({
      id: 'abstract_length',
      label: '요약서 200자 이내',
      passed: abstract.length <= 200,
      detail: abstract.length > 200 ? `현재 ${abstract.length}자 (초과: ${abstract.length - 200}자)` : undefined,
    })

    // 5. 금지 표현 감지 (전체 섹션 + 청구항)
    const allText = [
      ...Array.from(sectionMap.values()),
      ...(claims ?? []).map((c) => c.content),
    ].join('\n')
    const foundForbidden = FORBIDDEN_PATTERNS.filter((p) => p.test(allText))
    checks.push({
      id: 'forbidden_expressions',
      label: '금지 표현 없음',
      passed: foundForbidden.length === 0,
      detail: foundForbidden.length > 0 ? '최선/최고/최적/대략/다수의 등 표현 감지됨' : undefined,
    })

    // 6. 9개 섹션 완료 여부
    const requiredSections = ['title', 'tech_field', 'background', 'problem', 'solution', 'effect', 'drawing_desc', 'detailed_desc', 'abstract']
    const missingSections = requiredSections.filter((t) => !sectionMap.get(t)?.trim())
    checks.push({
      id: 'all_sections_complete',
      label: '전체 섹션 완료',
      passed: missingSections.length === 0,
      detail: missingSections.length > 0 ? `미완성: ${missingSections.join(', ')}` : undefined,
    })

    const passCount = checks.filter((c) => c.passed).length
    return successResponse({ checks, passCount, totalCount: checks.length })
  } catch (error) {
    return handleApiError(error)
  }
}
