import { createServiceClient } from '@/lib/supabase/service'
import type { Json } from '@/types/database'

interface AuditLogParams {
  userId: string
  action: string
  resourceType: string
  resourceId?: string
  details?: Record<string, Json>
  ipAddress?: string
  userAgent?: string
}

export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const supabase = createServiceClient()

    await supabase.from('bi_audit_logs').insert({
      user_id: params.userId,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId ?? null,
      details: (params.details as Json) ?? null,
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
    })
  } catch (error) {
    console.error('Audit log write failed:', error)
  }
}

export function extractRequestInfo(request: Request): {
  ipAddress: string
  userAgent: string
} {
  const forwarded = request.headers.get('x-forwarded-for')
  const ipAddress = forwarded?.split(',')[0]?.trim() || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  return { ipAddress, userAgent }
}
