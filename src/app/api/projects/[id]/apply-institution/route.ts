import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ id: string }>
}

const applySchema = z.object({
  institution_id: z.string().uuid('유효하지 않은 기관 ID입니다.'),
  program_id: z.string().uuid('유효하지 않은 프로그램 ID입니다.').optional(),
  motivation: z.string().min(1, '지원 동기를 입력해주세요.').max(1000, '지원 동기는 1000자 이내로 입력해주세요.'),
})

// POST: 기관 프로그램에 프로젝트 지원
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireAuth()

    const supabase = await createClient()

    // 프로젝트 소유자 확인
    const { data: project, error: projectError } = await supabase
      .from('bi_projects')
      .select('user_id')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return errorResponse('프로젝트를 찾을 수 없습니다.', 404)
    }

    if (project.user_id !== user.id) {
      return errorResponse('프로젝트에 대한 접근 권한이 없습니다.', 403)
    }

    const body = await request.json()
    const { institution_id, program_id, motivation } = applySchema.parse(body)

    // 기관 존재 및 승인 여부 확인
    const { data: institution, error: instError } = await supabase
      .from('bi_institutions')
      .select('id, name, is_approved')
      .eq('id', institution_id)
      .single()

    if (instError || !institution) {
      return errorResponse('기관을 찾을 수 없습니다.', 404)
    }

    if (!institution.is_approved) {
      return errorResponse('승인되지 않은 기관에는 지원할 수 없습니다.', 400)
    }

    // 다른 기관에 이미 매핑(지원/승인)된 프로젝트인지 확인
    const { data: otherMapping, error: otherError } = await supabase
      .from('bi_project_institution_maps')
      .select('id, institution_id, status')
      .eq('project_id', id)
      .in('status', ['pending', 'approved'])

    if (otherError) throw otherError

    if (otherMapping && otherMapping.length > 0) {
      const sameInstitution = otherMapping.some((m) => m.institution_id === institution_id)
      if (sameInstitution) {
        return errorResponse('이미 해당 기관에 지원 중이거나 승인된 상태입니다.', 400)
      }
      return errorResponse('이미 다른 기관에 지원 중이거나 승인된 프로젝트입니다. 하나의 프로젝트는 하나의 기관에만 지원할 수 있습니다.', 400)
    }

    // 기관 프로그램 매핑 생성
    const { data: mapping, error: insertError } = await supabase
      .from('bi_project_institution_maps')
      .insert({
        project_id: id,
        institution_id,
        program_id: program_id || null,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) throw insertError

    return successResponse({
      message: '기관 지원이 완료되었습니다.',
      mapping,
    }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || '유효성 검사 오류', 400)
    }
    return handleApiError(error)
  }
}

// GET: 프로젝트의 기관 지원 현황 조회
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireAuth()

    const supabase = await createClient()

    // 프로젝트 소유자 확인
    const { data: project, error: projectError } = await supabase
      .from('bi_projects')
      .select('user_id')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return errorResponse('프로젝트를 찾을 수 없습니다.', 404)
    }

    if (project.user_id !== user.id && user.role !== 'admin') {
      return errorResponse('프로젝트에 대한 접근 권한이 없습니다.', 403)
    }

    // 프로젝트의 기관 매핑 목록 조회
    const { data: mappings, error: mappingError } = await supabase
      .from('bi_project_institution_maps')
      .select('id, project_id, institution_id, program_id, status, created_at')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    if (mappingError) throw mappingError

    if (!mappings || mappings.length === 0) {
      return successResponse([])
    }

    // 기관/프로그램 병렬 조회
    const institutionIds = [...new Set(mappings.map((m) => m.institution_id))]
    const programIds = mappings
      .map((m) => m.program_id)
      .filter((pid): pid is string => pid !== null)

    const [{ data: institutions, error: instError }, programResult] = await Promise.all([
      supabase.from('bi_institutions').select('id, name, region, type').in('id', institutionIds),
      programIds.length > 0
        ? supabase.from('bi_programs').select('id, name').in('id', programIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
    ])

    if (instError) throw instError
    if (programResult.error) throw programResult.error
    const programs = programResult.data || []

    // 매핑에 기관/프로그램 이름 병합
    const enrichedMappings = mappings.map((mapping) => {
      const inst = institutions?.find((i) => i.id === mapping.institution_id)
      const prog = programs.find((p) => p.id === mapping.program_id)

      return {
        ...mapping,
        institution_name: inst?.name || null,
        institution_region: inst?.region || null,
        institution_type: inst?.type || null,
        program_name: prog?.name || null,
      }
    })

    return successResponse(enrichedMappings)
  } catch (error) {
    return handleApiError(error)
  }
}
