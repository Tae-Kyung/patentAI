import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/utils/api-response'
import { preparePrompt } from '@/lib/prompts'
import { streamClaude, createSSEResponse } from '@/lib/ai/claude'
import { prepareDocumentGeneration, saveDocument, buildFullPromptVars, removeCodeFence } from '@/lib/services/document-generator'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST: 랜딩페이지 생성 (SSE 스트리밍)
export async function POST(request: NextRequest, routeContext: RouteContext) {
  try {
    const { id } = await routeContext.params
    const result = await prepareDocumentGeneration(id, 'landing', 'doc_landing', 'ai_doc_landing')
    if (result instanceof Response) return result
    const ctx = result

    const promptVariables = buildFullPromptVars(ctx)
    const prompt = await preparePrompt('doc_landing', promptVariables)
    if (!prompt) return (await import('@/lib/utils/api-response')).errorResponse('랜딩페이지 프롬프트를 찾을 수 없습니다.', 500)

    const { systemPrompt, userPrompt, model, temperature, maxTokens } = prompt

    async function* generateDocument() {
      let fullContent = ''
      yield { type: 'start', data: JSON.stringify({ type: 'landing', model }) }

      for await (const event of streamClaude(systemPrompt, userPrompt, { model, temperature, maxTokens })) {
        if (event.type === 'text') {
          fullContent += event.data
          yield { type: 'text', data: event.data }
        }
      }

      fullContent = removeCodeFence(fullContent, 'html')

      const documentId = await saveDocument(await createClient(), {
        existingDocId: ctx.existingDocId,
        projectId: id,
        docType: 'landing',
        title: `${ctx.project.name} 랜딩페이지`,
        content: fullContent,
        model,
      })

      yield { type: 'complete', data: JSON.stringify({ documentId, type: 'landing' }) }
    }

    return createSSEResponse(generateDocument())
  } catch (error) {
    return handleApiError(error)
  }
}
