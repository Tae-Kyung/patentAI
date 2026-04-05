import { NextRequest } from 'next/server'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createServiceClient } from '@/lib/supabase/service'
import { handleApiError, paginatedResponse } from '@/lib/utils/api-response'
import { parsePagination } from '@/lib/security/pagination'
import type { PayoutStatus } from '@/types/database'

// GET: 수당 목록
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { institutionId } = await requireInstitutionAccess(searchParams.get('institution_id'))
    const { page, limit } = parsePagination(searchParams)
    const status = searchParams.get('status')
    const offset = (page - 1) * limit

    const supabase = createServiceClient()

    let countQuery = supabase
      .from('bi_mentor_payouts')
      .select('*', { count: 'exact', head: true })
      .eq('institution_id', institutionId)

    if (status === 'approved') {
      countQuery = countQuery.in('status', ['approved', 'processing', 'paid'])
    } else if (status) {
      countQuery = countQuery.eq('status', status as PayoutStatus)
    }

    const { count } = await countQuery

    let dataQuery = supabase
      .from('bi_mentor_payouts')
      .select('*')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status === 'approved') {
      dataQuery = dataQuery.in('status', ['approved', 'processing', 'paid'])
    } else if (status) {
      dataQuery = dataQuery.eq('status', status as PayoutStatus)
    }

    const { data, error } = await dataQuery

    if (error) {
      console.error('Payouts query error:', error.message)
    }

    // Fetch mentor info separately (FK join not supported by generated types)
    const payouts = data || []
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

    const enriched = payouts.map((p) => ({
      ...p,
      mentor: mentorMap[p.mentor_id] || null,
    }))

    return paginatedResponse(enriched, count || 0, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}
