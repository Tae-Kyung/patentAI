import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { callGemini, generateImage } from '@/lib/ai/gemini'
import { preparePrompt } from '@/lib/prompts'
import { prepareDocumentGeneration, buildMinimalPromptVars, removeCodeFence, saveDocument } from '@/lib/services/document-generator'

// Phase 1 (story) + Phase 2 (8 images) 병렬 생성이므로 타임아웃 확장
export const maxDuration = 300

interface RouteContext {
  params: Promise<{ id: string }>
}

const IMAGE_MODEL = 'gemini-3-pro-image-preview'

/**
 * 시스템 프롬프트에서 시나리오 기획 프롬프트와 이미지 스타일 프리픽스를 분리
 */
function parseSystemPrompt(systemPrompt: string): { storySystemPrompt: string; slideStylePrefix: string } {
  const separator = '---SLIDE_STYLE---'
  const parts = systemPrompt.split(separator)
  return {
    storySystemPrompt: parts[0].trim(),
    slideStylePrefix: parts.length > 1
      ? parts[1].trim()
      : 'High-quality professional startup pitch deck slide, 16:9 aspect ratio, polished corporate presentation design.',
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params

    // 공통 준비 (인증, 크레딧, Gate 2, 데이터 조회)
    const result = await prepareDocumentGeneration(id, 'ppt_image', 'doc_ppt_image', 'ai_doc_ppt_image')
    if (result instanceof Response) return result
    const ctx = result

    // 프롬프트 로드
    const prompt = await preparePrompt('doc_ppt_image', buildMinimalPromptVars(ctx))
    if (!prompt) {
      return errorResponse('PPT 이미지 프롬프트를 찾을 수 없습니다.', 500)
    }

    const { storySystemPrompt, slideStylePrefix } = parseSystemPrompt(prompt.systemPrompt)

    // ─── Phase 1: 텍스트 모델로 발표 시나리오 기획 ───
    const storyResponse = await callGemini(storySystemPrompt, prompt.userPrompt, {
      model: prompt.model,
      temperature: prompt.temperature,
      maxTokens: prompt.maxTokens,
      jsonMode: true,
    })

    let storyData: Record<string, unknown>
    try {
      const cleanContent = removeCodeFence(storyResponse.content.trim(), 'json')
      storyData = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('Story JSON parse failed:', storyResponse.content.slice(0, 500))
      const detail = parseError instanceof Error ? parseError.message : ''
      return errorResponse(`스토리 생성에 실패했습니다. (${detail}) 다시 시도해주세요.`, 500)
    }

    const slides = Array.isArray(storyData.slides) ? storyData.slides : []
    if (slides.length === 0) {
      return errorResponse('슬라이드 스토리를 생성하지 못했습니다. 다시 시도해주세요.', 500)
    }

    const colorScheme = typeof storyData.colorScheme === 'string'
      ? storyData.colorScheme
      : 'dark navy to purple gradient with cyan and white accents'
    const theme = typeof storyData.theme === 'string'
      ? storyData.theme
      : 'modern'

    // ─── Phase 2: 스토리 기반 이미지 병렬 생성 ───
    const imageResults = await Promise.allSettled(
      slides.map(async (slide: Record<string, unknown>, index: number) => {
        const imagePrompt = typeof slide.imagePrompt === 'string'
          ? slide.imagePrompt
          : `Professional presentation slide ${index + 1}, ${theme} style, ${colorScheme}`

        const fullPrompt = `${slideStylePrefix} Style: ${theme}, Color scheme: ${colorScheme}. Slide ${index + 1} of ${slides.length}. ${imagePrompt}`

        const imgResult = await generateImage('', fullPrompt, {
          model: IMAGE_MODEL,
          temperature: 0.8,
        })
        return { index, ...imgResult }
      })
    )

    // 성공한 이미지들 업로드 (순서 유지)
    const supabase = await createClient()
    const imageUrls: string[] = []
    const orderedResults: { index: number; imageData: Buffer; mimeType: string }[] = []
    const failedReasons: string[] = []
    const timestamp = Date.now()

    for (const r of imageResults) {
      if (r.status === 'fulfilled') {
        orderedResults.push(r.value)
      } else {
        const reason = r.reason instanceof Error ? r.reason.message : String(r.reason)
        failedReasons.push(reason)
        console.error('Failed to generate slide:', reason)
      }
    }

    orderedResults.sort((a, b) => a.index - b.index)

    for (const { index, imageData, mimeType } of orderedResults) {
      const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png'
      const fileName = `ppt-image-${id}-slide${index + 1}-${timestamp}.${ext}`
      const filePath = `ppt-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, imageData, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          return errorResponse(
            '스토리지 버킷(documents)이 설정되지 않았습니다. 관리자에게 문의하세요.',
            500
          )
        }
        console.error(`Failed to upload slide ${index + 1}:`, uploadError)
        continue
      }

      const { data: publicUrl } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      imageUrls.push(publicUrl.publicUrl)
    }

    if (imageUrls.length === 0) {
      const detail = failedReasons.length > 0 ? ` (${failedReasons[0]})` : ''
      return errorResponse(`이미지 생성에 실패했습니다.${detail}`, 500)
    }

    // ─── Phase 3: DB 저장 ───
    const contentJson = JSON.stringify(imageUrls)
    const modelUsed = `${prompt.model} + ${IMAGE_MODEL}`

    const documentId = await saveDocument(ctx.supabase, {
      existingDocId: ctx.existingDocId,
      projectId: id,
      docType: 'ppt_image',
      title: `${ctx.project.name} 서비스 소개 PPT (이미지)`,
      content: contentJson,
      model: modelUsed,
      storagePath: imageUrls[0],
      fileName: `ppt-image-${id}-${timestamp}`,
    })

    return successResponse({
      documentId,
      type: 'ppt_image',
      imageUrls,
      slideCount: imageUrls.length,
      totalSlides: slides.length,
      model: modelUsed,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
