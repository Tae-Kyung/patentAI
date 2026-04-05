import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError, paginatedResponse } from '@/lib/utils/api-response'
import { parsePagination } from '@/lib/security/pagination'

const createMessageSchema = z.object({
  recipient_id: z.string().uuid(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  project_id: z.string().uuid().nullable().optional(),
})

// GET: 메시지함
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const { page, limit } = parsePagination(searchParams)
    const folder = searchParams.get('folder') || 'inbox'
    const offset = (page - 1) * limit

    const supabase = createServiceClient()

    const column = folder === 'sent' ? 'sender_id' : 'recipient_id'

    const { count } = await supabase
      .from('bi_messages')
      .select('*', { count: 'exact', head: true })
      .eq(column, user.id)
      .is('thread_id', null) // 최상위 메시지만

    const { data, error } = await supabase
      .from('bi_messages')
      .select('*, sender:sender_id(id, name, email), recipient:recipient_id(id, name, email)')
      .eq(column, user.id)
      .is('thread_id', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Messages query error:', error.message)
    }

    return paginatedResponse(data || [], count || 0, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST: 메시지 발송
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    const body = await request.json()
    const validatedData = createMessageSchema.parse(body)

    // XSS 방지: HTML 태그 제거
    const sanitizedBody = validatedData.body.replace(/<[^>]*>/g, '')

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('bi_messages')
      .insert({
        sender_id: user.id,
        recipient_id: validatedData.recipient_id,
        subject: validatedData.subject,
        content: sanitizedBody,
        project_id: validatedData.project_id || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Message send error:', error.message)
      return errorResponse('메시지 발송에 실패했습니다.', 500)
    }

    return successResponse(data, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
