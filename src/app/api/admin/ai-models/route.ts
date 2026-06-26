import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { invalidateModelSettingsCache, AVAILABLE_MODELS } from '@/lib/ai/model-settings'

const updateSchema = z.object({
  settings: z.array(z.object({
    key: z.string(),
    value: z.string().min(1),
  })),
})

// 허용된 모델 ID 집합
const ALLOWED_MODEL_IDS = new Set<string>([
  ...AVAILABLE_MODELS.claude.map(m => m.id),
  ...AVAILABLE_MODELS.gemini.map(m => m.id),
  ...AVAILABLE_MODELS.geminiImage.map(m => m.id),
  ...AVAILABLE_MODELS.openai.map(m => m.id),
])

const VALID_KEYS = new Set(['claude.default', 'gemini.default', 'gemini.image', 'openai.default'])

/** GET - 현재 AI 모델 설정 조회 */
export async function GET() {
  try {
    await requireAdmin()

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('patentai_ai_settings')
      .select('*')
      .order('key')

    if (error) return errorResponse(error.message, 500)

    return successResponse({
      settings: data ?? [],
      availableModels: AVAILABLE_MODELS,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/** PATCH - AI 모델 설정 변경 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAdmin()

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400)

    // 키/모델 ID 검증
    for (const setting of parsed.data.settings) {
      if (!VALID_KEYS.has(setting.key)) {
        return errorResponse(`잘못된 설정 키: ${setting.key}`, 400)
      }
      if (!ALLOWED_MODEL_IDS.has(setting.value)) {
        return errorResponse(`허용되지 않은 모델: ${setting.value}`, 400)
      }
    }

    const supabase = createServiceClient()

    for (const setting of parsed.data.settings) {
      const { error } = await supabase
        .from('patentai_ai_settings')
        .upsert({
          key: setting.key,
          value: setting.value,
          label: getLabel(setting.key),
          description: getDescription(setting.key),
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        }, { onConflict: 'key' })

      if (error) return errorResponse(`설정 저장 실패: ${error.message}`, 500)
    }

    invalidateModelSettingsCache()

    return successResponse({ updated: parsed.data.settings.length })
  } catch (error) {
    return handleApiError(error)
  }
}

function getLabel(key: string): string {
  const labels: Record<string, string> = {
    'claude.default': 'Claude 기본 모델',
    'gemini.default': 'Gemini 기본 모델',
    'gemini.image': 'Gemini 이미지 모델',
    'openai.default': 'OpenAI 기본 모델',
  }
  return labels[key] ?? key
}

function getDescription(key: string): string {
  const descriptions: Record<string, string> = {
    'claude.default': '텍스트 생성(분석, 청구항, 명세서)에 사용되는 기본 Claude 모델',
    'gemini.default': '텍스트 분석에 사용되는 기본 Gemini 모델',
    'gemini.image': '특허 도면 생성에 사용되는 Gemini 이미지 모델',
    'openai.default': 'PDF OCR에 사용되는 OpenAI 모델',
  }
  return descriptions[key] ?? ''
}
