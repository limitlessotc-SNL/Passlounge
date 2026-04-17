/**
 * fallback-cards unit tests
 */

import { describe, expect, it } from 'vitest'

import { DIAGNOSTIC_CARDS, STUDY_CARDS } from './fallback-cards'

describe('DIAGNOSTIC_CARDS', () => {
  it('contains exactly 15 cards', () => {
    expect(DIAGNOSTIC_CARDS.length).toBe(15)
  })

  it('contains 3 cards per category (5 categories)', () => {
    const cats: Record<string, number> = {}
    for (const card of DIAGNOSTIC_CARDS) {
      cats[card.cat] = (cats[card.cat] ?? 0) + 1
    }
    expect(cats['Cardiac']).toBe(3)
    expect(cats['Pharmacology']).toBe(3)
    expect(cats['Respiratory']).toBe(3)
    expect(cats['OB/Maternity']).toBe(3)
    expect(cats['Mental Health']).toBe(3)
  })

  it('every card has required fields', () => {
    for (const card of DIAGNOSTIC_CARDS) {
      expect(card.title).toBeTruthy()
      expect(card.cat).toBeTruthy()
      expect(card.question).toBeTruthy()
      expect(card.scenario).toBeTruthy()
    }
  })

  it('every card has exactly 4 options', () => {
    for (const card of DIAGNOSTIC_CARDS) {
      expect(card.opts.length).toBe(4)
    }
  })

  it('correct index is 0-3 for every card', () => {
    for (const card of DIAGNOSTIC_CARDS) {
      expect(card.correct).toBeGreaterThanOrEqual(0)
      expect(card.correct).toBeLessThanOrEqual(3)
    }
  })

  it('every card has 4 CCCC layers', () => {
    for (const card of DIAGNOSTIC_CARDS) {
      expect(card.layers.length).toBe(4)
    }
  })

  it('every card has a pearl and lens', () => {
    for (const card of DIAGNOSTIC_CARDS) {
      expect(card.pearl).toBeTruthy()
      expect(card.lens).toBeTruthy()
    }
  })

  it('every card has a mnemonic array', () => {
    for (const card of DIAGNOSTIC_CARDS) {
      expect(Array.isArray(card.mnemonic)).toBe(true)
      expect(card.mnemonic.length).toBeGreaterThan(0)
    }
  })

  it('every card has XP value', () => {
    for (const card of DIAGNOSTIC_CARDS) {
      expect(card.xp).toBeGreaterThan(0)
    }
  })

  it('every card has a why_wrong object', () => {
    for (const card of DIAGNOSTIC_CARDS) {
      expect(typeof card.why_wrong).toBe('object')
      expect(Object.keys(card.why_wrong).length).toBeGreaterThan(0)
    }
  })
})

describe('STUDY_CARDS', () => {
  it('contains at least 15 cards', () => {
    expect(STUDY_CARDS.length).toBeGreaterThanOrEqual(15)
  })

  it('covers multiple categories', () => {
    const cats = new Set(STUDY_CARDS.map((c) => c.cat))
    expect(cats.size).toBeGreaterThanOrEqual(5)
  })

  it('every card has required fields', () => {
    for (const card of STUDY_CARDS) {
      expect(card.title).toBeTruthy()
      expect(card.cat).toBeTruthy()
      expect(card.question).toBeTruthy()
      expect(card.scenario).toBeTruthy()
    }
  })

  it('every card has exactly 4 options', () => {
    for (const card of STUDY_CARDS) {
      expect(card.opts.length).toBe(4)
    }
  })

  it('correct index is 0-3 for every card', () => {
    for (const card of STUDY_CARDS) {
      expect(card.correct).toBeGreaterThanOrEqual(0)
      expect(card.correct).toBeLessThanOrEqual(3)
    }
  })

  it('every card has 4 CCCC layers', () => {
    for (const card of STUDY_CARDS) {
      expect(card.layers.length).toBe(4)
    }
  })

  it('every card has complete CCCC content', () => {
    for (const card of STUDY_CARDS) {
      expect(card.pearl).toBeTruthy()
      expect(card.lens).toBeTruthy()
      expect(card.mnemonic.length).toBeGreaterThan(0)
    }
  })

  it('no duplicate card titles', () => {
    const titles = STUDY_CARDS.map((c) => c.title)
    const unique = new Set(titles)
    expect(unique.size).toBe(titles.length)
  })
})
