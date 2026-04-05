import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const inviteSchema = z.object({
  email: z.string().optional(),
  mentor_id: z.string().uuid().optional(),
}).refine((data) => data.email || data.mentor_id, {
  message: 'email 또는 mentor_id가 필요합니다.',
})

// POST: 멘토 초대 (이메일 또는 ID로 기관 풀에 추가)
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { institutionId } = await requireInstitutionAccess(searchParams.get('institution_id'))

    const body = await request.json()
    const validated = inviteSchema.parse(body)

    const supabase = createServiceClient()

    let mentorId = validated.mentor_id

    // 이메일 또는 이름으로 초대하는 경우: 멘토 사용자 조회
    if (!mentorId && validated.email) {
      const query = validated.email.trim()
      const isEmail = query.includes('@')

      let mentor: { id: string; role: string } | null = null

      if (isEmail) {
        const { data, error } = await supabase
          .from('bi_users')
          .select('id, role')
          .eq('email', query)
          .single()
        if (!error) mentor = data
      } else {
        const { data, error } = await supabase
          .from('bi_users')
          .select('id, role')
          .eq('role', 'mentor')
          .ilike('name', query)
          .single()
        if (!error) mentor = data
      }

      if (!mentor) {
        return errorResponse('해당 사용자를 찾을 수 없습니다.', 404)
      }

      if (mentor.role !== 'mentor') {
        return errorResponse('해당 사용자는 멘토 역할이 아닙니다.', 400)
      }

      mentorId = mentor.id
    }

    const { data, error } = await supabase
      .from('bi_mentor_institution_pool')
      .insert({
        mentor_id: mentorId!,
        institution_id: institutionId,
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return errorResponse('이미 소속된 멘토입니다.', 409)
      }
      console.error('Mentor invite error:', error.message)
      return errorResponse('멘토 초대에 실패했습니다.', 500)
    }

    // 기관 이름 조회 후 멘토에게 알림 전송
    const { data: institution } = await supabase
      .from('bi_institutions')
      .select('name')
      .eq('id', institutionId)
      .single()

    const institutionName = institution?.name || '기관'

    await supabase.from('bi_notifications').insert({
      user_id: mentorId!,
      type: 'mentor_invite',
      title: `${institutionName}에서 멘토로 초대했습니다.`,
      message: `${institutionName} 기관의 멘토 풀에 등록되었습니다.`,
      link: '/dashboard',
    })

    return successResponse(data, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
