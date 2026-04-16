import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY || '' })

export interface GeminiOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  jsonMode?: boolean
  /** Thinking 토큰 예산 (0=비활성, -1=동적). Gemini 2.5만 해당. */
  thinkingBudget?: number
}

export interface GeminiResponse {
  content: string
  usage: {
    inputTokens: number
    outputTokens: number
  }
  stopReason: string | null
}

export interface GeminiImageResponse {
  imageData: Buffer
  mimeType: string
  textContent: string | null
}

/**
 * Gemini 이미지 생성 API 호출
 * gemini-2.5-flash-image-preview 모델 사용
 */
export async function generateImage(
  systemPrompt: string,
  userPrompt: string,
  options: GeminiOptions = {}
): Promise<GeminiImageResponse> {
  const {
    model = 'gemini-2.5-flash-image',
    temperature = 0.7,
  } = options

  // system prompt를 user prompt 앞에 합쳐서 전달
  // (이미지 생성 모델은 systemInstruction을 지원하지 않을 수 있음)
  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n---\n\n${userPrompt}`
    : userPrompt

  const response = await ai.models.generateContent({
    model,
    contents: fullPrompt,
    config: {
      temperature,
      responseModalities: ['TEXT', 'IMAGE'],
    },
  })

  let imageData: Buffer | null = null
  let mimeType = 'image/png'
  let textContent: string | null = null

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        imageData = Buffer.from(part.inlineData.data!, 'base64')
        mimeType = part.inlineData.mimeType || 'image/png'
      } else if (part.text) {
        textContent = part.text
      }
    }
  }

  if (!imageData) {
    throw new Error('이미지 생성에 실패했습니다. 모델이 이미지를 반환하지 않았습니다.')
  }

  return { imageData, mimeType, textContent }
}

/**
 * Gemini Vision — 이미지 분석 (도면 해석용)
 * @param imageBuffer 이미지 바이너리
 * @param mimeType 이미지 MIME 타입
 * @param prompt 분석 지시 프롬프트
 */
export async function analyzeImageWithVision(
  imageBuffer: Buffer,
  mimeType: string,
  prompt: string,
  options: GeminiOptions = {}
): Promise<string> {
  const { model = 'gemini-2.5-flash', temperature = 0.3 } = options

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { data: imageBuffer.toString('base64'), mimeType } },
          { text: prompt },
        ],
      },
    ],
    config: { temperature },
  })

  return response.text ?? ''
}

/**
 * Gemini Vision + 이미지 생성 — 외부 도면을 특허 도면 스타일로 변환
 * @param imageBuffer 원본 이미지 버퍼
 * @param mimeType 이미지 MIME 타입
 * @param systemPrompt 도면 생성 시스템 프롬프트
 * @param userPrompt 변환 지시
 */
export async function simplifyDrawingToPatentStyle(
  imageBuffer: Buffer,
  mimeType: string,
  systemPrompt: string,
  userPrompt: string,
  options: GeminiOptions = {}
): Promise<GeminiImageResponse> {
  const { model = 'gemini-2.5-flash-image', temperature = 0.4 } = options

  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n---\n\n${userPrompt}` : userPrompt

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { data: imageBuffer.toString('base64'), mimeType } },
          { text: fullPrompt },
        ],
      },
    ],
    config: {
      temperature,
      responseModalities: ['TEXT', 'IMAGE'],
    },
  })

  let imageData: Buffer | null = null
  let outMimeType = 'image/png'
  let textContent: string | null = null

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        imageData = Buffer.from(part.inlineData.data!, 'base64')
        outMimeType = part.inlineData.mimeType || 'image/png'
      } else if (part.text) {
        textContent = part.text
      }
    }
  }

  if (!imageData) {
    throw new Error('특허 도면 변환 실패: 이미지를 반환하지 않았습니다.')
  }

  return { imageData, mimeType: outMimeType, textContent }
}

/**
 * Gemini API 동기 호출
 */
export async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  options: GeminiOptions = {}
): Promise<GeminiResponse> {
  const {
    model = 'gemini-2.5-flash',
    temperature = 0.7,
    maxTokens = 2000,
  } = options

  const response = await ai.models.generateContent({
    model,
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      temperature,
      maxOutputTokens: maxTokens,
      ...(options.jsonMode && { responseMimeType: 'application/json' }),
      // jsonMode 시 thinking 비활성화 (Gemini 2.5에서 JSON 모드와 thinking 충돌 방지)
      ...(options.jsonMode
        ? { thinkingConfig: { thinkingBudget: 0 } }
        : options.thinkingBudget !== undefined
          ? { thinkingConfig: { thinkingBudget: options.thinkingBudget } }
          : {}),
    },
  })

  const content = response.text ?? ''
  const usageMetadata = response.usageMetadata

  return {
    content,
    usage: {
      inputTokens: usageMetadata?.promptTokenCount || 0,
      outputTokens: usageMetadata?.candidatesTokenCount || 0,
    },
    stopReason: response.candidates?.[0]?.finishReason || null,
  }
}

/**
 * Gemini API 스트리밍 호출
 * SSE 이벤트를 생성하는 AsyncGenerator 반환
 */
export async function* streamGemini(
  systemPrompt: string,
  userPrompt: string,
  options: GeminiOptions = {}
): AsyncGenerator<{ type: string; data: string }, void, unknown> {
  const {
    model = 'gemini-2.5-flash',
    temperature = 0.7,
    maxTokens = 2000,
  } = options

  const stream = await ai.models.generateContentStream({
    model,
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      temperature,
      maxOutputTokens: maxTokens,
      ...(options.jsonMode && { responseMimeType: 'application/json' }),
      ...(options.thinkingBudget !== undefined && {
        thinkingConfig: { thinkingBudget: options.thinkingBudget },
      }),
    },
  })

  for await (const chunk of stream) {
    // 새 SDK의 .text는 thinking 파트를 자동 제외
    const text = chunk.text
    if (text) {
      yield { type: 'text', data: text }
    }
  }

  yield { type: 'done', data: '' }
}
