import { createServiceClient } from '@/lib/supabase/service'
import { invalidatePromptCache } from './prompt-engine'
import type { Prompt, PromptVersion } from '@/types/database'

/**
 * 프롬프트 버전 스냅샷 생성
 */
export async function createPromptVersion(
  promptId: string,
  changeNote?: string,
  changedBy?: string
): Promise<PromptVersion | null> {
  const supabase = createServiceClient()

  // 현재 프롬프트 조회
  const { data: prompt, error: promptError } = await supabase
    .from('bi_prompts')
    .select('*')
    .eq('id', promptId)
    .single()

  if (promptError || !prompt) {
    console.error('Prompt not found:', promptError)
    return null
  }

  // 버전 스냅샷 생성
  const { data: version, error: versionError } = await supabase
    .from('bi_prompt_versions')
    .insert({
      prompt_id: promptId,
      version: prompt.version,
      system_prompt: prompt.system_prompt,
      user_prompt_template: prompt.user_prompt_template,
      model: prompt.model,
      temperature: prompt.temperature,
      max_tokens: prompt.max_tokens,
      change_note: changeNote,
      changed_by: changedBy,
    })
    .select()
    .single()

  if (versionError) {
    console.error('Create version error:', versionError)
    return null
  }

  return version
}

/**
 * 프롬프트 업데이트 (버전 자동 생성)
 */
export async function updatePromptWithVersion(
  promptId: string,
  updates: Partial<Prompt>,
  changeNote?: string,
  updatedBy?: string
): Promise<Prompt | null> {
  const supabase = createServiceClient()

  // 현재 버전 스냅샷 저장
  await createPromptVersion(promptId, changeNote, updatedBy)

  // 프롬프트 업데이트 (버전 증가)
  const { data: currentPrompt } = await supabase
    .from('bi_prompts')
    .select('version, key')
    .eq('id', promptId)
    .single()

  if (!currentPrompt) {
    return null
  }

  const { data: updatedPrompt, error } = await supabase
    .from('bi_prompts')
    .update({
      ...updates,
      version: currentPrompt.version + 1,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', promptId)
    .select()
    .single()

  if (error) {
    console.error('Update prompt error:', error)
    return null
  }

  // 캐시 무효화
  await invalidatePromptCache(currentPrompt.key)

  return updatedPrompt
}

/**
 * 특정 버전으로 롤백
 */
export async function rollbackPrompt(
  promptId: string,
  targetVersion: number,
  rollbackBy?: string
): Promise<Prompt | null> {
  const supabase = createServiceClient()

  // 대상 버전 조회
  const { data: version, error: versionError } = await supabase
    .from('bi_prompt_versions')
    .select('*')
    .eq('prompt_id', promptId)
    .eq('version', targetVersion)
    .single()

  if (versionError || !version) {
    console.error('Version not found:', versionError)
    return null
  }

  // 현재 상태를 버전으로 저장
  await createPromptVersion(promptId, `Rollback to version ${targetVersion}`, rollbackBy)

  // 현재 버전 번호 조회
  const { data: currentPrompt } = await supabase
    .from('bi_prompts')
    .select('version, key')
    .eq('id', promptId)
    .single()

  if (!currentPrompt) {
    return null
  }

  // 대상 버전 내용으로 업데이트
  const { data: rolledBackPrompt, error } = await supabase
    .from('bi_prompts')
    .update({
      system_prompt: version.system_prompt,
      user_prompt_template: version.user_prompt_template,
      model: version.model,
      temperature: version.temperature ?? 0.7,
      max_tokens: version.max_tokens ?? 2000,
      version: currentPrompt.version + 1,
      updated_by: rollbackBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', promptId)
    .select()
    .single()

  if (error) {
    console.error('Rollback error:', error)
    return null
  }

  // 캐시 무효화
  await invalidatePromptCache(currentPrompt.key)

  return rolledBackPrompt
}

/**
 * 버전 이력 조회
 */
export async function getPromptVersions(promptId: string): Promise<PromptVersion[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('bi_prompt_versions')
    .select('*')
    .eq('prompt_id', promptId)
    .order('version', { ascending: false })

  if (error) {
    console.error('Get versions error:', error)
    return []
  }

  return data || []
}

/**
 * 특정 버전 조회
 */
export async function getPromptVersion(
  promptId: string,
  version: number
): Promise<PromptVersion | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('bi_prompt_versions')
    .select('*')
    .eq('prompt_id', promptId)
    .eq('version', version)
    .single()

  if (error) {
    console.error('Get version error:', error)
    return null
  }

  return data
}
