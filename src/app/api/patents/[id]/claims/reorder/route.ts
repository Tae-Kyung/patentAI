import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const reorderSchema = z.object({
  // id 배열 순서 = 새 claim_number 순서 (1-based)
  ids: z.array(z.string().uuid()).min(1),
})

// POST: 청구항 순서 일괄 변경
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

    const body = await request.json()
    const parsed = reorderSchema.safeParse(body)
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400)

    // 번호 충돌 방지를 위해 임시 음수값으로 먼저 업데이트
    for (let i = 0; i < parsed.data.ids.length; i++) {
      await supabase
        .from('patentai_patent_claims')
        .update({ claim_number: -(i + 1) })
        .eq('id', parsed.data.ids[i])
        .eq('project_id', id)
    }

    // 실제 번호로 업데이트
    for (let i = 0; i < parsed.data.ids.length; i++) {
      await supabase
        .from('patentai_patent_claims')
        .update({ claim_number: i + 1 })
        .eq('id', parsed.data.ids[i])
        .eq('project_id', id)
    }

    return successResponse({ reordered: parsed.data.ids.length })
  } catch (error) {
    return handleApiError(error)
  }
}
