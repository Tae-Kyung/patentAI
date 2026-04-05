import { requireAdmin } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, handleApiError } from '@/lib/utils/api-response'

// POST: 기존 match 알림에 프로젝트 이름 추가 (일회성 마이그레이션)
export async function POST() {
  try {
    await requireAdmin()

    const supabase = createServiceClient()

    // 1. 프로젝트 이름이 없는 match 알림 조회
    const { data: notifications, error: nError } = await supabase
      .from('bi_notifications')
      .select('id, user_id, created_at')
      .eq('type', 'match')
      .eq('title', '새로운 프로젝트가 배정되었습니다.')

    if (nError || !notifications || notifications.length === 0) {
      return successResponse({ updated: 0, message: '수정할 알림이 없습니다.' })
    }

    let updated = 0

    for (const notif of notifications) {
      // 2. 알림 생성 시간 기준 ±5초 이내에 해당 멘토에게 생성된 매칭 찾기
      const createdAt = new Date(notif.created_at)
      const before = new Date(createdAt.getTime() - 5000).toISOString()
      const after = new Date(createdAt.getTime() + 5000).toISOString()

      const { data: matches } = await supabase
        .from('bi_mentor_matches')
        .select('project_id')
        .eq('mentor_id', notif.user_id)
        .gte('created_at', before)
        .lte('created_at', after)
        .limit(1)

      if (!matches || matches.length === 0) continue

      const projectId = matches[0].project_id

      // 3. 프로젝트 이름 조회
      const { data: project } = await supabase
        .from('bi_projects')
        .select('name')
        .eq('id', projectId)
        .single()

      if (!project) continue

      // 4. 알림 업데이트
      const { error: updateError } = await supabase
        .from('bi_notifications')
        .update({
          title: `새로운 프로젝트가 배정되었습니다: ${project.name}`,
          link: `/projects/${projectId}`,
        })
        .eq('id', notif.id)

      if (!updateError) updated++
    }

    return successResponse({
      total: notifications.length,
      updated,
      message: `${updated}건의 알림이 수정되었습니다.`,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
