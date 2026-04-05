import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/utils/api-response'
import { preparePrompt } from '@/lib/prompts'
import { streamClaude, createSSEResponse } from '@/lib/ai/claude'
import { prepareDocumentGeneration, saveDocument, buildMinimalPromptVars } from '@/lib/services/document-generator'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST: 요약 피치 생성 (SSE 스트리밍)
export async function POST(request: NextRequest, routeContext: RouteContext) {
  try {
    const { id } = await routeContext.params
    const result = await prepareDocumentGeneration(id, 'pitch', 'pitch_summary', 'ai_doc_pitch')
    if (result instanceof Response) return result
    const ctx = result

    const promptVariables: Record<string, string> = {
      ...buildMinimalPromptVars(ctx),
      context: JSON.stringify({
        project_name: ctx.project.name,
        idea: { problem: ctx.ideaCard.problem, solution: ctx.ideaCard.solution, target: ctx.ideaCard.target, differentiation: ctx.ideaCard.differentiation },
        evaluation: { total_score: ctx.evaluation.total_score, recommendations: ctx.evaluation.recommendations },
      }, null, 2),
      idea_summary: ctx.ideaCard.raw_input || '',
      recommendations: Array.isArray(ctx.evaluation.recommendations) ? ctx.evaluation.recommendations.join(', ') : String(ctx.evaluation.recommendations ?? ''),
    }

    const prompt = await preparePrompt('pitch_summary', promptVariables)
    if (!prompt) return (await import('@/lib/utils/api-response')).errorResponse('피치 프롬프트를 찾을 수 없습니다.', 500)

    const { systemPrompt, userPrompt, model, temperature, maxTokens } = prompt

    async function* generateDocument() {
      let fullContent = ''
      yield { type: 'start', data: JSON.stringify({ type: 'pitch', model }) }

      for await (const event of streamClaude(systemPrompt, userPrompt, { model, temperature, maxTokens })) {
        if (event.type === 'text') {
          fullContent += event.data
          yield { type: 'text', data: event.data }
        }
      }

      const documentId = await saveDocument(await createClient(), {
        existingDocId: ctx.existingDocId,
        projectId: id,
        docType: 'pitch',
        title: `${ctx.project.name} 피치`,
        content: fullContent,
        model,
      })

      yield { type: 'complete', data: JSON.stringify({ documentId, type: 'pitch' }) }
    }

    return createSSEResponse(generateDocument())
  } catch (error) {
    return handleApiError(error)
  }
}
