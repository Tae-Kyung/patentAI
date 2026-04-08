import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/guards'
import { deductCredits } from '@/lib/credits'
import { getPromptCreditCost } from '@/lib/prompts'
import { errorResponse } from '@/lib/utils/api-response'
import type { PatentProject } from '@/types/database'

export interface PatentContext {
  userId: string
  supabase: Awaited<ReturnType<typeof createClient>>
  project: PatentProject
}

/**
 * 특허 생성 라우트의 공통 준비 로직
 * - 인증 확인 (프로젝트 소유자)
 * - Gate 통과 여부 확인
 * - 크레딧 차감
 *
 * @param projectId  대상 특허 프로젝트 ID
 * @param promptKey  사용할 프롬프트 키 (크레딧 비용 산출용)
 * @param requiredGate  이전 단계 Gate 번호 (없으면 null — STEP 1 등)
 * @returns PatentContext 또는 NextResponse (에러 시)
 */
export async function preparePatentGeneration(
  projectId: string,
  promptKey: string,
  requiredGate: number | null = null,
): Promise<PatentContext | Response> {
  // 1. 인증
  let userId: string
  try {
    const user = await requireAuth()
    userId = user.id
  } catch {
    return errorResponse('인증이 필요합니다.', 401)
  }

  const supabase = await createClient()

  // 2. 프로젝트 조회 및 소유자 확인
  const { data: project, error: projectError } = await supabase
    .from('patentai_patent_projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  if (projectError || !project) {
    return errorResponse('프로젝트를 찾을 수 없습니다.', 404)
  }

  // 3. Gate 통과 확인
  if (requiredGate !== null) {
    const { data: gate } = await supabase
      .from('patentai_patent_gates')
      .select('status')
      .eq('project_id', projectId)
      .eq('gate_number', requiredGate)
      .single()

    if (!gate || gate.status !== 'approved') {
      return errorResponse(
        `GATE ${requiredGate} 승인이 필요합니다. 이전 단계를 먼저 완료해주세요.`,
        400,
      )
    }
  }

  // 4. 크레딧 차감
  try {
    const cost = await getPromptCreditCost(promptKey)
    await deductCredits(userId, cost, `patent_${promptKey}`, projectId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : '크레딧 차감에 실패했습니다.'
    return errorResponse(msg, 402)
  }

  return { userId, supabase, project }
}

/**
 * JSON 응답에서 코드 펜스 제거
 */
export function stripCodeFence(content: string): string {
  const trimmed = content.trim()
  // Remove opening fence (```json or ```)
  const withoutOpen = trimmed.replace(/^```(?:\w+)?\s*\n?/, '')
  // Remove closing fence
  const withoutClose = withoutOpen.replace(/\n?```\s*$/, '')
  return withoutClose.trim()
}
