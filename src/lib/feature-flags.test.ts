import { describe, it, expect } from 'vitest'
import { isFeatureEnabled, FEATURE_FLAGS } from './feature-flags'

describe('feature-flags', () => {
  it('returns default values', () => {
    expect(isFeatureEnabled('MENTORING_SYSTEM')).toBe(true)
    expect(isFeatureEnabled('INSTITUTION_DASHBOARD')).toBe(true)
  })

  it('all default flags are true', () => {
    for (const key of Object.keys(FEATURE_FLAGS) as (keyof typeof FEATURE_FLAGS)[]) {
      expect(FEATURE_FLAGS[key]).toBe(true)
    }
  })
})
