import { createClient } from '@/lib/supabase/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { deductCredits } from '@/lib/credits'
import { getPromptCreditCost } from '@/lib/prompts'
import { errorResponse } from '@/lib/utils/api-response'
import type { User, DocumentType } from '@/types/database'

export interface DocumentContext {
  user: User
  supabase: Awaited<ReturnType<typeof createClient>>
  project: {
    id: string
    name: string
    project_type: string
    [key: string]: unknown
  }
  ideaCard: {
    raw_input: string
    problem: string | null
    solution: string | null
    target: string | null
    differentiation: string | null
    ai_expanded: unknown
    [key: string]: unknown
  }
  evaluation: {
    total_score: number | null
    investor_score: number | null
    investor_feedback: string | null
    market_score: number | null
    market_feedback: string | null
    tech_score: number | null
    tech_feedback: string | null
    recommendations: unknown
    [key: string]: unknown
  }
  existingDocId: string | null
}

/**
 * 문서 생성 라우트의 공통 준비 로직
 * - 인증 (프로젝트 소유자)
 * - 크레딧 차감
 * - Gate 2 통과 확인
 * - 아이디어/평가 데이터 조회
 * - 기존 문서 확인 (확정 문서 차단)
 *
 * @returns DocumentContext 또는 NextResponse (에러 시)
 */
export async function prepareDocumentGeneration(
  projectId: string,
  docType: DocumentType,
  promptKey: string,
  creditType: string,
): Promise<DocumentContext | Response> {
  const user = await requireProjectOwner(projectId)

  // 크레딧 차감
  await deductCredits(user.id, await getPromptCreditCost(promptKey), creditType, projectId)

  const supabase = await createClient()

  // Gate 2 통과 확인
  const { data: project, error: projectError } = await supabase
    .from('bi_projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    return errorResponse('프로젝트를 찾을 수 없습니다.', 404)
  }

  if (!project.gate_2_passed_at) {
    return errorResponse('평가 단계(Gate 2)를 먼저 완료해주세요.', 400)
  }

  // 아이디어와 평가 데이터 병렬 조회
  const [{ data: ideaCard }, { data: evaluation }, { data: existingDoc }] = await Promise.all([
    supabase
      .from('bi_idea_cards')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_confirmed', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('bi_evaluations')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_confirmed', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('bi_documents')
      .select('id, is_confirmed')
      .eq('project_id', projectId)
      .eq('type', docType)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  if (!ideaCard || !evaluation) {
    return errorResponse('확정된 아이디어와 평가가 필요합니다.', 400)
  }

  if (existingDoc?.is_confirmed) {
    return errorResponse('이미 확정된 문서가 있습니다. 확정을 해제한 후 다시 생성해주세요.', 400)
  }

  return {
    user,
    supabase,
    project,
    ideaCard,
    evaluation,
    existingDocId: existingDoc?.id || null,
  }
}

/**
 * 문서를 DB에 저장 (신규 생성 또는 기존 업데이트)
 */
export async function saveDocument(
  supabase: DocumentContext['supabase'],
  params: {
    existingDocId: string | null
    projectId: string
    docType: DocumentType
    title: string
    content: string
    model: string
    storagePath?: string
    fileName?: string
  }
): Promise<string> {
  const { existingDocId, projectId, docType, title, content, model, storagePath, fileName } = params

  if (existingDocId) {
    const { data: updated, error } = await supabase
      .from('bi_documents')
      .update({
        content,
        ai_model_used: model,
        ...(storagePath && { storage_path: storagePath }),
        ...(fileName && { file_name: fileName }),
      })
      .eq('id', existingDocId)
      .select('id')
      .single()

    if (error) throw error
    return updated.id
  }

  const { data: created, error } = await supabase
    .from('bi_documents')
    .insert({
      project_id: projectId,
      type: docType,
      title,
      content,
      ai_model_used: model,
      ...(storagePath && { storage_path: storagePath }),
      ...(fileName && { file_name: fileName }),
    })
    .select('id')
    .single()

  if (error) throw error
  return created.id
}

/**
 * 기본 프롬프트 변수 빌드 (최소 세트)
 */
export function buildMinimalPromptVars(ctx: DocumentContext): Record<string, string> {
  return {
    project_name: ctx.project.name,
    problem: ctx.ideaCard.problem || ctx.ideaCard.raw_input || '',
    solution: ctx.ideaCard.solution || '',
    target: ctx.ideaCard.target || '',
    differentiation: ctx.ideaCard.differentiation || '',
    total_score: String(ctx.evaluation.total_score ?? ''),
    investor_score: String(ctx.evaluation.investor_score ?? ''),
    market_score: String(ctx.evaluation.market_score ?? ''),
    tech_score: String(ctx.evaluation.tech_score ?? ''),
    raw_input: ctx.ideaCard.raw_input || '',
  }
}

/**
 * 전체 프롬프트 변수 빌드 (상세 세트)
 */
export function buildFullPromptVars(ctx: DocumentContext): Record<string, string> {
  const context = JSON.stringify({
    project_name: ctx.project.name,
    idea: {
      raw_input: ctx.ideaCard.raw_input,
      problem: ctx.ideaCard.problem,
      solution: ctx.ideaCard.solution,
      target: ctx.ideaCard.target,
      differentiation: ctx.ideaCard.differentiation,
      ai_expanded: ctx.ideaCard.ai_expanded ?? null,
    },
    evaluation: {
      investor_score: ctx.evaluation.investor_score,
      investor_feedback: ctx.evaluation.investor_feedback,
      market_score: ctx.evaluation.market_score,
      market_feedback: ctx.evaluation.market_feedback,
      tech_score: ctx.evaluation.tech_score,
      tech_feedback: ctx.evaluation.tech_feedback,
      total_score: ctx.evaluation.total_score,
      recommendations: String(ctx.evaluation.recommendations ?? ''),
    },
  }, null, 2)

  const evaluationFeedback = [
    ctx.evaluation.investor_feedback,
    ctx.evaluation.market_feedback,
    ctx.evaluation.tech_feedback,
  ].filter(Boolean).join('\n\n')

  return {
    context,
    ...buildMinimalPromptVars(ctx),
    idea_summary: `${ctx.ideaCard.problem}\n${ctx.ideaCard.solution}`,
    ai_expanded: String(ctx.ideaCard.ai_expanded ?? ''),
    investor_feedback: ctx.evaluation.investor_feedback || '',
    market_feedback: ctx.evaluation.market_feedback || '',
    tech_feedback: ctx.evaluation.tech_feedback || '',
    evaluation_feedback: evaluationFeedback,
    recommendations: Array.isArray(ctx.evaluation.recommendations)
      ? ctx.evaluation.recommendations.join(', ')
      : String(ctx.evaluation.recommendations ?? ''),
  }
}

/**
 * 코드 펜스 제거 유틸리티
 */
export function removeCodeFence(content: string, lang = 'html'): string {
  const trimmed = content.trim()
  const regex = new RegExp(`^\`\`\`(?:${lang})?\\s*\\n?([\\s\\S]*?)\\n?\\s*\`\`\`$`)
  const match = trimmed.match(regex)
  return match ? match[1].trim() : trimmed
}
