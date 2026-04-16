/**
 * Shuffle Utility
 *
 * Fisher-Yates shuffle for answer options.
 * Re-applies A/B/C/D labels after shuffling.
 * Returns mapping so back-navigation shows same order.
 *
 * Owner: Junior Engineer 3
 */

import type { ShuffleResult } from '@/types'

const LABELS = ['A.', 'B.', 'C.', 'D.']

/**
 * Strips the "A. " / "B. " prefix from an option string if present.
 */
export function stripLabel(opt: string): string {
  return opt.replace(/^[A-D]\.\s*/, '')
}

/**
 * Fisher-Yates in-place shuffle of an array.
 * Returns the same array reference, mutated.
 */
export function fisherYatesShuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

/**
 * Shuffles answer options for a card.
 *
 * @param opts - Original options array (e.g. ["A. Morphine", "B. Consent", ...])
 * @param correctIdx - Index of the correct answer in the original array
 * @returns ShuffleResult with shuffled opts, new correct index, and original index mapping
 */
export function shuffleOptions(opts: string[], correctIdx: number): ShuffleResult {
  const stripped = opts.map(stripLabel)

  const indexed = stripped.map((text, i) => ({
    text,
    origIdx: i,
    isCorrect: i === correctIdx,
  }))

  fisherYatesShuffle(indexed)

  let newCorrect = -1
  const origMap: number[] = []
  const shuffledOpts = indexed.map((item, i) => {
    if (item.isCorrect) newCorrect = i
    origMap.push(item.origIdx)
    return `${LABELS[i]} ${item.text}`
  })

  return { opts: shuffledOpts, correct: newCorrect, origMap }
}
