import { NextRequest } from 'next/server'
import { requireMentor } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { errorResponse, handleApiError } from '@/lib/utils/api-response'
import { streamAI } from '@/lib/ai'
import { preparePrompt } from '@/lib/prompts'

interface RouteContext {
  params: Promise<{ reportId: string }>
}

const FALLBACK_SYSTEM_PROMPT = `당신은 창업 멘토링 보고서를 작성하는 전문가입니다.
멘토가 프로젝트의 각 단계에서 작성한 의견(피드백)을 분석하여 체계적인 멘토링 종합 보고서를 작성해주세요.

보고서는 다음 형식을 따라 마크다운으로 작성하세요:

# 멘토링 종합 보고서

## 프로젝트: {{projectName}}

---

## 1. 멘토링 개요
(멘토링 횟수, 피드백 건수, 기간 등 요약)

## 2. 단계별 멘토 의견 분석
(각 단계별로 멘토가 작성한 피드백을 정리하고, 핵심 내용을 분석)

## 3. 세션별 활동 내역
(멘토링 세션 기록 정리)

## 4. 멘토 종합 의견
(단계별 피드백을 종합하여 프로젝트에 대한 전체적인 멘토 의견을 분석적으로 서술)

## 5. 강점 분석
(피드백에서 드러난 프로젝트의 강점을 구체적으로 분석)

## 6. 개선 필요 사항
(피드백에서 지적된 개선점, 수정요청, 반려 사유 등을 종합하여 구체적으로 서술)

## 7. 종합 평가 및 권고사항
(전체를 종합한 평가와 향후 권고사항)

---

*본 보고서는 멘토링 활동 기록 및 단계별 피드백을 기반으로 AI가 생성하였습니다.*

중요 규칙:
- 반드시 한국어로 작성하세요.
- 멘토의 실제 피드백 내용을 기반으로 분석하세요.
- 피드백이 부족한 경우에도 있는 내용을 최대한 활용하여 작성하세요.
- 구체적이고 실질적인 내용을 작성하세요.`

const FALLBACK_USER_TEMPLATE = `다음 정보를 기반으로 멘토링 종합 보고서를 작성해주세요.

## 프로젝트 정보
- 프로젝트명: {{projectName}}
- 현재 단계: {{currentStage}}
- 프로젝트 유형: {{projectType}}
- 총 멘토링 세션: {{sessionCount}}회
- 단계별 피드백: {{feedbackCount}}건
- 종합 평점: {{rating}}
{{period}}

## 멘토가 작성한 단계별 피드백
{{feedbackText}}

## 멘토링 세션 기록
{{sessionText}}

{{mentorOpinion}}
{{strengths}}
{{improvements}}`

// POST: AI 보고서 생성 (SSE 스트리밍)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { reportId } = await context.params
    const user = await requireMentor()

    const supabase = createServiceClient()

    // 보고서 조회
    const { data: report, error: reportError } = await supabase
      .from('bi_mentoring_reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      return errorResponse('보고서를 찾을 수 없습니다.', 404)
    }

    // 소유권 확인: report -> match -> mentor_id
    const { data: match, error: matchError } = await supabase
      .from('bi_mentor_matches')
      .select('mentor_id, project_id')
      .eq('id', report.match_id)
      .single()

    if (matchError || !match) {
      return errorResponse('매칭 정보를 찾을 수 없습니다.', 404)
    }

    if (match.mentor_id !== user.id && user.role !== 'admin') {
      return errorResponse('보고서에 대한 접근 권한이 없습니다.', 403)
    }

    // 프로젝트 정보 조회
    const { data: project } = await supabase
      .from('bi_projects')
      .select('name, current_stage, project_type')
      .eq('id', match.project_id)
      .single()

    // 멘토링 세션 조회
    const { data: sessions } = await supabase
      .from('bi_mentoring_sessions')
      .select('*')
      .eq('match_id', report.match_id)
      .order('session_date', { ascending: true })

    const sessionList = sessions || []

    // 멘토 피드백 조회
    const { data: feedbacks } = await supabase
      .from('bi_feedbacks')
      .select('stage, feedback_type, comment, created_at')
      .eq('project_id', match.project_id)
      .eq('user_id', user.id)
      .eq('feedback_source', 'mentoring')
      .order('created_at', { ascending: true })

    const feedbackList = feedbacks || []

    // 단계별 피드백 정리
    const stageLabels: Record<string, string> = {
      idea: '아이디어', evaluation: '평가', document: '문서', deploy: '배포', done: '완료',
    }
    const feedbackTypeLabels: Record<string, string> = {
      comment: '의견', approval: '승인', rejection: '반려', revision_request: '수정요청',
    }

    const stageOrder = ['idea', 'evaluation', 'document', 'deploy', 'done']
    const feedbacksByStage: Record<string, typeof feedbackList> = {}
    for (const fb of feedbackList) {
      if (!feedbacksByStage[fb.stage]) feedbacksByStage[fb.stage] = []
      feedbacksByStage[fb.stage].push(fb)
    }

    let feedbackText = ''
    for (const stage of stageOrder) {
      const stageFbs = feedbacksByStage[stage]
      if (!stageFbs || stageFbs.length === 0) continue
      feedbackText += `\n### ${stageLabels[stage] || stage} 단계\n`
      for (const fb of stageFbs) {
        const date = new Date(fb.created_at).toLocaleDateString()
        feedbackText += `- [${feedbackTypeLabels[fb.feedback_type] || fb.feedback_type}] (${date}): ${fb.comment}\n`
      }
    }

    let sessionText = ''
    if (sessionList.length > 0) {
      sessionText = sessionList.map((s, i) => {
        const date = s.session_date || '날짜 미정'
        const comment = s.revision_summary || (typeof s.comments === 'string' ? s.comments : JSON.stringify(s.comments)) || ''
        return `${i + 1}. [${date}] ${comment}`
      }).join('\n')
    }

    const projectName = project?.name || '프로젝트'
    const sessionCount = sessionList.length
    const rating = report.overall_rating ? `${report.overall_rating}/5` : '미평가'

    // 템플릿 변수
    const variables: Record<string, string> = {
      projectName,
      currentStage: project?.current_stage || '-',
      projectType: project?.project_type === 'startup' ? '창업자' : '예비창업자',
      sessionCount: String(sessionCount),
      feedbackCount: String(feedbackList.length),
      rating,
      period: sessionCount > 0
        ? `- 멘토링 기간: ${sessionList[0]?.session_date || '-'} ~ ${sessionList[sessionCount - 1]?.session_date || '-'}`
        : '',
      feedbackText: feedbackText || '(아직 작성된 피드백이 없습니다)',
      sessionText: sessionText || '(아직 진행된 세션이 없습니다)',
      mentorOpinion: report.mentor_opinion ? `## 멘토 종합 의견 (직접 작성)\n${report.mentor_opinion}` : '',
      strengths: report.strengths ? `## 강점 (직접 작성)\n${report.strengths}` : '',
      improvements: report.improvements ? `## 개선점 (직접 작성)\n${report.improvements}` : '',
    }

    // 프롬프트 관리 시스템에서 조회, 없으면 fallback 사용
    const prompt = await preparePrompt('mentoring_report', variables)

    let systemPrompt: string
    let userPrompt: string
    let model: string | undefined
    let temperature: number
    let maxTokens: number

    if (prompt) {
      systemPrompt = prompt.systemPrompt
      userPrompt = prompt.userPrompt
      model = prompt.model
      temperature = prompt.temperature
      maxTokens = prompt.maxTokens
    } else {
      // Fallback: 하드코딩된 프롬프트 사용
      const { renderTemplate } = await import('@/lib/prompts/prompt-engine')
      systemPrompt = renderTemplate(FALLBACK_SYSTEM_PROMPT, variables)
      userPrompt = renderTemplate(FALLBACK_USER_TEMPLATE, variables)
      temperature = 0.7
      maxTokens = 4000
    }

    // AI 스트리밍 생성
    const encoder = new TextEncoder()
    let fullContent = ''

    const aiStream = new ReadableStream({
      async start(controller) {
        try {
          const generator = streamAI(systemPrompt, userPrompt, {
            model,
            maxTokens,
            temperature,
          })

          for await (const event of generator) {
            if (event.type === 'text') {
              fullContent += event.data
              controller.enqueue(encoder.encode(`event: text\ndata: ${JSON.stringify(event.data)}\n\n`))
            } else if (event.type === 'done') {
              // AI 생성 완료 — DB 저장
              try {
                const supabaseUpdate = createServiceClient()
                await supabaseUpdate
                  .from('bi_mentoring_reports')
                  .update({
                    ai_generated_report: fullContent,
                    ai_summary: fullContent.substring(0, 500),
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', reportId)
              } catch (saveError) {
                console.error('AI report save error:', saveError)
              }

              controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`))
            }
          }

          controller.close()
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          console.error('SSE stream error:', errorMsg, error)
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify(errorMsg)}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(aiStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Generate AI report error:', error)
    return handleApiError(error)
  }
}
