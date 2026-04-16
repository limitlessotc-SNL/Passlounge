/**
 * diagnostic-cards config unit tests
 */

import { describe, expect, it } from 'vitest'

import type { StudyCard } from '@/types'

import {
  CATEGORY_ICONS,
  DIAGNOSTIC_CARD_COUNT,
  DIAGNOSTIC_CATEGORIES,
  getCategoryBreakdown,
  getDiagnosticGrade,
} from './diagnostic-cards'

describe('diagnostic-cards config', () => {
  // ── Constants ─────────────────────────────────────────────────────────

  it('DIAGNOSTIC_CARD_COUNT is 15', () => {
    expect(DIAGNOSTIC_CARD_COUNT).toBe(15)
  })

  it('DIAGNOSTIC_CATEGORIES has 5 categories', () => {
    expect(DIAGNOSTIC_CATEGORIES.length).toBe(5)
  })

  it('DIAGNOSTIC_CATEGORIES includes all expected categories', () => {
    expect(DIAGNOSTIC_CATEGORIES).toContain('Cardiac')
    expect(DIAGNOSTIC_CATEGORIES).toContain('Pharmacology')
    expect(DIAGNOSTIC_CATEGORIES).toContain('Respiratory')
    expect(DIAGNOSTIC_CATEGORIES).toContain('OB/Maternity')
    expect(DIAGNOSTIC_CATEGORIES).toContain('Mental Health')
  })

  it('CATEGORY_ICONS has entries for all diagnostic categories', () => {
    for (const cat of DIAGNOSTIC_CATEGORIES) {
      expect(CATEGORY_ICONS[cat]).toBeDefined()
    }
  })

  it('CATEGORY_ICONS values are emoji strings', () => {
    expect(CATEGORY_ICONS['Cardiac']).toBe('🫀')
    expect(CATEGORY_ICONS['Pharmacology']).toBe('💊')
    expect(CATEGORY_ICONS['Respiratory']).toBe('🫁')
  })

  // ── getDiagnosticGrade ────────────────────────────────────────────────

  it('returns Distinguished for 90%+', () => {
    const grade = getDiagnosticGrade(95)

    expect(grade.catLevel).toBe('4.5')
    expect(grade.catLabel).toBe('Distinguished')
    expect(grade.gradeIcon).toBe('🏆')
  })

  it('returns Proficient for 70-89%', () => {
    const grade = getDiagnosticGrade(75)

    expect(grade.catLevel).toBe('3.5')
    expect(grade.catLabel).toBe('Proficient')
    expect(grade.gradeIcon).toBe('✅')
  })

  it('returns Developing for 50-69%', () => {
    const grade = getDiagnosticGrade(55)

    expect(grade.catLevel).toBe('2.5')
    expect(grade.catLabel).toBe('Developing')
    expect(grade.gradeIcon).toBe('📈')
  })

  it('returns Foundational for below 50%', () => {
    const grade = getDiagnosticGrade(30)

    expect(grade.catLevel).toBe('1.5')
    expect(grade.catLabel).toBe('Foundational')
    expect(grade.gradeIcon).toBe('💪')
  })

  it('returns Proficient at exactly 70%', () => {
    expect(getDiagnosticGrade(70).catLevel).toBe('3.5')
  })

  it('returns Distinguished at exactly 90%', () => {
    expect(getDiagnosticGrade(90).catLevel).toBe('4.5')
  })

  it('returns Developing at exactly 50%', () => {
    expect(getDiagnosticGrade(50).catLevel).toBe('2.5')
  })

  it('returns Foundational at 0%', () => {
    expect(getDiagnosticGrade(0).catLevel).toBe('1.5')
  })

  it('returns Foundational at 49%', () => {
    expect(getDiagnosticGrade(49).catLevel).toBe('1.5')
  })

  it('grade text is non-empty for all tiers', () => {
    expect(getDiagnosticGrade(95).gradeText.length).toBeGreaterThan(0)
    expect(getDiagnosticGrade(75).gradeText.length).toBeGreaterThan(0)
    expect(getDiagnosticGrade(55).gradeText.length).toBeGreaterThan(0)
    expect(getDiagnosticGrade(30).gradeText.length).toBeGreaterThan(0)
  })

  // ── getCategoryBreakdown ──────────────────────────────────────────────

  const makeCard = (cat: string): StudyCard => ({
    cat,
    bloom: 'Apply',
    xp: 20,
    title: `${cat} Card`,
    type: 'MC',
    scenario: '',
    question: '',
    opts: [],
    correct: 0,
    layers: [],
    lens: '',
    pearl: '',
    mnemonic: [],
    why_wrong: {},
  })

  it('returns categories sorted weakest to strongest', () => {
    const cards = [makeCard('Cardiac'), makeCard('Cardiac'), makeCard('Pharmacology'), makeCard('Pharmacology')]
    const results: (boolean | undefined)[] = [true, true, false, false]

    const breakdown = getCategoryBreakdown(cards, results)

    expect(breakdown[0].cat).toBe('Pharmacology')
    expect(breakdown[0].pct).toBe(0)
    expect(breakdown[1].cat).toBe('Cardiac')
    expect(breakdown[1].pct).toBe(100)
  })

  it('returns correct per-category counts', () => {
    const cards = [makeCard('Cardiac'), makeCard('Cardiac'), makeCard('Cardiac')]
    const results: (boolean | undefined)[] = [true, false, true]

    const breakdown = getCategoryBreakdown(cards, results)

    expect(breakdown[0].total).toBe(3)
    expect(breakdown[0].correct).toBe(2)
    expect(breakdown[0].pct).toBe(67)
  })

  it('includes icon for each category', () => {
    const cards = [makeCard('Cardiac'), makeCard('Respiratory')]
    const results: (boolean | undefined)[] = [true, false]

    const breakdown = getCategoryBreakdown(cards, results)

    expect(breakdown.find((b) => b.cat === 'Cardiac')?.icon).toBe('🫀')
    expect(breakdown.find((b) => b.cat === 'Respiratory')?.icon).toBe('🫁')
  })

  it('handles unknown categories with default icon', () => {
    const cards = [makeCard('Unknown')]
    const results: (boolean | undefined)[] = [true]

    const breakdown = getCategoryBreakdown(cards, results)

    expect(breakdown[0].icon).toBe('📋')
  })

  it('handles empty cards array', () => {
    const breakdown = getCategoryBreakdown([], [])

    expect(breakdown).toEqual([])
  })

  it('handles all correct results', () => {
    const cards = [makeCard('Cardiac'), makeCard('Cardiac')]
    const results: (boolean | undefined)[] = [true, true]

    const breakdown = getCategoryBreakdown(cards, results)

    expect(breakdown[0].pct).toBe(100)
  })

  it('handles all wrong results', () => {
    const cards = [makeCard('Cardiac'), makeCard('Cardiac')]
    const results: (boolean | undefined)[] = [false, false]

    const breakdown = getCategoryBreakdown(cards, results)

    expect(breakdown[0].pct).toBe(0)
  })

  it('handles undefined results as wrong', () => {
    const cards = [makeCard('Cardiac')]
    const results: (boolean | undefined)[] = [undefined]

    const breakdown = getCategoryBreakdown(cards, results)

    expect(breakdown[0].correct).toBe(0)
  })
})
