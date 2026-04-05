import { NextRequest } from 'next/server'
import { requireMentor } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, handleApiError } from '@/lib/utils/api-response'
import type { UserRole } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    await requireMentor()

    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || 'all'
    const offset = (page - 1) * limit

    // 사용자 목록 쿼리
    let query = supabase
      .from('bi_users')
      .select('id, name, email, role, is_approved, created_at', { count: 'exact' })

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    if (role === 'pending') {
      query = query.eq('is_approved', false)
    } else if (role !== 'all') {
      query = query.eq('role', role as UserRole)
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: users, count, error } = await query

    if (error) throw error

    // 각 사용자의 프로젝트 목록 조회
    const userIds = (users || []).map((u) => u.id)

    let projects: Array<{
      id: string
      name: string
      current_stage: string
      current_gate: string
      created_at: string
      user_id: string
    }> = []

    if (userIds.length > 0) {
      const { data: projectData, error: projectError } = await supabase
        .from('bi_projects')
        .select('id, name, current_stage, current_gate, created_at, user_id')
        .in('user_id', userIds)
        .order('created_at', { ascending: false })

      if (projectError) throw projectError
      projects = projectData || []
    }

    // 사용자별 프로젝트 매핑
    const usersWithProjects = (users || []).map((user) => ({
      ...user,
      projects: projects.filter((p) => p.user_id === user.id),
    }))

    return successResponse({
      users: usersWithProjects,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
