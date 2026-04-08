import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const approveSchema = z.object({
  notes: z.string().max(500).optional(),
})

// POST: GATE 3 승인
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await requireAuth()
    const supabase = await createClient()

    const { data: project } = await supabase
      .from('patentai_patent_projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return errorResponse('프로젝트를 찾을 수 없습니다.', 404)

    // GATE 2 통과 확인
    const { data: gate2 } = await supabase
      .from('patentai_patent_gates')
      .select('status')
      .eq('project_id', id)
      .eq('gate_number', 2)
      .single()

    if (!gate2 || gate2.status !== 'approved') {
      return errorResponse('GATE 2 승인이 필요합니다.', 400)
    }

    // 청구항 존재 여부 확인
    const { count } = await supabase
      .from('patentai_patent_claims')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', id)

    if (!count || count === 0) {
      return errorResponse('청구항이 없습니다. STEP 3에서 청구항을 먼저 작성해주세요.', 400)
    }

    const body = await request.json().catch(() => ({}))
    const parsed = approveSchema.safeParse(body)
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400)

    // 청구항 전체 확정
    await supabase
      .from('patentai_patent_claims')
      .update({ is_confirmed: true })
      .eq('project_id', id)

    // GATE 3 upsert
    const { error: gateError } = await supabase
      .from('patentai_patent_gates')
      .upsert(
        {
          project_id: id,
          gate_number: 3,
          status: 'approved',
          approved_by: user.id,
          notes: parsed.data.notes ?? null,
          approved_at: new Date().toISOString(),
        },
        { onConflict: 'project_id,gate_number' },
      )

    if (gateError) return errorResponse('GATE 3 승인 처리 실패', 500)

    // 프로젝트 상태 업데이트
    await supabase
      .from('patentai_patent_projects')
      .update({ status: 'step3_done' })
      .eq('id', id)

    return successResponse({ approved: true, gate: 3 })
  } catch (error) {
    return handleApiError(error)
  }
}

// GET: GATE 3 상태 조회
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await requireAuth()
    const supabase = await createClient()

    const { data: project } = await supabase
      .from('patentai_patent_projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return errorResponse('프로젝트를 찾을 수 없습니다.', 404)

    const { data: gate } = await supabase
      .from('patentai_patent_gates')
      .select('*')
      .eq('project_id', id)
      .eq('gate_number', 3)
      .single()

    const { count } = await supabase
      .from('patentai_patent_claims')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', id)

    return successResponse({ gate: gate ?? null, claimCount: count ?? 0 })
  } catch (error) {
    return handleApiError(error)
  }
}
