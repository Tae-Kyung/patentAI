import { createClient } from '@/lib/supabase/server'

export class InsufficientCreditsError extends Error {
  constructor(public remaining: number) {
    super('크레딧이 부족합니다.')
    this.name = 'InsufficientCreditsError'
  }
}

/**
 * 사용자의 크레딧 잔액 조회
 */
export async function getCredits(userId: string): Promise<number> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bi_users')
    .select('ai_credits')
    .eq('id', userId)
    .single()

  if (error || !data) return 0
  return data.ai_credits ?? 0
}

/**
 * AI 호출 전 크레딧 1 차감
 * 잔액 부족 시 InsufficientCreditsError throw
 */
export async function deductCredit(
  userId: string,
  reason: string,
  projectId?: string
): Promise<number> {
  const supabase = await createClient()

  // 현재 잔액 확인
  const { data: user, error: userError } = await supabase
    .from('bi_users')
    .select('ai_credits')
    .eq('id', userId)
    .single()

  if (userError || !user) {
    throw new Error('사용자를 찾을 수 없습니다.')
  }

  const currentCredits = user.ai_credits ?? 0

  if (currentCredits <= 0) {
    throw new InsufficientCreditsError(0)
  }

  const newBalance = currentCredits - 1

  // 크레딧 차감
  const { error: updateError } = await supabase
    .from('bi_users')
    .update({ ai_credits: newBalance })
    .eq('id', userId)

  if (updateError) throw updateError

  // 로그 기록
  await supabase.from('bi_credit_logs').insert({
    user_id: userId,
    amount: -1,
    balance_after: newBalance,
    reason,
    project_id: projectId || null,
    created_by: userId,
  })

  return newBalance
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
  const supabase = await createClient()

  const { data: user, error: userError } = await supabase
    .from('bi_users')
    .select('ai_credits')
    .eq('id', userId)
    .single()

  if (userError || !user) {
    throw new Error('사용자를 찾을 수 없습니다.')
  }

  const currentCredits = user.ai_credits ?? 0

  if (currentCredits < amount) {
    throw new InsufficientCreditsError(currentCredits)
  }

  const newBalance = currentCredits - amount

  const { error: updateError } = await supabase
    .from('bi_users')
    .update({ ai_credits: newBalance })
    .eq('id', userId)

  if (updateError) throw updateError

  await supabase.from('bi_credit_logs').insert({
    user_id: userId,
    amount: -amount,
    balance_after: newBalance,
    reason,
    project_id: projectId || null,
    created_by: userId,
  })

  return newBalance
}

/**
 * 관리자가 크레딧 충전
 */
export async function addCredits(
  userId: string,
  amount: number,
  adminId: string,
  reason: string = 'admin_recharge'
): Promise<number> {
  const supabase = await createClient()

  // 현재 잔액 확인
  const { data: user, error: userError } = await supabase
    .from('bi_users')
    .select('ai_credits')
    .eq('id', userId)
    .single()

  if (userError || !user) {
    throw new Error('사용자를 찾을 수 없습니다.')
  }

  const currentCredits = user.ai_credits ?? 0
  const newBalance = currentCredits + amount

  // 크레딧 추가
  const { error: updateError } = await supabase
    .from('bi_users')
    .update({ ai_credits: newBalance })
    .eq('id', userId)

  if (updateError) throw updateError

  // 로그 기록
  await supabase.from('bi_credit_logs').insert({
    user_id: userId,
    amount,
    balance_after: newBalance,
    reason,
    created_by: adminId,
  })

  return newBalance
}
