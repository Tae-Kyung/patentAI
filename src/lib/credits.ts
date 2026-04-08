import { createServiceClient } from '@/lib/supabase/service'

export class InsufficientCreditsError extends Error {
  constructor(public remaining: number) {
    super('크레딧이 부족합니다.')
    this.name = 'InsufficientCreditsError'
  }
}

/**
 * 사용자의 크레딧 잔액 조회 (없으면 0 반환)
 */
export async function getCredits(userId: string): Promise<number> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('patentai_user_credits')
    .select('credits')
    .eq('user_id', userId)
    .single()

  return data?.credits ?? 0
}

/**
 * AI 호출 전 크레딧 N개 차감
 * 잔액 부족 시 InsufficientCreditsError throw
 */
export async function deductCredits(
  userId: string,
  amount: number,
  reason: string,
  projectId?: string
): Promise<number> {
  const supabase = createServiceClient()

  // upsert로 행이 없으면 기본 30으로 생성
  const { data: row, error: selectError } = await supabase
    .from('patentai_user_credits')
    .select('credits')
    .eq('user_id', userId)
    .single()

  if (selectError && selectError.code !== 'PGRST116') {
    throw new Error('크레딧 정보를 가져오는데 실패했습니다.')
  }

  const currentCredits = row?.credits ?? 30

  if (currentCredits < amount) {
    throw new InsufficientCreditsError(currentCredits)
  }

  const newBalance = currentCredits - amount

  await supabase
    .from('patentai_user_credits')
    .upsert({ user_id: userId, credits: newBalance, updated_at: new Date().toISOString() })

  await supabase.from('patentai_credit_logs').insert({
    user_id: userId,
    amount: -amount,
    balance_after: newBalance,
    reason,
    project_id: projectId ?? null,
  })

  return newBalance
}

// 하위 호환
export async function deductCredit(
  userId: string,
  reason: string,
  projectId?: string
): Promise<number> {
  return deductCredits(userId, 1, reason, projectId)
}

/**
 * 크레딧 충전 (관리자)
 */
export async function addCredits(
  userId: string,
  amount: number,
  _adminId: string,
  reason: string = 'admin_recharge'
): Promise<number> {
  const supabase = createServiceClient()

  const { data: row } = await supabase
    .from('patentai_user_credits')
    .select('credits')
    .eq('user_id', userId)
    .single()

  const currentCredits = row?.credits ?? 0
  const newBalance = currentCredits + amount

  await supabase
    .from('patentai_user_credits')
    .upsert({ user_id: userId, credits: newBalance, updated_at: new Date().toISOString() })

  await supabase.from('patentai_credit_logs').insert({
    user_id: userId,
    amount,
    balance_after: newBalance,
    reason,
  })

  return newBalance
}
