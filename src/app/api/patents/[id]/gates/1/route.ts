import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const approveSchema = z.object({
  ipc_codes: z.array(z.string()).optional(),
  core_inventions: z.array(z.string()).optional(),
  tech_domain: z.string().optional(),
  notes: z.string().optional(),
})

// POST: GATE 1 승인
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await requireAuth()
    const supabase = await createClient()

    // 프로젝트 소유자 + 분석 완료 확인
    const { data: project } = await supabase
      .from('patentai_patent_projects')
      .select('id, status, tech_domain, ipc_codes, core_inventions')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return errorResponse('프로젝트를 찾을 수 없습니다.', 404)

    if (!project.tech_domain && !(project.core_inventions as unknown[]).length) {
      return errorResponse('AI 분석을 먼저 완료해주세요.', 400)
    }

    const body = await request.json().catch(() => ({}))
    const parsed = approveSchema.safeParse(body)
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400)

    const { ipc_codes, core_inventions, tech_domain, notes } = parsed.data

    // 프로젝트 업데이트 (사용자가 수정한 값 반영)
    const updateData: Record<string, unknown> = { status: 'step1_done' }
    if (ipc_codes !== undefined) updateData.ipc_codes = ipc_codes
    if (core_inventions !== undefined) updateData.core_inventions = core_inventions
    if (tech_domain !== undefined) updateData.tech_domain = tech_domain

    const [{ error: projectError }, { error: gateError }] = await Promise.all([
      supabase
        .from('patentai_patent_projects')
        .update(updateData)
        .eq('id', id),
      supabase
        .from('patentai_patent_gates')
        .upsert({
          project_id: id,
          gate_number: 1,
          status: 'approved',
          approved_by: user.id,
          notes: notes ?? null,
          approved_at: new Date().toISOString(),
        }, { onConflict: 'project_id,gate_number' }),
    ])

    if (projectError || gateError) return errorResponse('GATE 1 승인 처리 실패', 500)

    return successResponse({ gateNumber: 1, status: 'approved' })
  } catch (error) {
    return handleApiError(error)
  }
}

// GET: GATE 1 상태 조회
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await requireAuth()
    const supabase = await createClient()

    const { data: gate } = await supabase
      .from('patentai_patent_gates')
      .select('*')
      .eq('project_id', id)
      .eq('gate_number', 1)
      .single()

    // 프로젝트 소유자 확인
    const { data: project } = await supabase
      .from('patentai_patent_projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return errorResponse('프로젝트를 찾을 수 없습니다.', 404)

    return successResponse(gate ?? { gate_number: 1, status: 'pending' })
  } catch (error) {
    return handleApiError(error)
  }
}
