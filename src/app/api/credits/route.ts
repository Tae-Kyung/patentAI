import { requireAuth } from '@/lib/auth/guards'
import { getCredits } from '@/lib/credits'
import { createClient } from '@/lib/supabase/server'
import { successResponse, handleApiError } from '@/lib/utils/api-response'

// GET: 현재 사용자의 크레딧 잔액 조회
export async function GET() {
  try {
    const user = await requireAuth()
    const credits = await getCredits(user.id)

    // 최근 사용 내역 (최근 10건)
    const supabase = await createClient()
    const { data: logs } = await supabase
      .from('bi_credit_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    return successResponse({
      credits,
      recentLogs: logs || [],
    })
  } catch (error) {
    return handleApiError(error)
  }
}
