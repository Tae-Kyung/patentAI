import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { addCredits } from '@/lib/credits'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const rechargeSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().min(1).max(1000),
})

// GET: 전체 사용자 크레딧 목록 조회
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    let query = supabase
      .from('bi_users')
      .select('id, name, email, role, ai_credits, created_at')
      .order('ai_credits', { ascending: true })

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: users, error } = await query

    if (error) throw error

    return successResponse(users || [])
  } catch (error) {
    return handleApiError(error)
  }
}

// POST: 사용자에게 크레딧 충전
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()

    const body = await request.json()
    const { userId, amount } = rechargeSchema.parse(body)

    const newBalance = await addCredits(userId, amount, admin.id)

    return successResponse({
      message: `${amount} 크레딧이 충전되었습니다.`,
      userId,
      newBalance,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
