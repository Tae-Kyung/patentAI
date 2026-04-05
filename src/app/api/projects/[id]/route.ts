import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth, requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

// 프로젝트 업데이트 스키마
const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(['draft', 'in_progress', 'completed', 'archived']).optional(),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET: 프로젝트 상세 조회
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireAuth()

    const { id } = await context.params
    const serviceClient = createServiceClient()

    // 프로젝트와 관련 데이터 조회 (serviceClient로 RLS bypass)
    const { data: project, error } = await serviceClient
      .from('bi_projects')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !project) {
      return errorResponse('프로젝트를 찾을 수 없습니다.', 404)
    }

    // 접근 권한 확인: 프로젝트 소유자 또는 배정된 멘토
    const isOwner = project.user_id === user.id
    let mentorRole: string | null = null

    if (!isOwner) {
      const { data: match } = await serviceClient
        .from('bi_mentor_matches')
        .select('mentor_role')
        .eq('project_id', id)
        .eq('mentor_id', user.id)
        .limit(1)
        .single()

      if (!match) {
        // 관리자인지 확인
        const { data: biUser } = await serviceClient
          .from('bi_users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (biUser?.role !== 'admin') {
          return errorResponse('프로젝트에 대한 접근 권한이 없습니다.', 403)
        }
      } else {
        mentorRole = match.mentor_role
      }
    }

    // 관련 데이터 병렬 조회
    const [
      { data: ideaCard },
      { data: evaluation },
      { data: documents },
      { data: businessReview },
    ] = await Promise.all([
      serviceClient
        .from('bi_idea_cards')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      serviceClient
        .from('bi_evaluations')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      serviceClient
        .from('bi_documents')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false }),
      project.project_type === 'startup'
        ? serviceClient
            .from('bi_business_reviews')
            .select('*')
            .eq('project_id', id)
            .limit(1)
            .single()
        : Promise.resolve({ data: null }),
    ])

    return successResponse({
      ...project,
      ideaCard: ideaCard || null,
      evaluation: evaluation || null,
      documents: documents || [],
      businessReview: businessReview || null,
      mentorRole,
      isOwner,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH: 프로젝트 수정
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)

    const body = await request.json()
    const validatedData = updateProjectSchema.parse(body)

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('bi_projects')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return errorResponse('프로젝트 업데이트에 실패했습니다.', 500)
    }

    return successResponse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}

// DELETE: 프로젝트 삭제
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)

    const supabase = await createClient()

    const { error } = await supabase
      .from('bi_projects')
      .delete()
      .eq('id', id)

    if (error) {
      return errorResponse('프로젝트 삭제에 실패했습니다.', 500)
    }

    return successResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
