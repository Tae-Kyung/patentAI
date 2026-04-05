import { NextRequest } from 'next/server'
import { requireAuth, requireMessageAccess } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

// GET: 메시지 상세 (쓰레드 포함)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    await requireMessageAccess(id)

    const supabase = createServiceClient()

    // 원본 메시지
    const { data: message } = await supabase
      .from('bi_messages')
      .select('*, sender:sender_id(id, name, email), recipient:recipient_id(id, name, email)')
      .eq('id', id)
      .single()

    // 쓰레드 (답장들)
    const { data: replies } = await supabase
      .from('bi_messages')
      .select('*, sender:sender_id(id, name, email)')
      .eq('thread_id', id)
      .order('created_at', { ascending: true })

    return successResponse({
      ...message,
      replies: replies || [],
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE: 메시지 삭제 (수신자만 삭제 가능)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const user = await requireAuth()

    const supabase = createServiceClient()

    // 메시지 조회 및 수신자 확인
    const { data: message, error: fetchError } = await supabase
      .from('bi_messages')
      .select('id, recipient_id')
      .eq('id', id)
      .single()

    if (fetchError || !message) {
      return errorResponse('메시지를 찾을 수 없습니다.', 404)
    }

    if (message.recipient_id !== user.id) {
      return errorResponse('메시지를 삭제할 권한이 없습니다.', 403)
    }

    // 답장(thread) 삭제 후 원본 삭제
    await supabase
      .from('bi_messages')
      .delete()
      .eq('thread_id', id)

    const { error: deleteError } = await supabase
      .from('bi_messages')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Message delete error:', deleteError.message)
      return errorResponse('메시지 삭제에 실패했습니다.', 500)
    }

    return successResponse({ message: '메시지가 삭제되었습니다.' })
  } catch (error) {
    return handleApiError(error)
  }
}
