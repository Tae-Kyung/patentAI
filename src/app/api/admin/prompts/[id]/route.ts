import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { updatePromptWithVersion } from '@/lib/prompts/version-manager'
import { invalidatePromptCache } from '@/lib/prompts/prompt-engine'

// 프롬프트 업데이트 스키마
const updatePromptSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  system_prompt: z.string().min(1).optional(),
  user_prompt_template: z.string().min(1).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().min(100).max(8000).optional(),
  credit_cost: z.number().int().min(0).max(100).optional(),
  is_active: z.boolean().optional(),
  change_note: z.string().optional(),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET: 프롬프트 상세 조회
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireAdmin()

    const { id } = await context.params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('bi_prompts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return errorResponse('프롬프트를 찾을 수 없습니다.', 404)
    }

    return successResponse(data)
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH: 프롬프트 수정
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireAdmin()

    const { id } = await context.params
    const body = await request.json()
    const { change_note, ...updateData } = updatePromptSchema.parse(body)

    const updatedPrompt = await updatePromptWithVersion(
      id,
      updateData,
      change_note,
      user.id
    )

    if (!updatedPrompt) {
      return errorResponse('프롬프트 업데이트에 실패했습니다.', 500)
    }

    return successResponse(updatedPrompt)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}

// DELETE: 프롬프트 삭제
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireAdmin()

    const { id } = await context.params
    const supabase = await createClient()

    // 프롬프트 키 조회 (캐시 무효화용)
    const { data: prompt } = await supabase
      .from('bi_prompts')
      .select('key')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('bi_prompts')
      .delete()
      .eq('id', id)

    if (error) {
      return errorResponse('프롬프트 삭제에 실패했습니다.', 500)
    }

    // 캐시 무효화
    if (prompt) {
      await invalidatePromptCache(prompt.key)
    }

    return successResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
