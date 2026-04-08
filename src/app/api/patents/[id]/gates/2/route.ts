import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const approveSchema = z.object({
  notes: z.string().max(500).optional(),
})

// POST: GATE 2 승인
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
      .select('id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return errorResponse('프로젝트를 찾을 수 없습니다.', 404)

    // GATE 1 통과 확인
    const { data: gate1 } = await supabase
      .from('patentai_patent_gates')
      .select('status')
      .eq('project_id', id)
      .eq('gate_number', 1)
      .single()

    if (!gate1 || gate1.status !== 'approved') {
      return errorResponse('GATE 1 승인이 필요합니다.', 400)
    }

    // 구성요소 존재 여부 확인
    const { count } = await supabase
      .from('patentai_patent_components')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', id)

    if (!count || count === 0) {
      return errorResponse('구성요소가 없습니다. STEP 2에서 구성요소를 먼저 추가해주세요.', 400)
    }

    const body = await request.json().catch(() => ({}))
    const parsed = approveSchema.safeParse(body)
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400)

    // GATE 2 upsert
    const { error: gateError } = await supabase
      .from('patentai_patent_gates')
      .upsert(
        {
          project_id: id,
          gate_number: 2,
          status: 'approved',
          approved_by: user.id,
          notes: parsed.data.notes ?? null,
          approved_at: new Date().toISOString(),
        },
        { onConflict: 'project_id,gate_number' },
      )

    if (gateError) return errorResponse('GATE 2 승인 처리 실패', 500)

    // 프로젝트 상태 업데이트
    await supabase
      .from('patentai_patent_projects')
      .update({ status: 'step2_done' })
      .eq('id', id)

    return successResponse({ approved: true, gate: 2 })
  } catch (error) {
    return handleApiError(error)
  }
}

// GET: GATE 2 상태 조회
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
      .eq('gate_number', 2)
      .single()

    const { count } = await supabase
      .from('patentai_patent_prior_art')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', id)

    return successResponse({
      gate: gate ?? null,
      priorArtCount: count ?? 0,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
