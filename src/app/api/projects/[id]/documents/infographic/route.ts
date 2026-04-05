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
    const result = await prepareDocumentGeneration(id, 'infographic', 'doc_infographic', 'ai_doc_infographic')
    if (result instanceof Response) return result
    const ctx = result

    const prompt = await preparePrompt('doc_infographic', buildMinimalPromptVars(ctx))
    if (!prompt) return errorResponse('인포그래픽 프롬프트를 찾을 수 없습니다.', 500)

    const imageResult = await generateImage(prompt.systemPrompt, prompt.userPrompt, {
      model: prompt.model,
      temperature: prompt.temperature,
    })

    // Storage 업로드
    const ext = imageResult.mimeType === 'image/jpeg' ? 'jpg' : 'png'
    const fileName = `infographic-${id}-${Date.now()}.${ext}`
    const filePath = `infographics/${fileName}`

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
      docType: 'infographic',
      title: `${ctx.project.name} 인포그래픽`,
      content: imageUrl,
      model: prompt.model,
      storagePath: imageUrl,
      fileName,
    })

    return successResponse({ documentId, type: 'infographic', imageUrl, model: prompt.model })
  } catch (error) {
    return handleApiError(error)
  }
}
