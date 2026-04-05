import { NextRequest } from 'next/server'
import { successResponse, handleApiError, errorResponse } from '@/lib/utils/api-response'
import { preparePrompt } from '@/lib/prompts'
import { generateImage } from '@/lib/ai/gemini'
import { prepareDocumentGeneration, saveDocument, buildMinimalPromptVars } from '@/lib/services/document-generator'

export const maxDuration = 120

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const result = await prepareDocumentGeneration(id, 'leaflet', 'doc_leaflet', 'ai_doc_leaflet')
    if (result instanceof Response) return result
    const ctx = result

    const prompt = await preparePrompt('doc_leaflet', buildMinimalPromptVars(ctx))
    if (!prompt) return errorResponse('리플렛 프롬프트를 찾을 수 없습니다.', 500)

    const imageResult = await generateImage(prompt.systemPrompt, prompt.userPrompt, {
      model: prompt.model,
      temperature: prompt.temperature,
    })

    const ext = imageResult.mimeType === 'image/jpeg' ? 'jpg' : 'png'
    const fileName = `leaflet-${id}-${Date.now()}.${ext}`
    const filePath = `leaflets/${fileName}`

    const { error: uploadError } = await ctx.supabase.storage
      .from('documents')
      .upload(filePath, imageResult.imageData, { contentType: imageResult.mimeType, cacheControl: '3600', upsert: true })

    if (uploadError) {
      if (uploadError.message.includes('Bucket not found')) {
        return errorResponse('스토리지 버킷(documents)이 설정되지 않았습니다. 관리자에게 문의하세요.', 500)
      }
      throw uploadError
    }

    const { data: publicUrl } = ctx.supabase.storage.from('documents').getPublicUrl(filePath)
    const imageUrl = publicUrl.publicUrl

    const documentId = await saveDocument(ctx.supabase, {
      existingDocId: ctx.existingDocId,
      projectId: id,
      docType: 'leaflet',
      title: `${ctx.project.name} 홍보 리플렛`,
      content: imageUrl,
      model: prompt.model,
      storagePath: imageUrl,
      fileName,
    })

    return successResponse({ documentId, type: 'leaflet', imageUrl, model: prompt.model })
  } catch (error) {
    return handleApiError(error)
  }
}
