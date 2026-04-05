import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError, paginatedResponse } from '@/lib/utils/api-response'
import { parsePagination } from '@/lib/security/pagination'
import { createNotification } from '@/lib/notifications'
import type { MentorMatchRole } from '@/types/database'

const createMatchSchema = z.object({
  project_id: z.string().uuid(),
  mentor_id: z.string().uuid(),
  mentor_role: z.enum(['primary', 'secondary']).default('primary'),
})

// GET: 매칭 목록
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { institutionId } = await requireInstitutionAccess(searchParams.get('institution_id'))
    const { page, limit } = parsePagination(searchParams)
    const offset = (page - 1) * limit

    const supabase = createServiceClient()

    // 기관에 매핑된 프로젝트 ID
    const { data: mappings } = await supabase
      .from('bi_project_institution_maps')
      .select('project_id')
      .eq('institution_id', institutionId)

    const projectIds = (mappings || []).map((m) => m.project_id)

    if (projectIds.length === 0) {
      return paginatedResponse([], 0, page, limit)
    }

    const rawSort = searchParams.get('sort')
    const sortField = rawSort === 'project' || rawSort === 'mentor' ? rawSort : null
    const sortDir = searchParams.get('sort_dir') === 'desc' ? 'desc' : 'asc'
    const validStatuses = ['assigned', 'in_progress', 'review', 'completed', 'cancelled'] as const
    type MatchStatus = typeof validStatuses[number]
    const rawStatus = searchParams.get('status')
    const statusFilter: MatchStatus | null = validStatuses.includes(rawStatus as MatchStatus) ? rawStatus as MatchStatus : null

    // 정렬이 project/mentor인 경우 전체를 가져와서 정렬 후 페이징
    let query = supabase
      .from('bi_mentor_matches')
      .select('*')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Matches query error:', error.message)
    }

    const matches = data || []
    const mentorIds = [...new Set(matches.map((m) => m.mentor_id))]
    const matchProjectIds = [...new Set(matches.map((m) => m.project_id))]

    let mentorMap: Record<string, { id: string; name: string | null; email: string }> = {}
    let projectMap: Record<string, { id: string; name: string }> = {}

    if (mentorIds.length > 0) {
      const { data: mentors } = await supabase
        .from('bi_users')
        .select('id, name, email')
        .in('id', mentorIds)
      for (const m of mentors || []) {
        mentorMap[m.id] = m
      }
    }
    if (matchProjectIds.length > 0) {
      const { data: projects } = await supabase
        .from('bi_projects')
        .select('id, name')
        .in('id', matchProjectIds)
      for (const p of projects || []) {
        projectMap[p.id] = p
      }
    }

    let enriched = matches.map((m) => ({
      ...m,
      project: projectMap[m.project_id] || null,
      mentor: mentorMap[m.mentor_id] || null,
    }))

    // 서버 정렬
    if (sortField === 'project' || sortField === 'mentor') {
      enriched.sort((a, b) => {
        const aVal = sortField === 'project'
          ? (a.project?.name || '').toLowerCase()
          : (a.mentor?.name || a.mentor?.email || '').toLowerCase()
        const bVal = sortField === 'project'
          ? (b.project?.name || '').toLowerCase()
          : (b.mentor?.name || b.mentor?.email || '').toLowerCase()
        const cmp = aVal.localeCompare(bVal, 'ko')
        return sortDir === 'asc' ? cmp : -cmp
      })
    }

    // 수동 페이징
    const total = enriched.length
    const paged = enriched.slice(offset, offset + limit)

    return paginatedResponse(paged, total, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST: 매칭 생성
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { user, institutionId } = await requireInstitutionAccess(searchParams.get('institution_id'))

    const body = await request.json()
    const validatedData = createMatchSchema.parse(body)

    const supabase = createServiceClient()

    // 중복 매칭 방지: 같은 프로젝트에 같은 멘토가 이미 매칭되어 있는지 확인
    const { data: existingMatch } = await supabase
      .from('bi_mentor_matches')
      .select('id')
      .eq('project_id', validatedData.project_id)
      .eq('mentor_id', validatedData.mentor_id)
      .neq('status', 'cancelled')
      .limit(1)

    if (existingMatch && existingMatch.length > 0) {
      return errorResponse('이미 해당 프로젝트에 매칭된 멘토입니다.', 409)
    }

    // 기관 기본 단가 조회
    const { data: institution } = await supabase
      .from('bi_institutions')
      .select('session_unit_price')
      .eq('id', institutionId)
      .single()

    const unitPrice = institution?.session_unit_price ?? 200000

    const { data, error } = await supabase
      .from('bi_mentor_matches')
      .insert({
        project_id: validatedData.project_id,
        mentor_id: validatedData.mentor_id,
        mentor_role: validatedData.mentor_role as MentorMatchRole,
        institution_id: institutionId,
        matched_by: user.id,
        unit_price: unitPrice,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return errorResponse('이미 매칭된 조합입니다.', 409)
      }
      console.error('Match create error:', error.message)
      return errorResponse('매칭 생성에 실패했습니다.', 500)
    }

    // 프로젝트 이름 조회 후 멘토에게 알림
    const { data: project } = await supabase
      .from('bi_projects')
      .select('name')
      .eq('id', validatedData.project_id)
      .single()

    const projectName = project?.name || '프로젝트'

    await createNotification({
      userId: validatedData.mentor_id,
      type: 'match',
      title: `새로운 프로젝트가 배정되었습니다: ${projectName}`,
      link: `/projects/${validatedData.project_id}`,
    })

    return successResponse(data, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
