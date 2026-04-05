import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { deductCredit } from '@/lib/credits'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { streamAI, createSSEResponse } from '@/lib/ai'
import { getPrompt, renderTemplate } from '@/lib/prompts/prompt-engine'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ id: string; docId: string }>
}

const reviseSchema = z.object({
  section: z.string().min(1, '섹션을 선택해주세요.'),
  instruction: z.string().min(10, '수정 지시사항은 10자 이상이어야 합니다.'),
})

// POST: 문서 섹션 수정 요청 (SSE)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id, docId } = await context.params
    const user = await requireProjectOwner(id)
    await deductCredit(user.id, 'ai_doc_revise', id)

    const supabase = await createClient()

    // 문서 조회
    const { data: document, error: docError } = await supabase
      .from('bi_documents')
      .select('*')
      .eq('id', docId)
      .eq('project_id', id)
      .single()

    if (docError || !document) {
      return errorResponse('문서를 찾을 수 없습니다.', 404)
    }

    if (document.is_confirmed) {
      return errorResponse('이미 확정된 문서는 수정할 수 없습니다.', 400)
    }

    const body = await request.json()
    const { section, instruction } = reviseSchema.parse(body)

    // 수정 요청 기록 추가
    interface RevisionRequest {
      section: string
      instruction: string
      requested_at: string
    }
    const existingRequests = Array.isArray(document.revision_requests)
      ? (document.revision_requests as unknown as RevisionRequest[])
      : []
    const revisionRequests = [
      ...existingRequests,
      {
        section,
        instruction,
        requested_at: new Date().toISOString(),
      },
    ]

    // 프롬프트 조회
    const prompt = await getPrompt('section_revise')

    const systemPrompt = prompt?.system_prompt || `You are a professional business document editor.
Your task is to revise a specific section of the document based on the user's instructions.
Maintain the overall tone and format of the document while making the requested changes.
Return ONLY the revised section content, not the entire document.
Write in Korean.`

    const userTemplate = prompt?.user_prompt_template || `## Current Document
{{document_content}}

## Section to Revise
{{section}}

## Revision Instructions
{{instruction}}

Please revise only the specified section according to the instructions. Return the revised section content only.`

    const userPrompt = renderTemplate(userTemplate, {
      document_content: document.content || '',
      section,
      instruction,
    })

    // AI 스트리밍 응답 생성
    async function* generateRevision() {
      let revisedContent = ''

      yield { type: 'start', data: JSON.stringify({ section, instruction }) }

      const stream = streamAI(systemPrompt, userPrompt, {
        maxTokens: 2000,
        temperature: 0.7,
      })

      for await (const event of stream) {
        if (event.type === 'text') {
          revisedContent += event.data
          yield { type: 'text', data: event.data }
        }
      }

      // 원본 문서에서 해당 섹션 찾아서 교체
      // 섹션은 보통 "## 섹션명" 형식으로 시작
      const sectionPattern = new RegExp(
        `(##\\s*${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?)(?=##\\s|$)`,
        'i'
      )

      const originalContent = document?.content || ''
      let updatedContent = originalContent
      if (sectionPattern.test(originalContent)) {
        updatedContent = originalContent.replace(sectionPattern, revisedContent + '\n\n')
      } else {
        // 섹션을 찾지 못한 경우, 사용자 지시에 따라 적절히 삽입
        updatedContent = originalContent + '\n\n' + revisedContent
      }

      // 문서 업데이트
      const { error: updateError } = await supabase
        .from('bi_documents')
        .update({
          content: updatedContent,
          revision_requests: JSON.parse(JSON.stringify(revisionRequests)),
          revision_count: (document?.revision_count || 0) + 1,
        })
        .eq('id', docId)

      if (updateError) {
        yield { type: 'error', data: '문서 업데이트에 실패했습니다.' }
        return
      }

      yield {
        type: 'complete',
        data: JSON.stringify({
          section,
          revisedContent,
          revisionCount: (document?.revision_count || 0) + 1,
        }),
      }
      yield { type: 'done', data: '' }
    }

    return createSSEResponse(generateRevision())
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || '유효성 검사 오류', 400)
    }
    return handleApiError(error)
  }
}
