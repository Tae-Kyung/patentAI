import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError, paginatedResponse } from '@/lib/utils/api-response'
import { parsePagination } from '@/lib/security/pagination'

const createInstitutionSchema = z.object({
  name: z.string().min(1).max(200),
  region: z.string().min(1),
  type: z.enum(['center', 'university', 'other']).default('center'),
  address: z.string().nullable().optional(),
  contact_email: z.string().email().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  max_mentors: z.number().int().min(1).default(50),
  max_projects: z.number().int().min(1).default(200),
})

// GET: 기관 목록
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const { page, limit } = parsePagination(searchParams)
    const region = searchParams.get('region')
    const approved = searchParams.get('approved')
    const offset = (page - 1) * limit

    const supabase = await createClient()

    let countQuery = supabase
      .from('bi_institutions')
      .select('*', { count: 'exact', head: true })

    if (region) countQuery = countQuery.eq('region', region)
    if (approved === 'true') countQuery = countQuery.eq('is_approved', true)
    if (approved === 'false') countQuery = countQuery.eq('is_approved', false)

    const { count } = await countQuery

    let dataQuery = supabase
      .from('bi_institutions')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (region) dataQuery = dataQuery.eq('region', region)
    if (approved === 'true') dataQuery = dataQuery.eq('is_approved', true)
    if (approved === 'false') dataQuery = dataQuery.eq('is_approved', false)

    const { data, error } = await dataQuery

    if (error) {
      console.error('Institutions query error:', error.message)
      return errorResponse('기관 목록을 불러오는데 실패했습니다.', 500)
    }

    return paginatedResponse(data || [], count || 0, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST: 기관 등록
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const validatedData = createInstitutionSchema.parse(body)

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('bi_institutions')
      .insert(validatedData)
      .select()
      .single()

    if (error) {
      console.error('Institution insert error:', error.message)
      return errorResponse('기관 등록에 실패했습니다.', 500)
    }

    return successResponse(data, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
