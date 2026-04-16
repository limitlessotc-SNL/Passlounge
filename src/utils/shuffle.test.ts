/**
 * Shuffle utility unit tests
 *
 * Tests every exported function: stripLabel, fisherYatesShuffle, shuffleOptions
 */

import { describe, expect, it } from 'vitest'

import { fisherYatesShuffle, shuffleOptions, stripLabel } from './shuffle'

// ─── stripLabel ───────────────────────────────────────────────────────────

describe('stripLabel', () => {
  it('removes "A. " prefix', () => {
    expect(stripLabel('A. Morphine')).toBe('Morphine')
  })

  it('removes "B. " prefix', () => {
    expect(stripLabel('B. Consent form')).toBe('Consent form')
  })

  it('removes "C. " prefix', () => {
    expect(stripLabel('C. IV access')).toBe('IV access')
  })

  it('removes "D. " prefix', () => {
    expect(stripLabel('D. Notify provider')).toBe('Notify provider')
  })

  it('returns string unchanged if no prefix', () => {
    expect(stripLabel('No prefix here')).toBe('No prefix here')
  })

  it('returns empty string for empty input', () => {
    expect(stripLabel('')).toBe('')
  })

  it('only strips the first occurrence of the prefix', () => {
    expect(stripLabel('A. A. Double prefix')).toBe('A. Double prefix')
  })
})

// ─── fisherYatesShuffle ───────────────────────────────────────────────────

describe('fisherYatesShuffle', () => {
  it('returns the same array reference (mutates in place)', () => {
    const arr = [1, 2, 3, 4]
    const result = fisherYatesShuffle(arr)

    expect(result).toBe(arr)
  })

  it('preserves all elements (no duplicates, no losses)', () => {
    const arr = [10, 20, 30, 40, 50]
    fisherYatesShuffle(arr)

    expect(arr.sort((a, b) => a - b)).toEqual([10, 20, 30, 40, 50])
  })

  it('preserves array length', () => {
    const arr = ['a', 'b', 'c', 'd']
    fisherYatesShuffle(arr)

    expect(arr.length).toBe(4)
  })

  it('handles single-element array', () => {
    const arr = [42]
    fisherYatesShuffle(arr)

    expect(arr).toEqual([42])
  })

  it('handles empty array', () => {
    const arr: number[] = []
    fisherYatesShuffle(arr)

    expect(arr).toEqual([])
  })

  it('handles two-element array', () => {
    const arr = [1, 2]
    fisherYatesShuffle(arr)

    expect(arr.sort((a, b) => a - b)).toEqual([1, 2])
  })

  it('eventually produces different orderings (statistical)', () => {
    const orderings = new Set<string>()
    for (let i = 0; i < 100; i++) {
      const arr = [1, 2, 3, 4]
      fisherYatesShuffle(arr)
      orderings.add(arr.join(','))
    }

    expect(orderings.size).toBeGreaterThan(1)
  })
})

// ─── shuffleOptions ───────────────────────────────────────────────────────

describe('shuffleOptions', () => {
  const OPTS = [
    'A. Administer Morphine',
    'B. Obtain consent',
    'C. Establish IV access',
    'D. Notify cardiologist',
  ]

  it('returns 4 shuffled options', () => {
    const result = shuffleOptions(OPTS, 0)

    expect(result.opts.length).toBe(4)
  })

  it('each option starts with A. B. C. or D. label', () => {
    const result = shuffleOptions(OPTS, 0)

    expect(result.opts[0]).toMatch(/^A\. /)
    expect(result.opts[1]).toMatch(/^B\. /)
    expect(result.opts[2]).toMatch(/^C\. /)
    expect(result.opts[3]).toMatch(/^D\. /)
  })

  it('correct index points to the originally-correct option text', () => {
    const result = shuffleOptions(OPTS, 0)
    const correctOpt = stripLabel(result.opts[result.correct])

    expect(correctOpt).toBe('Administer Morphine')
  })

  it('correct index is within valid range', () => {
    const result = shuffleOptions(OPTS, 2)

    expect(result.correct).toBeGreaterThanOrEqual(0)
    expect(result.correct).toBeLessThanOrEqual(3)
  })

  it('origMap has 4 entries', () => {
    const result = shuffleOptions(OPTS, 0)

    expect(result.origMap.length).toBe(4)
  })

  it('origMap contains all original indices', () => {
    const result = shuffleOptions(OPTS, 0)

    expect(result.origMap.slice().sort()).toEqual([0, 1, 2, 3])
  })

  it('origMap[correct] equals original correct index', () => {
    const origCorrect = 2
    const result = shuffleOptions(OPTS, origCorrect)

    expect(result.origMap[result.correct]).toBe(origCorrect)
  })

  it('preserves all option texts (just reordered)', () => {
    const result = shuffleOptions(OPTS, 0)
    const stripped = result.opts.map(stripLabel).sort()
    const origStripped = OPTS.map(stripLabel).sort()

    expect(stripped).toEqual(origStripped)
  })

  it('handles options without existing labels', () => {
    const noLabels = ['Morphine', 'Consent', 'IV access', 'Notify']
    const result = shuffleOptions(noLabels, 1)

    expect(result.opts.length).toBe(4)
    expect(stripLabel(result.opts[result.correct])).toBe('Consent')
  })

  it('works when correct answer is last option', () => {
    const result = shuffleOptions(OPTS, 3)
    const correctText = stripLabel(result.opts[result.correct])

    expect(correctText).toBe('Notify cardiologist')
  })

  it('works when correct answer is first option', () => {
    const result = shuffleOptions(OPTS, 0)
    const correctText = stripLabel(result.opts[result.correct])

    expect(correctText).toBe('Administer Morphine')
  })
})
