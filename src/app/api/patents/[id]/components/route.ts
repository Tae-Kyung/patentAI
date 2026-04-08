import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import type { PatentComponent } from '@/types/database'

const addSchema = z.object({
  ref_number: z.string().min(1).max(10),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  order_index: z.number().int().min(0).optional(),
})

type ComponentNode = PatentComponent & { children: ComponentNode[] }

function buildTree(flat: PatentComponent[]): ComponentNode[] {
  const map = new Map<string, ComponentNode>()
  flat.forEach((c) => map.set(c.id, { ...c, children: [] }))

  const roots: ComponentNode[] = []
  flat.forEach((c) => {
    const node = map.get(c.id)!
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

// GET: 구성요소 트리 조회
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await requireAuth()
    const supabase = await createClient()

    const { data: project } = await supabase
      .from('patentai_patent_projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return errorResponse('프로젝트를 찾을 수 없습니다.', 404)

    const { data, error } = await supabase
      .from('patentai_patent_components')
      .select('*')
      .eq('project_id', id)
      .order('order_index', { ascending: true })

    if (error) return errorResponse('구성요소 조회 실패', 500)

    return successResponse(buildTree(data ?? []))
  } catch (error) {
    return handleApiError(error)
  }
}

// POST: 구성요소 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await requireAuth()
    const supabase = await createClient()

    const { data: project } = await supabase
      .from('patentai_patent_projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return errorResponse('프로젝트를 찾을 수 없습니다.', 404)

    const body = await request.json()
    const parsed = addSchema.safeParse(body)
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400)

    // 참조번호 중복 확인
    const { data: existing } = await supabase
      .from('patentai_patent_components')
      .select('id')
      .eq('project_id', id)
      .eq('ref_number', parsed.data.ref_number)
      .single()

    if (existing) return errorResponse(`참조번호 (${parsed.data.ref_number})이 이미 사용 중입니다.`, 409)

    const { data, error } = await supabase
      .from('patentai_patent_components')
      .insert({ project_id: id, ...parsed.data })
      .select()
      .single()

    if (error) return errorResponse('구성요소 추가 실패', 500)

    return successResponse(data, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
