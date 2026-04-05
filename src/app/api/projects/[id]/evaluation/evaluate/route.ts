import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { deductCredits } from '@/lib/credits'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { errorResponse, handleApiError } from '@/lib/utils/api-response'
import { preparePrompt, getPromptCreditCost } from '@/lib/prompts'
import { streamAI, getAvailableProviders, type AIProvider } from '@/lib/ai'

interface RouteContext {
  params: Promise<{ id: string }>
}

interface PersonaResult {
  score: number
  feedback: string
  strengths?: string[]
  weaknesses?: string[]
  recommendations?: string[]
  provider?: string
  model?: string
}

// 페르소나별 기본 프로바이더 매핑
const PERSONA_PROVIDER_MAP: Record<string, AIProvider> = {
  investor: 'claude',
  market: 'openai',
  tech: 'gemini',
}

// 프로바이더별 모델명 약어
const PROVIDER_DISPLAY_NAMES: Record<AIProvider, string> = {
  claude: 'Claude',
  openai: 'GPT-4o',
  gemini: 'Gemini',
}

function resolveProvider(personaName: string): { provider: AIProvider; displayName: string; isFallback: boolean } {
  const preferred = PERSONA_PROVIDER_MAP[personaName]
  const available = getAvailableProviders()

  if (preferred && available.includes(preferred)) {
    return { provider: preferred, displayName: PROVIDER_DISPLAY_NAMES[preferred], isFallback: false }
  }

  const fallback = available[0]
  if (!fallback) {
    throw new Error('No AI provider available. Please configure at least one API key.')
  }

  return { provider: fallback, displayName: PROVIDER_DISPLAY_NAMES[fallback], isFallback: true }
}

// POST: AI 다면 평가 실행 (SSE 스트리밍)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireProjectOwner(id)
    await deductCredits(user.id, await getPromptCreditCost('evaluation_investor'), 'ai_evaluation', id)

    const supabase = await createClient()

    // 아이디어 카드 조회
    const { data: ideaCard, error: ideaError } = await supabase
      .from('bi_idea_cards')
      .select('*')
      .eq('project_id', id)
      .eq('is_confirmed', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (ideaError || !ideaCard) {
      return errorResponse('확정된 아이디어가 없습니다. Gate 1을 먼저 완료해주세요.', 400)
    }

    // 평가 레코드 확인 또는 생성
    let evaluationId: string
    const { data: existingEvaluation } = await supabase
      .from('bi_evaluations')
      .select('id, is_confirmed')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingEvaluation?.is_confirmed) {
      return errorResponse('이미 확정된 평가가 있습니다.', 400)
    }

    if (existingEvaluation) {
      evaluationId = existingEvaluation.id
    } else {
      const { data: newEvaluation, error: createError } = await supabase
        .from('bi_evaluations')
        .insert({ project_id: id })
        .select('id')
        .single()

      if (createError) throw createError
      evaluationId = newEvaluation.id
    }

    // 아이디어 정보 구성
    const ideaContext = JSON.stringify({
      raw_input: ideaCard.raw_input,
      problem: ideaCard.problem,
      solution: ideaCard.solution,
      target: ideaCard.target,
      differentiation: ideaCard.differentiation,
      ai_expanded: ideaCard.ai_expanded,
    }, null, 2)

    // 프롬프트 템플릿 변수 (개별 필드 + 전체 JSON 모두 지원)
    const promptVariables: Record<string, string> = {
      idea: ideaContext,
      idea_summary: ideaCard.raw_input || '',
      raw_input: ideaCard.raw_input || '',
      problem: ideaCard.problem || '',
      solution: ideaCard.solution || '',
      target: ideaCard.target || '',
      differentiation: ideaCard.differentiation || '',
      ai_expanded: String(ideaCard.ai_expanded ?? ''),
    }

    // JSON 출력 형식 강제 지시문 (시스템 프롬프트 앞에 배치하여 우선순위 확보)
    const JSON_SCHEMA_INSTRUCTION = `[MANDATORY OUTPUT FORMAT - THIS OVERRIDES ALL OTHER FORMAT INSTRUCTIONS]
You MUST respond with ONLY a valid JSON object matching this EXACT schema.
No markdown, no code fences, no extra text. Only the JSON object.
Any other output format instructions below are SUPERSEDED by this schema:
{
  "score": <number 0-100>,
  "feedback": "<string: 2-3 sentence overall evaluation summary>",
  "strengths": ["<string: 1 sentence each, max 5 items>"],
  "weaknesses": ["<string: 1 sentence each, max 5 items>"],
  "recommendations": ["<string: 1 sentence each, max 5 items>"]
}
Use EXACTLY these 5 field names: "score", "feedback", "strengths", "weaknesses", "recommendations".
Do NOT use any other field names (no "summary", "marketAnalysis", "competitors", "opportunities", "threats", etc.).
IMPORTANT: Write all string values in the SAME LANGUAGE as the user's idea input below. If the idea is in Korean, respond in Korean. If in English, respond in English.

`

    // 저장을 위한 변수
    const projectId = id
    const evalId = evaluationId

    // SSE 이벤트 전송 헬퍼
    const encoder = new TextEncoder()

    function sseEvent(type: string, data: Record<string, unknown>): Uint8Array {
      return encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`)
    }

    // SSE 스트리밍
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const personas = [
            { key: 'evaluation_investor', name: 'investor', label: '투자심사역' },
            { key: 'evaluation_market', name: 'market', label: '시장분석가' },
            { key: 'evaluation_tech', name: 'tech', label: '기술전문가' },
          ]

          const results: Record<string, PersonaResult> = {}
          const modelNames: Record<string, string> = {}
          const providerNames: Record<string, string> = {}

          controller.enqueue(sseEvent('start', { total: 3 }))

          for (let i = 0; i < personas.length; i++) {
            const persona = personas[i]!

            // 프로바이더 결정
            const { provider, displayName, isFallback } = resolveProvider(persona.name)

            controller.enqueue(sseEvent('progress', {
              current: i + 1,
              total: 3,
              persona: persona.label,
              status: 'evaluating',
              provider,
              model: displayName,
              isFallback,
            }))

            try {
              const prompt = await preparePrompt(persona.key, promptVariables)

              if (!prompt) {
                controller.enqueue(sseEvent('error', {
                  persona: persona.name,
                  message: `${persona.label} 프롬프트를 찾을 수 없습니다.`,
                }))
                continue
              }

              // 실제 사용되는 모델명 기록 (claude만 prompt.model 사용, 나머지는 기본 모델)
              const DEFAULT_MODELS: Record<string, string> = {
                claude: 'claude-sonnet-4-20250514',
                openai: 'gpt-4o',
                gemini: 'gemini-2.5-flash',
              }
              modelNames[persona.name] = provider === 'claude' ? prompt.model : DEFAULT_MODELS[provider] || prompt.model
              providerNames[persona.name] = provider

              let fullContent = ''
              // 시스템 프롬프트 앞에 JSON 스키마 지시문 배치 (DB 프롬프트보다 우선)
              const systemPromptWithSchema = JSON_SCHEMA_INSTRUCTION + prompt.systemPrompt
              // 아이디어가 한국어면 사용자 프롬프트에 한국어 응답 지시 추가
              const hasKorean = /[가-힣]/.test(ideaCard.raw_input || '')
              const userPromptWithLang = hasKorean
                ? prompt.userPrompt + '\n\n[중요] 반드시 한국어(Korean)로 작성하세요. 모든 feedback, strengths, weaknesses, recommendations 값을 한국어로 작성해야 합니다.'
                : prompt.userPrompt
              const aiStream = streamAI(systemPromptWithSchema, userPromptWithLang, {
                provider,
                model: provider === 'claude' ? prompt.model : undefined,
                temperature: prompt.temperature,
                maxTokens: Math.max(prompt.maxTokens, 4000),
                jsonMode: provider !== 'claude', // OpenAI, Gemini에 JSON 모드 강제
              })

              for await (const event of aiStream) {
                if (event.type === 'text') {
                  fullContent += event.data
                  controller.enqueue(sseEvent('persona_text', {
                    persona: persona.name,
                    text: event.data,
                  }))
                }
              }

              // JSON 추출: 코드 펜스 내부 또는 첫 번째 {...} 블록
              let cleanContent = fullContent.trim()

              // 1차: 코드 펜스 내부 추출
              const fenceMatch = cleanContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
              if (fenceMatch) {
                cleanContent = fenceMatch[1].trim()
              } else {
                // 2차: 첫 번째 JSON 객체 추출
                const jsonMatch = cleanContent.match(/\{[\s\S]*\}/)
                if (jsonMatch) {
                  cleanContent = jsonMatch[0].trim()
                }
              }

              try {
                const raw = JSON.parse(cleanContent) as Record<string, unknown>

                // 필드 정규화 헬퍼: 여러 후보 키에서 배열 추출
                const findArray = (...keys: string[]): string[] | undefined => {
                  for (const k of keys) {
                    if (Array.isArray(raw[k]) && raw[k].length > 0) return raw[k] as string[]
                  }
                  return undefined
                }
                const findString = (...keys: string[]): string => {
                  for (const k of keys) {
                    if (typeof raw[k] === 'string' && raw[k]) return raw[k] as string
                  }
                  return ''
                }

                const parsed: PersonaResult = {
                  score: typeof raw.score === 'number' ? raw.score : 0,
                  feedback: findString('feedback', 'summary', 'analysis', 'comment', 'overall', 'evaluation'),
                  strengths: findArray('strengths', 'strength', 'pros', 'advantages', 'positive_points', 'opportunities'),
                  weaknesses: findArray('weaknesses', 'weakness', 'cons', 'disadvantages', 'risks', 'negative_points', 'challenges', 'threats'),
                  recommendations: findArray('recommendations', 'recommendation', 'suggestions', 'improvements', 'action_items'),
                  provider,
                  model: displayName,
                }
                results[persona.name] = parsed

                controller.enqueue(sseEvent('persona_complete', {
                  persona: persona.name,
                  label: persona.label,
                  result: parsed,
                  provider,
                  model: displayName,
                }))
              } catch {
                results[persona.name] = { score: 0, feedback: fullContent, provider, model: displayName }
                controller.enqueue(sseEvent('persona_complete', {
                  persona: persona.name,
                  label: persona.label,
                  result: results[persona.name],
                  provider,
                  model: displayName,
                  parseError: true,
                }))
              }
            } catch (error) {
              console.error(`Evaluation error (${persona.name}):`, error)
              controller.enqueue(sseEvent('error', {
                persona: persona.name,
                message: '평가 처리 중 오류가 발생했습니다.',
              }))
            }
          }

          // 종합 점수 계산
          const investorScore = results.investor?.score || 0
          const marketScore = results.market?.score || 0
          const techScore = results.tech?.score || 0
          const totalScore = Math.round((investorScore + marketScore + techScore) / 3)

          const recommendations = [
            ...(results.investor?.recommendations || []),
            ...(results.market?.recommendations || []),
            ...(results.tech?.recommendations || []),
          ]

          // DB 저장 (ReadableStream 내부에서는 cookies() 접근이 불안정하므로 serviceClient 사용)
          const supabaseUpdate = createServiceClient()
          const { error: updateError } = await supabaseUpdate
            .from('bi_evaluations')
            .update({
              investor_score: investorScore,
              investor_feedback: results.investor ? JSON.stringify({
                feedback: results.investor.feedback,
                strengths: results.investor.strengths,
                weaknesses: results.investor.weaknesses,
                recommendations: results.investor.recommendations,
              }) : null,
              investor_ai_model: modelNames.investor || `${providerNames.investor || 'claude'}:claude-sonnet-4-20250514`,
              market_score: marketScore,
              market_feedback: results.market ? JSON.stringify({
                feedback: results.market.feedback,
                strengths: results.market.strengths,
                weaknesses: results.market.weaknesses,
                recommendations: results.market.recommendations,
              }) : null,
              market_ai_model: modelNames.market || `${providerNames.market || 'claude'}:claude-sonnet-4-20250514`,
              tech_score: techScore,
              tech_feedback: results.tech ? JSON.stringify({
                feedback: results.tech.feedback,
                strengths: results.tech.strengths,
                weaknesses: results.tech.weaknesses,
                recommendations: results.tech.recommendations,
              }) : null,
              tech_ai_model: modelNames.tech || `${providerNames.tech || 'claude'}:claude-sonnet-4-20250514`,
              total_score: totalScore,
              recommendations: recommendations.length > 0 ? recommendations : null,
            })
            .eq('id', evalId)

          if (updateError) {
            console.error('Evaluation DB update error:', updateError)
          }

          await supabaseUpdate
            .from('bi_projects')
            .update({
              status: 'in_progress',
              updated_at: new Date().toISOString(),
            })
            .eq('id', projectId)

          controller.enqueue(sseEvent('complete', {
            evaluationId: evalId,
            totalScore,
            investorScore,
            marketScore,
            techScore,
            recommendations,
          }))
        } catch (error) {
          console.error('Evaluation SSE error:', error)
          controller.enqueue(sseEvent('error', { message: '평가 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
