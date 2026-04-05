import { requireMentor } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, handleApiError } from '@/lib/utils/api-response'

export async function GET() {
  try {
    await requireMentor()

    const supabase = createServiceClient()

    // 병렬 쿼리 실행
    const [
      usersResult,
      projectsResult,
      approvalsResult,
      documentsResult,
      recentUsersResult,
      projectTypesResult,
      creditLogsResult,
      recentProjectsResult,
      recentDocumentsResult,
    ] = await Promise.all([
      // 전체 사용자 수 + 역할별
      supabase.from('bi_users').select('role'),
      // 전체 프로젝트 수 + 단계별
      supabase.from('bi_projects').select('current_stage'),
      // 승인 대기 건수
      supabase
        .from('bi_approvals')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      // 문서 통계
      supabase.from('bi_documents').select('is_confirmed'),
      // 최근 가입자 5명
      supabase
        .from('bi_users')
        .select('id, name, email, role, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      // 프로젝트 유형별
      supabase.from('bi_projects').select('project_type'),
      // 크레딧 로그
      supabase
        .from('bi_credit_logs')
        .select('amount, reason, created_at')
        .order('created_at', { ascending: false }),
      // 최근 프로젝트 5건
      supabase
        .from('bi_projects')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      // 최근 문서 5건
      supabase
        .from('bi_documents')
        .select('id, title, type, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    // 사용자 통계
    const users = usersResult.data || []
    const userStats = {
      total: users.length,
      byRole: {
        user: users.filter((u) => u.role === 'user').length,
        mentor: users.filter((u) => u.role === 'mentor').length,
        admin: users.filter((u) => u.role === 'admin').length,
      },
    }

    // 프로젝트 통계
    const projects = projectsResult.data || []
    const projectStats = {
      total: projects.length,
      byStage: {
        idea: projects.filter((p) => p.current_stage === 'idea').length,
        evaluation: projects.filter((p) => p.current_stage === 'evaluation').length,
        document: projects.filter((p) => p.current_stage === 'document').length,
        deploy: projects.filter((p) => p.current_stage === 'deploy').length,
        done: projects.filter((p) => p.current_stage === 'done').length,
      },
      byType: {
        pre_startup: (projectTypesResult.data || []).filter(
          (p) => p.project_type === 'pre_startup'
        ).length,
        startup: (projectTypesResult.data || []).filter(
          (p) => p.project_type === 'startup'
        ).length,
      },
    }

    // 문서 통계
    const documents = documentsResult.data || []
    const documentStats = {
      total: documents.length,
      confirmed: documents.filter((d) => d.is_confirmed).length,
    }

    // 크레딧 통계
    const creditLogs = creditLogsResult.data || []
    const totalDistributed = creditLogs
      .filter((l) => l.amount > 0)
      .reduce((sum, l) => sum + l.amount, 0)
    const totalConsumed = creditLogs
      .filter((l) => l.amount < 0)
      .reduce((sum, l) => sum + Math.abs(l.amount), 0)
    const averagePerUser =
      userStats.total > 0
        ? Math.round(((totalDistributed - totalConsumed) / userStats.total) * 10) / 10
        : 0

    const creditStats = {
      totalDistributed,
      totalConsumed,
      averagePerUser,
    }

    // 최근 활동 피드 (여러 테이블 병합, 최근 10건)
    const recentActivity: Array<{
      type: string
      description: string
      timestamp: string
    }> = []

    // 최근 가입자 → 활동
    for (const u of (recentUsersResult.data || []).slice(0, 3)) {
      recentActivity.push({
        type: 'user_joined',
        description: u.name || u.email,
        timestamp: u.created_at,
      })
    }

    // 최근 프로젝트 → 활동
    for (const p of (recentProjectsResult.data || []).slice(0, 3)) {
      recentActivity.push({
        type: 'project_created',
        description: p.name,
        timestamp: p.created_at,
      })
    }

    // 최근 문서 → 활동
    for (const d of (recentDocumentsResult.data || []).slice(0, 3)) {
      recentActivity.push({
        type: 'document_generated',
        description: `${d.type}: ${d.title || ''}`,
        timestamp: d.created_at,
      })
    }

    // 시간순 정렬 후 10건
    recentActivity.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    const topActivity = recentActivity.slice(0, 10)

    // 크레딧 추이 (최근 7일, KST 기준)
    const KST_OFFSET = 9 * 60 * 60 * 1000
    const toKSTDateKey = (date: Date) => {
      const kst = new Date(date.getTime() + KST_OFFSET)
      return kst.toISOString().slice(0, 10)
    }

    const now = new Date()
    const dailyMap: Record<string, { consumed: number; recharged: number }> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = toKSTDateKey(d)
      dailyMap[key] = { consumed: 0, recharged: 0 }
    }

    for (const log of creditLogs) {
      const dateKey = toKSTDateKey(new Date(log.created_at))
      if (dailyMap[dateKey]) {
        if (log.amount < 0) {
          dailyMap[dateKey].consumed += Math.abs(log.amount)
        } else {
          dailyMap[dateKey].recharged += log.amount
        }
      }
    }

    const creditTrends = {
      daily: Object.entries(dailyMap).map(([date, v]) => ({
        date,
        consumed: v.consumed,
        recharged: v.recharged,
      })),
    }

    return successResponse({
      users: userStats,
      projects: projectStats,
      pendingApprovals: approvalsResult.count || 0,
      documents: documentStats,
      recentUsers: recentUsersResult.data || [],
      credits: creditStats,
      recentActivity: topActivity,
      creditTrends,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
