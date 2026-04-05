import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse } from '@/lib/utils/api-response'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

// GPT-4o 거절 응답 감지
function isRefusalResponse(text: string): boolean {
  const refusalPatterns = [
    /^죄송/,
    /^I('m| am) sorry/i,
    /텍스트를 추출할 수 없/,
    /cannot (extract|read|process)/i,
    /unable to (extract|read|process)/i,
    /다른 도움이 필요/,
  ]
  return refusalPatterns.some((pattern) => pattern.test(text.trim()))
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return errorResponse('Unauthorized', 401)

    const body = await request.json()
    const { images, pageCount } = body as { images: string[]; pageCount: number }

    if (!Array.isArray(images) || images.length === 0) {
      return errorResponse('이미지 데이터가 없습니다.', 400)
    }

    const content: OpenAI.Chat.ChatCompletionContentPart[] = [
      {
        type: 'text',
        text: `You are an OCR assistant. Extract ALL text from the following ${images.length} document page image(s). Output ONLY the extracted text content, preserving the original order. Do not add any commentary, explanations, or preamble. If the text is in Korean, output it in Korean exactly as written.`,
      },
    ]

    for (const image of images) {
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${image}`,
          detail: 'high',
        },
      })
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      messages: [
        {
          role: 'system',
          content:
            'You are a precise OCR assistant. When given document images, you extract and output all text content exactly as it appears. You never refuse OCR tasks. Output only the extracted text with no additional commentary.',
        },
        { role: 'user', content },
      ],
    })

    const text = response.choices[0]?.message?.content || ''

    if (isRefusalResponse(text)) {
      return errorResponse('OCR_REFUSED', 422)
    }

    return successResponse({ text, pageCount: images.length })
  } catch (error) {
    console.error('PDF OCR error:', error)
    return errorResponse('OCR 처리 중 오류가 발생했습니다.', 500)
  }
}
