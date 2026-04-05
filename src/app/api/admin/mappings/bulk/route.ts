import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { logAudit, extractRequestInfo } from '@/lib/security/audit'

const bulkMappingSchema = z.object({
  project_ids: z.array(z.string().uuid()).min(1).max(100),
  institution_id: z.string().uuid(),
  program_id: z.string().uuid(),
})

// POST: 일괄 매핑
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()

    const body = await request.json()
    const { project_ids, institution_id, program_id } = bulkMappingSchema.parse(body)

    const supabase = createServiceClient()

    // 이미 다른 기관에 매핑된 프로젝트 확인
    const { data: existingMaps } = await supabase
      .from('bi_project_institution_maps')
      .select('project_id, institution_id')
      .in('project_id', project_ids)

    const conflictProjects = (existingMaps || []).filter(
      (m) => m.institution_id !== institution_id
    )
    if (conflictProjects.length > 0) {
      return errorResponse(
        `${conflictProjects.length}건의 프로젝트가 이미 다른 기관에 매핑되어 있습니다.`,
        409
      )
    }

    const mappings = project_ids.map((project_id) => ({
      project_id,
      institution_id,
      program_id,
    }))

    const { data, error } = await supabase
      .from('bi_project_institution_maps')
      .upsert(mappings, { onConflict: 'project_id,institution_id' })
      .select()

    if (error) {
      console.error('Bulk mapping error:', error.message)
      return errorResponse('일괄 매핑에 실패했습니다.', 500)
    }

    const { ipAddress, userAgent } = extractRequestInfo(request)
    await logAudit({
      userId: admin.id,
      action: 'bulk_mapping',
      resourceType: 'project_institution_map',
      details: { count: project_ids.length, institution_id, program_id },
      ipAddress,
      userAgent,
    })

    return successResponse({
      message: `${data?.length || 0}건의 매핑이 완료되었습니다.`,
      count: data?.length || 0,
    }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
