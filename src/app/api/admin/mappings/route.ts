import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError, paginatedResponse } from '@/lib/utils/api-response'
import { parsePagination } from '@/lib/security/pagination'
import type { MappingStatus } from '@/types/database'

const createMappingSchema = z.object({
  project_id: z.string().uuid(),
  institution_id: z.string().uuid(),
  program_id: z.string().uuid(),
})

// GET: 매핑 목록
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const { page, limit } = parsePagination(searchParams)
    const institutionId = searchParams.get('institution_id')
    const programId = searchParams.get('program_id')
    const status = searchParams.get('status')
    const offset = (page - 1) * limit

    const supabase = createServiceClient()

    let countQuery = supabase
      .from('bi_project_institution_maps')
      .select('*', { count: 'exact', head: true })

    if (institutionId) countQuery = countQuery.eq('institution_id', institutionId)
    if (programId) countQuery = countQuery.eq('program_id', programId)
    if (status) countQuery = countQuery.eq('status', status as MappingStatus)

    const { count } = await countQuery

    let dataQuery = supabase
      .from('bi_project_institution_maps')
      .select(`
        *,
        project:project_id(id, name, current_stage, user_id),
        institution:institution_id(id, name, region),
        program:program_id(id, name, year, round)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (institutionId) dataQuery = dataQuery.eq('institution_id', institutionId)
    if (programId) dataQuery = dataQuery.eq('program_id', programId)
    if (status) dataQuery = dataQuery.eq('status', status as MappingStatus)

    const { data, error } = await dataQuery

    if (error) {
      console.error('Mappings query error:', error.message)
      return errorResponse('매핑 목록을 불러오는데 실패했습니다.', 500)
    }

    return paginatedResponse(data || [], count || 0, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST: 단건 매핑
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const validatedData = createMappingSchema.parse(body)

    const supabase = createServiceClient()

    // 이미 다른 기관에 매핑된 프로젝트인지 확인
    const { data: existing } = await supabase
      .from('bi_project_institution_maps')
      .select('institution_id')
      .eq('project_id', validatedData.project_id)
      .limit(1)
      .single()

    if (existing && existing.institution_id !== validatedData.institution_id) {
      return errorResponse('이미 다른 기관에 매핑된 프로젝트입니다.', 409)
    }

    const { data, error } = await supabase
      .from('bi_project_institution_maps')
      .insert(validatedData)
      .select()
      .single()

    if (error) {
      console.error('Mapping insert error:', error.message)
      if (error.code === '23505') {
        return errorResponse('이미 매핑된 프로젝트입니다.', 409)
      }
      return errorResponse('매핑에 실패했습니다.', 500)
    }

    return successResponse(data, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
