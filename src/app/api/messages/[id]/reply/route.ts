import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const replySchema = z.object({
  body: z.string().min(1).max(5000),
})

// POST: 답장
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: threadId } = await context.params

    const body = await request.json()
    const { body: replyBody } = replySchema.parse(body)

    const sanitizedBody = replyBody.replace(/<[^>]*>/g, '')

    const supabase = createServiceClient()

    // 원본 메시지에서 수신자 결정
    const { data: original } = await supabase
      .from('bi_messages')
      .select('sender_id, recipient_id, subject, project_id')
      .eq('id', threadId)
      .single()

    if (!original) {
      return errorResponse('원본 메시지를 찾을 수 없습니다.', 404)
    }

    const recipientId = original.sender_id === user.id ? original.recipient_id : original.sender_id

    const { data, error } = await supabase
      .from('bi_messages')
      .insert({
        sender_id: user.id,
        recipient_id: recipientId,
        subject: `Re: ${original.subject}`,
        content: sanitizedBody,
        thread_id: threadId,
        project_id: original.project_id,
      })
      .select()
      .single()

    if (error) {
      console.error('Reply error:', error.message)
      return errorResponse('답장 발송에 실패했습니다.', 500)
    }

    return successResponse(data, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
