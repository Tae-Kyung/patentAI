import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireMentor } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

// 프로필 업데이트 스키마
const updateProfileSchema = z.object({
  specialty: z.array(z.string().min(1).max(100)).max(10).optional(),
  career_summary: z.string().max(2000).optional(),
  bank_name: z.string().max(50).optional(),
  account_holder: z.string().max(50).optional(),
})

// GET: 멘토 프로필 조회
export async function GET() {
  try {
    const user = await requireMentor()
    const supabase = createServiceClient()

    const { data: profile, error } = await supabase
      .from('bi_mentor_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error || !profile) {
      return errorResponse('멘토 프로필을 찾을 수 없습니다.', 404)
    }

    return successResponse(profile)
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH: 멘토 프로필 수정
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireMentor()

    const body = await request.json()
    const validatedData = updateProfileSchema.parse(body)

    // 빈 업데이트 방지
    if (Object.keys(validatedData).length === 0) {
      return errorResponse('수정할 항목이 없습니다.', 400)
    }

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('bi_mentor_profiles')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return errorResponse('프로필 업데이트에 실패했습니다.', 500)
    }

    return successResponse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
