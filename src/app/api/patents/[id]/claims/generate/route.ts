import { NextRequest } from 'next/server'
import { z } from 'zod'
import { preparePatentGeneration, stripCodeFence } from '@/lib/services/patent-generator'
import { streamClaude, createSSEResponse } from '@/lib/ai/claude'
import { preparePrompt } from '@/lib/prompts'
import { errorResponse } from '@/lib/utils/api-response'

const PROMPT_KEY = 'patent_claims_generation'

const bodySchema = z.object({
  claim_type: z.enum(['apparatus', 'method', 'system']).default('apparatus'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const body = await request.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400)

  // GATE 2 통과 확인
  const ctx = await preparePatentGeneration(id, PROMPT_KEY, 2)
  if (ctx instanceof Response) return ctx

  const { supabase, project } = ctx

  // 구성요소 트리 조회
  const { data: components } = await supabase
    .from('patentai_patent_components')
    .select('ref_number, name, description, has_prior_art_conflict, conflict_risk')
    .eq('project_id', id)
    .order('order_index', { ascending: true })

  // 선행기술 회피 전략 조회
  const { data: priorArts } = await supabase
    .from('patentai_patent_prior_art')
    .select('patent_number, title, risk_level, avoidance_suggestion')
    .eq('project_id', id)
    .not('avoidance_suggestion', 'is', null)

  const prepared = await preparePrompt(PROMPT_KEY, {
    claim_type: parsed.data.claim_type,
    tech_domain: project.tech_domain ?? '',
    core_inventions: JSON.stringify(project.core_inventions, null, 2),
    components: JSON.stringify(
      (components ?? []).map((c) => ({
        ref_number: c.ref_number,
        name: c.name,
        description: c.description,
        has_conflict: c.has_prior_art_conflict,
      })),
      null,
      2,
    ),
    avoidance_strategy: JSON.stringify(
      (priorArts ?? []).map((p) => ({
        patent: p.patent_number,
        risk: p.risk_level,
        suggestion: p.avoidance_suggestion,
      })),
      null,
      2,
    ),
  })

  if (!prepared) return errorResponse('프롬프트를 불러올 수 없습니다.', 500)

  async function* generate() {
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

    try {
      const json = JSON.parse(stripCodeFence(fullText))

      // 기존 청구항 삭제 후 재삽입
      await supabase.from('patentai_patent_claims').delete().eq('project_id', id)

      type RawClaim = {
        claim_number: number
        claim_type: 'independent' | 'dependent'
        parent_claim_number?: number | null
        content: string
      }

      const claims: RawClaim[] = json.claims ?? []

      // claim_number → id 매핑
      const numToId = new Map<number, string>()

      // 독립항 먼저 삽입
      const ordered = [
        ...claims.filter((c) => c.claim_type === 'independent'),
        ...claims.filter((c) => c.claim_type === 'dependent'),
      ]

      for (const claim of ordered) {
        const parentId = claim.parent_claim_number
          ? (numToId.get(claim.parent_claim_number) ?? null)
          : null

        const { data: inserted } = await supabase
          .from('patentai_patent_claims')
          .insert({
            project_id: id,
            claim_number: claim.claim_number,
            claim_type: claim.claim_type,
            parent_claim_id: parentId,
            content: claim.content,
          })
          .select('id')
          .single()

        if (inserted) numToId.set(claim.claim_number, inserted.id)
      }

      yield { type: 'result', data: JSON.stringify(json) }
    } catch (err) {
      console.error('Claims generation parse error:', err)
      yield { type: 'error', data: '청구항 파싱에 실패했습니다.' }
    }

    yield { type: 'done', data: '' }
  }

  return createSSEResponse(generate())
}
