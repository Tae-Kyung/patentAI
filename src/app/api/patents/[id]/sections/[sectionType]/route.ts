import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const patchSchema = z.object({
  content: z.string().min(1),
})

// GET: 특정 섹션 조회
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionType: string }> },
) {
  try {
    const { id, sectionType } = await params
    const user = await requireAuth()
    const supabase = await createClient()

    const { data: project } = await supabase
      .from('patentai_patent_projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return errorResponse('프로젝트를 찾을 수 없습니다.', 404)

    const { data } = await supabase
      .from('patentai_patent_sections')
      .select('*')
      .eq('project_id', id)
      .eq('section_type', sectionType as import('@/types/database').PatentSectionType)
      .single()

    return successResponse(data ?? null)
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH: 섹션 내용 수정 (버전 +1)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionType: string }> },
) {
  try {
    const { id, sectionType } = await params
    const user = await requireAuth()
    const supabase = await createClient()

    const { data: project } = await supabase
      .from('patentai_patent_projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return errorResponse('프로젝트를 찾을 수 없습니다.', 404)

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400)

    // 현재 버전 조회
    const { data: existing } = await supabase
      .from('patentai_patent_sections')
      .select('version')
      .eq('project_id', id)
      .eq('section_type', sectionType as import('@/types/database').PatentSectionType)
      .single()

    const { data, error } = await supabase
      .from('patentai_patent_sections')
      .upsert(
        {
          project_id: id,
          section_type: sectionType as import('@/types/database').PatentSectionType,
          content: parsed.data.content,
          version: (existing?.version ?? 0) + 1,
        },
        { onConflict: 'project_id,section_type' },
      )
      .select()
      .single()

    if (error) return errorResponse('섹션 저장 실패', 500)
    return successResponse(data)
  } catch (error) {
    return handleApiError(error)
  }
}
