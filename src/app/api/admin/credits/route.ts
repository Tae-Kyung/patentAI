import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { addCredits } from '@/lib/credits'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const rechargeSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().min(1).max(10000),
})

// GET: 전체 사용자 크레딧 목록
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    const supabase = createServiceClient()

    // auth.users 전체 조회
    const { data: authData } = await supabase.auth.admin.listUsers()
    const authUsers = authData?.users ?? []

    // 크레딧 목록 조회
    const { data: credits, error } = await supabase
      .from('patentai_user_credits')
      .select('user_id, credits, updated_at')

    if (error) throw error

    const creditMap = Object.fromEntries(
      (credits ?? []).map(c => [c.user_id, c.credits])
    )

    const users = authUsers
      .filter(u => !search || (u.email ?? '').includes(search))
      .map(u => ({
        id: u.id,
        name: (u.user_metadata?.name as string | null) ?? null,
        email: u.email ?? '',
        role: (u.app_metadata?.role as string) ?? 'user',
        ai_credits: creditMap[u.id] ?? 0,
        created_at: u.created_at,
      }))
      .sort((a, b) => a.ai_credits - b.ai_credits)

    return successResponse(users)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST: 크레딧 충전
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()

    const body = await request.json()
    const { userId, amount } = rechargeSchema.parse(body)

    const newBalance = await addCredits(userId, amount, admin.id)

    return successResponse({ message: `${amount} 크레딧이 충전되었습니다.`, userId, newBalance })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
