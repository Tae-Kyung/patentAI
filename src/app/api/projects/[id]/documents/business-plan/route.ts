import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/utils/api-response'
import { preparePrompt } from '@/lib/prompts'
import { streamClaude, createSSEResponse } from '@/lib/ai/claude'
import { prepareDocumentGeneration, saveDocument, buildFullPromptVars } from '@/lib/services/document-generator'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST: 사업계획서 생성 (SSE 스트리밍)
export async function POST(request: NextRequest, routeContext: RouteContext) {
  try {
    const { id } = await routeContext.params
    const result = await prepareDocumentGeneration(id, 'business_plan', 'business_plan', 'ai_doc_business_plan')
    if (result instanceof Response) return result
    const ctx = result

    const promptVariables = buildFullPromptVars(ctx)
    const prompt = await preparePrompt('business_plan', promptVariables)
    if (!prompt) return (await import('@/lib/utils/api-response')).errorResponse('사업계획서 프롬프트를 찾을 수 없습니다.', 500)

    const { systemPrompt, userPrompt, model, temperature, maxTokens } = prompt

    async function* generateDocument() {
      let fullContent = ''
      yield { type: 'start', data: JSON.stringify({ type: 'business_plan', model }) }

      for await (const event of streamClaude(systemPrompt, userPrompt, { model, temperature, maxTokens })) {
        if (event.type === 'text') {
          fullContent += event.data
          yield { type: 'text', data: event.data }
        }
      }

      const documentId = await saveDocument(await createClient(), {
        existingDocId: ctx.existingDocId,
        projectId: id,
        docType: 'business_plan',
        title: `${ctx.project.name} 사업계획서`,
        content: fullContent,
        model,
      })

      yield { type: 'complete', data: JSON.stringify({ documentId, type: 'business_plan' }) }
    }

    return createSSEResponse(generateDocument())
  } catch (error) {
    return handleApiError(error)
  }
}
