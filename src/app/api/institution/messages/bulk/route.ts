import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const bulkMessageSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  target: z.enum(['mentors', 'applicants', 'all']),
  project_id: z.string().uuid().nullable().optional(),
})

// POST: 일괄 발송
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { user, institutionId } = await requireInstitutionAccess(searchParams.get('institution_id'))

    const body = await request.json()
    const { subject, body: msgBody, target, project_id } = bulkMessageSchema.parse(body)

    const sanitizedBody = msgBody.replace(/<[^>]*>/g, '')

    const supabase = createServiceClient()

    // 대상 사용자 ID 수집
    let recipientIds: string[] = []

    if (target === 'mentors' || target === 'all') {
      const { data: mentors } = await supabase
        .from('bi_mentor_institution_pool')
        .select('mentor_id')
        .eq('institution_id', institutionId)
      recipientIds.push(...(mentors || []).map((m) => m.mentor_id))
    }

    if (target === 'applicants' || target === 'all') {
      const { data: mappings } = await supabase
        .from('bi_project_institution_maps')
        .select('project_id')
        .eq('institution_id', institutionId)
      const projectIds = (mappings || []).map((m) => m.project_id)
      if (projectIds.length > 0) {
        const { data: projects } = await supabase
          .from('bi_projects')
          .select('user_id')
          .in('id', projectIds)
        const userIds = (projects || []).map((p) => p.user_id).filter(Boolean)
        recipientIds.push(...userIds)
      }
    }

    // 중복 제거 + 자기 자신 제외
    recipientIds = [...new Set(recipientIds)].filter((id) => id !== user.id)

    if (recipientIds.length === 0) {
      return errorResponse('발송 대상이 없습니다.', 400)
    }

    // 메시지 일괄 생성
    const messages = recipientIds.map((recipientId) => ({
      sender_id: user.id,
      recipient_id: recipientId,
      subject,
      content: sanitizedBody,
      project_id: project_id || null,
    }))

    const { error: msgError } = await supabase
      .from('bi_messages')
      .insert(messages)

    if (msgError) {
      console.error('Bulk message error:', msgError.message)
      return errorResponse('일괄 발송에 실패했습니다.', 500)
    }

    // 일괄 발송 기록
    await supabase
      .from('bi_message_batches')
      .insert({
        sender_id: user.id,
        institution_id: institutionId,
        recipient_type: target,
        subject,
        content: sanitizedBody,
        recipient_count: recipientIds.length,
      })

    return successResponse({
      message: `${recipientIds.length}명에게 발송되었습니다.`,
      count: recipientIds.length,
    }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
