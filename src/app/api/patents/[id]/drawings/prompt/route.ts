import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { callClaude } from '@/lib/ai/claude'
import { preparePrompt } from '@/lib/prompts'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const bodySchema = z.object({
  drawing_type: z.enum(['system_architecture', 'flowchart', 'ui_wireframe', 'data_flow', 'other']),
  caption: z.string().min(1).max(200),
})

// POST: 도면 생성용 Gemini 영문 프롬프트 생성 (Claude 사용)
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
      .select('id, tech_domain, core_inventions')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return errorResponse('프로젝트를 찾을 수 없습니다.', 404)

    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400)

    const prepared = await preparePrompt('patent_drawing_prompt_gen', {
      tech_domain: project.tech_domain ?? '',
      core_inventions: JSON.stringify(project.core_inventions),
      drawing_type: parsed.data.drawing_type,
      caption: parsed.data.caption,
    })

    if (!prepared) return errorResponse('프롬프트를 불러올 수 없습니다.', 500)

    const result = await callClaude(prepared.systemPrompt, prepared.userPrompt, {
      model: prepared.model,
      temperature: prepared.temperature,
      maxTokens: 512,
    })

    return successResponse({ prompt: result.content.trim() })
  } catch (error) {
    return handleApiError(error)
  }
}
