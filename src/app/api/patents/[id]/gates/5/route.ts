import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const approveSchema = z.object({
  notes: z.string().max(500).optional(),
})

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

    // GATE 4 확인
    const { data: gate4 } = await supabase
      .from('patentai_patent_gates')
      .select('status')
      .eq('project_id', id)
      .eq('gate_number', 4)
      .single()

    if (!gate4 || gate4.status !== 'approved') {
      return errorResponse('GATE 4 승인이 필요합니다.', 400)
    }

    // 도면 최소 1개 확인
    const { count } = await supabase
      .from('patentai_patent_drawings')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', id)

    if (!count || count === 0) {
      return errorResponse('도면이 없습니다. STEP 5에서 도면을 먼저 생성해주세요.', 400)
    }

    const body = await request.json().catch(() => ({}))
    const parsed = approveSchema.safeParse(body)
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400)

    // 도면 전체 확정
    await supabase
      .from('patentai_patent_drawings')
      .update({ is_confirmed: true })
      .eq('project_id', id)

    await supabase
      .from('patentai_patent_gates')
      .upsert(
        {
          project_id: id,
          gate_number: 5,
          status: 'approved',
          approved_by: user.id,
          notes: parsed.data.notes ?? null,
          approved_at: new Date().toISOString(),
        },
        { onConflict: 'project_id,gate_number' },
      )

    await supabase
      .from('patentai_patent_projects')
      .update({ status: 'step5_done' })
      .eq('id', id)

    return successResponse({ approved: true, gate: 5 })
  } catch (error) {
    return handleApiError(error)
  }
}

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
      .eq('gate_number', 5)
      .single()

    const { data: drawings } = await supabase
      .from('patentai_patent_drawings')
      .select('drawing_number, caption, drawing_type, image_url, is_confirmed')
      .eq('project_id', id)
      .order('drawing_number', { ascending: true })

    return successResponse({ gate: gate ?? null, drawings: drawings ?? [] })
  } catch (error) {
    return handleApiError(error)
  }
}
