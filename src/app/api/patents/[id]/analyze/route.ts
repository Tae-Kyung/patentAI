import { NextRequest } from 'next/server'
import { preparePatentGeneration, stripCodeFence } from '@/lib/services/patent-generator'
import { streamClaude, createSSEResponse } from '@/lib/ai/claude'
import { preparePrompt } from '@/lib/prompts'
import { errorResponse } from '@/lib/utils/api-response'

const PROMPT_KEY = 'patent_tech_analysis'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const ctx = await preparePatentGeneration(id, PROMPT_KEY, null)
  if (ctx instanceof Response) return ctx

  const { supabase } = ctx

  // 프로젝트의 모든 입력 텍스트 수집
  const { data: inputs } = await supabase
    .from('patentai_patent_inputs')
    .select('content, file_name, type')
    .eq('project_id', id)
    .order('created_at', { ascending: true })

  if (!inputs || inputs.length === 0) {
    return errorResponse('분석할 입력 내용이 없습니다. 먼저 내용을 입력하거나 파일을 업로드하세요.', 400)
  }

  const inputContent = inputs
    .map((inp) => {
      const label = inp.file_name ? `[파일: ${inp.file_name}]` : '[텍스트 입력]'
      return `${label}\n${inp.content ?? ''}`
    })
    .join('\n\n---\n\n')

  const prepared = await preparePrompt(PROMPT_KEY, { input_content: inputContent })
  if (!prepared) return errorResponse('프롬프트를 불러올 수 없습니다.', 500)

  async function* analyze() {
    let fullText = ''

    for await (const event of streamClaude(prepared!.systemPrompt, prepared!.userPrompt, {
      model: prepared!.model,
      temperature: prepared!.temperature,
      maxTokens: prepared!.maxTokens,
    })) {
      if (event.type === 'text') {
        fullText += event.data
        yield { type: 'text', data: event.data }
      }
    }

    // JSON 파싱 및 DB 저장
    try {
      const json = JSON.parse(stripCodeFence(fullText))

      await supabase
        .from('patentai_patent_projects')
        .update({
          tech_domain: json.tech_domain ?? null,
          ipc_codes: json.ipc_suggestions ?? [],
          core_inventions: json.core_inventions ?? [],
        })
        .eq('id', id)

      // 분석 결과를 가장 최근 inputs 레코드에 저장
      const { data: latestInput } = await supabase
        .from('patentai_patent_inputs')
        .select('id')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (latestInput) {
        await supabase
          .from('patentai_patent_inputs')
          .update({ analysis_result: json })
          .eq('id', latestInput.id)
      }

      yield { type: 'result', data: JSON.stringify(json) }
    } catch (err) {
      console.error('Analysis JSON parse error:', err)
      yield { type: 'error', data: '분석 결과 파싱에 실패했습니다.' }
    }

    yield { type: 'done', data: '' }
  }

  return createSSEResponse(analyze())
}
