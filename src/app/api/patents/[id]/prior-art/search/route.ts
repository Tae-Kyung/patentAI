import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { analyzeSimilarity } from '@/lib/prior-art/similarity'
import type { PriorArtRisk } from '@/types/database'

// POST: 선행기술 조사 실행
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await requireAuth()
    const supabase = await createClient()

    // 프로젝트 소유자 확인
    const { data: project } = await supabase
      .from('patentai_patent_projects')
      .select('id, tech_domain, ipc_codes, core_inventions')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return errorResponse('프로젝트를 찾을 수 없습니다.', 404)

    // GATE 1 확인
    const { data: gate1 } = await supabase
      .from('patentai_patent_gates')
      .select('status')
      .eq('project_id', id)
      .eq('gate_number', 1)
      .single()

    if (!gate1 || gate1.status !== 'approved') {
      return errorResponse('GATE 1 승인이 필요합니다.', 400)
    }

    // 구성요소 키워드 수집
    const { data: components } = await supabase
      .from('patentai_patent_components')
      .select('name, description')
      .eq('project_id', id)

    const componentKeywords = (components ?? [])
      .flatMap((c) => [c.name, ...(c.description?.split(/\s+/) ?? [])])
      .filter(Boolean)

    const ipcCodes = Array.isArray(project.ipc_codes) ? (project.ipc_codes as string[]) : []
    const coreInventions = Array.isArray(project.core_inventions)
      ? (project.core_inventions as string[])
      : []

    const keywords = [
      ...(project.tech_domain ? [project.tech_domain] : []),
      ...coreInventions.slice(0, 3),
      ...componentKeywords.slice(0, 5),
    ]

    const inventionSummary = [
      `기술 분야: ${project.tech_domain ?? ''}`,
      `핵심 발명: ${coreInventions.join(', ')}`,
      `구성요소: ${(components ?? []).map((c) => c.name).join(', ')}`,
    ].join('\n')

    // 기존 선행기술 삭제 후 재검색
    await supabase.from('patentai_patent_prior_art').delete().eq('project_id', id)

    const results = await analyzeSimilarity(keywords, ipcCodes, inventionSummary)

    if (results.length === 0) {
      return successResponse({ count: 0, results: [], overallRisk: 'low' })
    }

    // DB 저장
    const insertData = results.map((r) => ({
      project_id: id,
      source_db: r.source_db,
      patent_number: r.patent_number,
      title: r.title,
      abstract: r.abstract,
      similarity_score: r.similarity_score,
      risk_level: r.risk_level,
      conflicting_component_ids: [],
    }))

    const { error: insertError } = await supabase
      .from('patentai_patent_prior_art')
      .insert(insertData)

    if (insertError) {
      console.error('[prior-art/search] insert error:', insertError)
    }

    // 구성요소 충돌 업데이트
    const highRisk = results.filter((r) => r.risk_level === 'high')
    const medRisk = results.filter((r) => r.risk_level === 'medium')

    if (components && highRisk.length > 0) {
      // 충돌 키워드가 포함된 구성요소 찾아서 표시
      const conflictKeywords = highRisk.flatMap((r) => r.conflicting_keywords)
      for (const comp of components) {
        const compText = `${comp.name} ${comp.description ?? ''}`.toLowerCase()
        const hasConflict = conflictKeywords.some((kw) => compText.includes(kw.toLowerCase()))
        if (hasConflict) {
          await supabase
            .from('patentai_patent_components')
            .update({ has_prior_art_conflict: true, conflict_risk: 'high' })
            .eq('project_id', id)
            .eq('name', comp.name)
        }
      }
    }

    // 전체 위험도 산출
    let overallRisk: PriorArtRisk = 'low'
    if (highRisk.length > 0) overallRisk = 'high'
    else if (medRisk.length > 0) overallRisk = 'medium'

    await supabase
      .from('patentai_patent_projects')
      .update({ overall_prior_art_risk: overallRisk })
      .eq('id', id)

    return successResponse({ count: results.length, results, overallRisk })
  } catch (error) {
    return handleApiError(error)
  }
}

// GET: 저장된 선행기술 조회
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
      .select('id, overall_prior_art_risk')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return errorResponse('프로젝트를 찾을 수 없습니다.', 404)

    const { data, error } = await supabase
      .from('patentai_patent_prior_art')
      .select('*')
      .eq('project_id', id)
      .order('similarity_score', { ascending: false })

    if (error) return errorResponse('선행기술 조회 실패', 500)

    return successResponse({
      results: data ?? [],
      overallRisk: project.overall_prior_art_risk ?? 'low',
    })
  } catch (error) {
    return handleApiError(error)
  }
}
