import { NextRequest, NextResponse } from 'next/server'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createServiceClient } from '@/lib/supabase/service'
import { handleApiError } from '@/lib/utils/api-response'

// GET: 수당 CSV 내보내기
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { institutionId } = await requireInstitutionAccess(searchParams.get('institution_id'))

    const supabase = createServiceClient()

    const { data: payoutRows } = await supabase
      .from('bi_mentor_payouts')
      .select('*')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false })

    // Fetch mentor info separately (FK join not supported by generated types)
    const payouts = payoutRows || []
    const mentorIds = [...new Set(payouts.map((p) => p.mentor_id))]
    let mentorMap: Record<string, { id: string; name: string | null; email: string }> = {}
    if (mentorIds.length > 0) {
      const { data: mentors } = await supabase
        .from('bi_users')
        .select('id, name, email')
        .in('id', mentorIds)
      for (const m of mentors || []) {
        mentorMap[m.id] = m
      }
    }

    // CSV 생성
    const headers = ['멘토명', '이메일', '금액', '세션수', '상태', '생성일', '승인일']
    const rows = payouts.map((p) => [
      mentorMap[p.mentor_id]?.name || '',
      mentorMap[p.mentor_id]?.email || '',
      p.amount,
      p.total_sessions,
      p.status,
      p.created_at,
      p.approved_at || '',
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const bom = '\uFEFF'

    return new NextResponse(bom + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="payouts_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
