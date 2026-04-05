import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, errorResponse } from '@/lib/utils/api-response'
import { preparePrompt } from '@/lib/prompts'
import { createSSEResponse } from '@/lib/ai/claude'
import { streamGemini } from '@/lib/ai/gemini'
import { buildPptHtml } from '@/lib/templates/ppt-template'
import { prepareDocumentGeneration, saveDocument, buildMinimalPromptVars, removeCodeFence } from '@/lib/services/document-generator'

export const maxDuration = 120

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const result = await prepareDocumentGeneration(id, 'ppt', 'doc_ppt', 'ai_doc_ppt')
    if (result instanceof Response) return result
    const ctx = result

    const prompt = await preparePrompt('doc_ppt', buildMinimalPromptVars(ctx))
    if (!prompt) return errorResponse('PPT 프롬프트를 찾을 수 없습니다.', 500)

    const { systemPrompt, userPrompt, model, temperature, maxTokens } = prompt

    async function* generateDocument() {
      let fullJson = ''
      yield { type: 'start', data: JSON.stringify({ type: 'ppt', model }) }

      for await (const event of streamGemini(systemPrompt, userPrompt, { model, temperature, maxTokens, thinkingBudget: 0, jsonMode: true })) {
        if (event.type === 'text') {
          fullJson += event.data
          yield { type: 'text', data: event.data }
        }
      }

      fullJson = removeCodeFence(fullJson, 'json')

      let parsedJson: Record<string, unknown>
      try {
        parsedJson = JSON.parse(fullJson) as Record<string, unknown>
      } catch {
        // JSON 파싱 실패 시 원본 저장 (폴백)
        const documentId = await saveDocument(await createClient(), {
          existingDocId: ctx.existingDocId, projectId: id, docType: 'ppt',
          title: `${ctx.project.name} 서비스 소개 PPT`, content: fullJson, model,
        })
        yield { type: 'complete', data: JSON.stringify({ documentId, type: 'ppt' }) }
        return
      }

      const finalHtml = buildPptHtml(parsedJson)
      const documentId = await saveDocument(await createClient(), {
        existingDocId: ctx.existingDocId, projectId: id, docType: 'ppt',
        title: `${ctx.project.name} 서비스 소개 PPT`, content: finalHtml, model,
      })

      yield { type: 'complete', data: JSON.stringify({ documentId, type: 'ppt' }) }
    }

    return createSSEResponse(generateDocument())
  } catch (error) {
    return handleApiError(error)
  }
}
