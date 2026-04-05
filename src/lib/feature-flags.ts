export const FEATURE_FLAGS = {
  MENTORING_SYSTEM: true,
  INSTITUTION_DASHBOARD: true,
  PAYOUT_MANAGEMENT: true,
  MESSAGE_SYSTEM: true,
  NOTIFICATION_SYSTEM: true,
  MULTI_ROLE_SIGNUP: true,
} as const

export type FeatureFlag = keyof typeof FEATURE_FLAGS

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const envKey = `NEXT_PUBLIC_FF_${flag}`
  const envValue = typeof window !== 'undefined'
    ? (process.env[envKey] as string | undefined)
    : process.env[envKey]

  if (envValue !== undefined) {
    return envValue === 'true' || envValue === '1'
  }

  return FEATURE_FLAGS[flag]
}
