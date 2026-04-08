import { requireAuth } from '@/lib/auth/guards'
import { getCredits } from '@/lib/credits'
import { createClient } from '@/lib/supabase/server'
import { successResponse, handleApiError } from '@/lib/utils/api-response'

export async function GET() {
  try {
    const user = await requireAuth()
    const credits = await getCredits(user.id)

    const supabase = await createClient()
    const { data: logs } = await supabase
      .from('patentai_credit_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    return successResponse({ credits, recentLogs: logs || [] })
  } catch (error) {
    return handleApiError(error)
  }
}
