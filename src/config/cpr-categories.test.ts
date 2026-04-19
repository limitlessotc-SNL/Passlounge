/**
 * cpr-categories config unit tests
 */

import { describe, expect, it } from 'vitest'

import {
  CPR_CATEGORIES,
  CPR_RESULT_LEVELS,
  getStrongCategories,
  getWeakCategories,
  isComplete,
  isValidResult,
  resultLabel,
  resultRank,
} from './cpr-categories'

describe('cpr-categories config', () => {
  // ── Schema ─────────────────────────────────────────────────────────

  it('defines exactly 8 NCSBN categories', () => {
    expect(CPR_CATEGORIES.length).toBe(8)
  })

  it('every category has id, label, and short', () => {
    for (const c of CPR_CATEGORIES) {
      expect(c.id.length).toBeGreaterThan(0)
      expect(c.label.length).toBeGreaterThan(0)
      expect(c.short.length).toBeGreaterThan(0)
    }
  })

  it('all category ids are unique', () => {
    const ids = CPR_CATEGORIES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('exposes the three result levels', () => {
    expect(CPR_RESULT_LEVELS).toEqual(['above', 'near', 'below'])
  })

  // ── isValidResult ──────────────────────────────────────────────────

  it('isValidResult returns true for each level', () => {
    expect(isValidResult('above')).toBe(true)
    expect(isValidResult('near')).toBe(true)
    expect(isValidResult('below')).toBe(true)
  })

  it('isValidResult returns false for other values', () => {
    expect(isValidResult('')).toBe(false)
    expect(isValidResult('pass')).toBe(false)
    expect(isValidResult(undefined)).toBe(false)
    expect(isValidResult(null)).toBe(false)
    expect(isValidResult(1)).toBe(false)
  })

  // ── isComplete ─────────────────────────────────────────────────────

  it('isComplete returns false when no categories answered', () => {
    expect(isComplete({})).toBe(false)
  })

  it('isComplete returns false when only some categories answered', () => {
    expect(isComplete({ management_of_care: 'above' })).toBe(false)
  })

  it('isComplete returns true when every category has a valid result', () => {
    const map: Parameters<typeof isComplete>[0] = {}
    for (const c of CPR_CATEGORIES) map[c.id] = 'near'
    expect(isComplete(map)).toBe(true)
  })

  it('isComplete rejects invalid values', () => {
    const bad = Object.fromEntries(
      CPR_CATEGORIES.map((c) => [c.id, 'bogus']),
    ) as unknown as Parameters<typeof isComplete>[0]
    expect(isComplete(bad)).toBe(false)
  })

  // ── Weak / strong derivations ──────────────────────────────────────

  it('getWeakCategories returns only below-passing entries', () => {
    const map = {
      management_of_care: 'below' as const,
      safety_and_infection_control: 'near' as const,
      pharmacological_and_parenteral_therapies: 'below' as const,
    }
    const weak = getWeakCategories(map).map((c) => c.id)
    expect(weak).toEqual([
      'management_of_care',
      'pharmacological_and_parenteral_therapies',
    ])
  })

  it('getStrongCategories returns only above-passing entries', () => {
    const map = {
      psychosocial_integrity: 'above' as const,
      reduction_of_risk_potential: 'near' as const,
      physiological_adaptation: 'above' as const,
    }
    const strong = getStrongCategories(map).map((c) => c.id)
    expect(strong).toEqual(['psychosocial_integrity', 'physiological_adaptation'])
  })

  it('returns empty arrays when nothing matches', () => {
    expect(getWeakCategories({})).toEqual([])
    expect(getStrongCategories({})).toEqual([])
  })

  // ── Sorting helpers ────────────────────────────────────────────────

  it('resultRank orders below < near < above', () => {
    expect(resultRank('below')).toBeLessThan(resultRank('near'))
    expect(resultRank('near')).toBeLessThan(resultRank('above'))
  })

  it('resultRank pushes undefined to the end', () => {
    expect(resultRank(undefined)).toBeGreaterThan(resultRank('above'))
  })

  it('resultLabel returns human-readable strings', () => {
    expect(resultLabel('above')).toBe('Above Passing')
    expect(resultLabel('near')).toBe('Near Passing')
    expect(resultLabel('below')).toBe('Below Passing')
  })
})
