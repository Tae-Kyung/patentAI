import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import type { PatentSectionType } from '@/types/database'

const ALL_SECTIONS: PatentSectionType[] = [
  'title', 'tech_field', 'background', 'problem',
  'solution', 'effect', 'drawing_desc', 'detailed_desc', 'abstract',
]

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

    // GATE 3 확인
    const { data: gate3 } = await supabase
      .from('patentai_patent_gates')
      .select('status')
      .eq('project_id', id)
      .eq('gate_number', 3)
      .single()

    if (!gate3 || gate3.status !== 'approved') {
      return errorResponse('GATE 3 승인이 필요합니다.', 400)
    }

    // 9개 섹션 완료 여부 확인
    const { data: sections } = await supabase
      .from('patentai_patent_sections')
      .select('section_type, content')
      .eq('project_id', id)

    const completedTypes = new Set((sections ?? []).filter((s) => s.content?.trim()).map((s) => s.section_type))
    const missing = ALL_SECTIONS.filter((t) => !completedTypes.has(t))

    if (missing.length > 0) {
      return errorResponse(`미완성 섹션이 있습니다: ${missing.join(', ')}`, 400)
    }

    const body = await request.json().catch(() => ({}))
    const parsed = approveSchema.safeParse(body)
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400)

    await supabase
      .from('patentai_patent_gates')
      .upsert(
        {
          project_id: id,
          gate_number: 4,
          status: 'approved',
          approved_by: user.id,
          notes: parsed.data.notes ?? null,
          approved_at: new Date().toISOString(),
        },
        { onConflict: 'project_id,gate_number' },
      )

    await supabase
      .from('patentai_patent_projects')
      .update({ status: 'step4_done' })
      .eq('id', id)

    return successResponse({ approved: true, gate: 4 })
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
      .eq('gate_number', 4)
      .single()

    const { data: sections } = await supabase
      .from('patentai_patent_sections')
      .select('section_type, content, version, updated_at')
      .eq('project_id', id)

    const sectionStatus = ALL_SECTIONS.map((t) => {
      const s = (sections ?? []).find((x) => x.section_type === t)
      return { section_type: t, done: !!(s?.content?.trim()), version: s?.version ?? 0 }
    })

    return successResponse({ gate: gate ?? null, sectionStatus })
  } catch (error) {
    return handleApiError(error)
  }
}
