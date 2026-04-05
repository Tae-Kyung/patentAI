import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError, paginatedResponse } from '@/lib/utils/api-response'
import { parsePagination } from '@/lib/security/pagination'
import type { ProgramStatus } from '@/types/database'

const createProgramSchema = z.object({
  name: z.string().min(1).max(200),
  year: z.number().int().min(2020).max(2030),
  round: z.number().int().min(1).default(1),
  description: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
})

// GET: 프로그램 목록
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const { page, limit } = parsePagination(searchParams)
    const status = searchParams.get('status')
    const offset = (page - 1) * limit

    const supabase = await createClient()

    let countQuery = supabase
      .from('bi_programs')
      .select('*', { count: 'exact', head: true })

    if (status) countQuery = countQuery.eq('status', status as ProgramStatus)

    const { count } = await countQuery

    let dataQuery = supabase
      .from('bi_programs')
      .select('*')
      .order('year', { ascending: false })
      .order('round', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) dataQuery = dataQuery.eq('status', status as ProgramStatus)

    const { data, error } = await dataQuery

    if (error) {
      console.error('Programs query error:', error.message)
      return errorResponse('프로그램 목록을 불러오는데 실패했습니다.', 500)
    }

    const programs = data || []
    const programIds = programs.map((p) => p.id)

    // 프로그램별 통계 조회 (병렬)
    // 프로젝트-프로그램 연결은 bi_project_institution_maps를 통해 이루어짐
    // 멘토 매칭은 프로젝트를 경유하여 프로그램에 연결
    if (programIds.length > 0) {
      const [mapsRes, institutionsRes] = await Promise.all([
        supabase.from('bi_project_institution_maps').select('project_id, institution_id, program_id').in('program_id', programIds),
        supabase.from('bi_project_institution_maps').select('program_id, institution_id').in('program_id', programIds),
      ])

      // 프로그램별 프로젝트 ID 맵
      const programProjectMap: Record<string, Set<string>> = {}
      for (const id of programIds) {
        programProjectMap[id] = new Set(
          (mapsRes.data || []).filter((m) => m.program_id === id).map((m) => m.project_id)
        )
      }

      // 모든 프로젝트 ID 수집 → 멘토 매칭 조회
      const allProjectIds = [...new Set((mapsRes.data || []).map((m) => m.project_id))]
      const [matchesRes] = allProjectIds.length > 0
        ? await Promise.all([
            supabase.from('bi_mentor_matches').select('id, project_id, mentor_id').in('project_id', allProjectIds),
          ])
        : [{ data: [] as { id: string; project_id: string; mentor_id: string }[] }]

      // 멘토링 세션 조회
      const matchIds = (matchesRes.data || []).map((m) => m.id)
      const sessionsRes = matchIds.length > 0
        ? await supabase.from('bi_mentoring_sessions').select('match_id').in('match_id', matchIds)
        : { data: [] as { match_id: string }[] }

      const statsMap: Record<string, { projectCount: number; mentorCount: number; institutionCount: number; sessionCount: number }> = {}
      for (const id of programIds) {
        const projectIds = programProjectMap[id]
        const projectCount = projectIds.size
        const mentorCount = new Set(
          (matchesRes.data || []).filter((m) => projectIds.has(m.project_id)).map((m) => m.mentor_id)
        ).size
        const institutionCount = new Set(
          (institutionsRes.data || []).filter((i) => i.program_id === id).map((i) => i.institution_id)
        ).size
        const programMatchIds = new Set(
          (matchesRes.data || []).filter((m) => projectIds.has(m.project_id)).map((m) => m.id)
        )
        const sessionCount = (sessionsRes.data || []).filter((s) => programMatchIds.has(s.match_id)).length
        statsMap[id] = { projectCount, mentorCount, institutionCount, sessionCount }
      }

      const programsWithStats = programs.map((p) => ({
        ...p,
        stats: statsMap[p.id] || { projectCount: 0, mentorCount: 0, institutionCount: 0, sessionCount: 0 },
      }))

      return paginatedResponse(programsWithStats, count || 0, page, limit)
    }

    const programsWithStats = programs.map((p) => ({
      ...p,
      stats: { projectCount: 0, mentorCount: 0, institutionCount: 0, sessionCount: 0 },
    }))

    return paginatedResponse(programsWithStats, count || 0, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST: 프로그램 생성
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const validatedData = createProgramSchema.parse(body)

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('bi_programs')
      .insert(validatedData)
      .select()
      .single()

    if (error) {
      console.error('Program insert error:', error.message)
      return errorResponse('프로그램 생성에 실패했습니다.', 500)
    }

    return successResponse(data, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
