/**
 * cpr-category-info unit tests
 */

import { describe, expect, it } from 'vitest'

import { CPR_CATEGORIES } from './cpr-categories'
import { CPR_CATEGORY_INFO, getCategoryInfo } from './cpr-category-info'

describe('cpr-category-info', () => {
  it('defines info for every category in CPR_CATEGORIES', () => {
    for (const c of CPR_CATEGORIES) {
      expect(CPR_CATEGORY_INFO[c.id]).toBeDefined()
    }
  })

  it('every entry has a non-empty overview and at least 3 topics', () => {
    for (const info of Object.values(CPR_CATEGORY_INFO)) {
      expect(info.overview.length).toBeGreaterThan(20)
      expect(info.topics.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('every entry has advice for all three result levels', () => {
    for (const info of Object.values(CPR_CATEGORY_INFO)) {
      expect(info.advice.below.length).toBeGreaterThan(10)
      expect(info.advice.near.length).toBeGreaterThan(10)
      expect(info.advice.above.length).toBeGreaterThan(10)
    }
  })

  it('every entry has a weight string', () => {
    for (const info of Object.values(CPR_CATEGORY_INFO)) {
      expect(info.weight).toMatch(/\d+.*%/)
    }
  })

  it('getCategoryInfo returns the matching entry', () => {
    const info = getCategoryInfo('management_of_care')
    expect(info?.id).toBe('management_of_care')
  })

  it('getCategoryInfo returns null for unknown ids', () => {
    expect(getCategoryInfo('not_a_category')).toBeNull()
  })
})
