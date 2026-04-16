/**
 * srStore unit tests
 *
 * Tests every action and state transition.
 */

import { afterEach, describe, expect, it } from 'vitest'

import type { CardProgress } from '@/types'

import { useSRStore } from './srStore'

const makeProgress = (cardId: string): CardProgress => ({
  card_id: cardId,
  student_id: 'stu-1',
  times_seen: 3,
  times_correct: 2,
  times_wrong: 1,
  ease_factor: 2.5,
  next_review: '2026-05-01T00:00:00Z',
  last_seen: '2026-04-15T00:00:00Z',
})

describe('srStore', () => {
  afterEach(() => {
    useSRStore.setState({
      cardProgressMap: {},
      cardProgressLoaded: false,
      srPendingUpdates: {},
    })
  })

  // ── Initial State ─────────────────────────────────────────────────────

  it('has correct initial state', () => {
    const s = useSRStore.getState()

    expect(s.cardProgressMap).toEqual({})
    expect(s.cardProgressLoaded).toBe(false)
    expect(s.srPendingUpdates).toEqual({})
  })

  // ── setCardProgressMap ────────────────────────────────────────────────

  it('setCardProgressMap sets the map', () => {
    const map = { 'card-1': makeProgress('card-1'), 'card-2': makeProgress('card-2') }
    useSRStore.getState().setCardProgressMap(map)

    expect(useSRStore.getState().cardProgressMap).toEqual(map)
  })

  it('setCardProgressMap replaces previous map', () => {
    useSRStore.getState().setCardProgressMap({ 'old': makeProgress('old') })
    useSRStore.getState().setCardProgressMap({ 'new': makeProgress('new') })

    expect(useSRStore.getState().cardProgressMap).toHaveProperty('new')
    expect(useSRStore.getState().cardProgressMap).not.toHaveProperty('old')
  })

  it('setCardProgressMap with empty map', () => {
    useSRStore.getState().setCardProgressMap({ 'x': makeProgress('x') })
    useSRStore.getState().setCardProgressMap({})

    expect(useSRStore.getState().cardProgressMap).toEqual({})
  })

  // ── setCardProgressLoaded ─────────────────────────────────────────────

  it('setCardProgressLoaded sets true', () => {
    useSRStore.getState().setCardProgressLoaded(true)

    expect(useSRStore.getState().cardProgressLoaded).toBe(true)
  })

  it('setCardProgressLoaded sets false', () => {
    useSRStore.getState().setCardProgressLoaded(true)
    useSRStore.getState().setCardProgressLoaded(false)

    expect(useSRStore.getState().cardProgressLoaded).toBe(false)
  })

  // ── recordSRAnswer ────────────────────────────────────────────────────

  it('recordSRAnswer creates new pending entry for unseen card', () => {
    useSRStore.getState().recordSRAnswer('card-1', true)

    const pending = useSRStore.getState().srPendingUpdates['card-1']
    expect(pending).toBeDefined()
    expect(pending.seen).toBe(1)
    expect(pending.correct).toBe(1)
    expect(pending.wrong).toBe(0)
  })

  it('recordSRAnswer increments seen on correct', () => {
    useSRStore.getState().recordSRAnswer('card-1', true)

    expect(useSRStore.getState().srPendingUpdates['card-1'].seen).toBe(1)
    expect(useSRStore.getState().srPendingUpdates['card-1'].correct).toBe(1)
  })

  it('recordSRAnswer increments wrong on incorrect', () => {
    useSRStore.getState().recordSRAnswer('card-1', false)

    expect(useSRStore.getState().srPendingUpdates['card-1'].seen).toBe(1)
    expect(useSRStore.getState().srPendingUpdates['card-1'].wrong).toBe(1)
    expect(useSRStore.getState().srPendingUpdates['card-1'].correct).toBe(0)
  })

  it('recordSRAnswer accumulates across multiple answers', () => {
    useSRStore.getState().recordSRAnswer('card-1', true)
    useSRStore.getState().recordSRAnswer('card-1', false)
    useSRStore.getState().recordSRAnswer('card-1', true)

    const pending = useSRStore.getState().srPendingUpdates['card-1']
    expect(pending.seen).toBe(3)
    expect(pending.correct).toBe(2)
    expect(pending.wrong).toBe(1)
  })

  it('recordSRAnswer tracks separate cards independently', () => {
    useSRStore.getState().recordSRAnswer('card-1', true)
    useSRStore.getState().recordSRAnswer('card-2', false)

    expect(useSRStore.getState().srPendingUpdates['card-1'].correct).toBe(1)
    expect(useSRStore.getState().srPendingUpdates['card-2'].wrong).toBe(1)
  })

  it('recordSRAnswer does not modify cardProgressMap', () => {
    useSRStore.getState().setCardProgressMap({ 'card-1': makeProgress('card-1') })
    useSRStore.getState().recordSRAnswer('card-1', true)

    expect(useSRStore.getState().cardProgressMap['card-1'].times_correct).toBe(2)
  })

  // ── clearPendingUpdates ───────────────────────────────────────────────

  it('clearPendingUpdates empties the queue', () => {
    useSRStore.getState().recordSRAnswer('card-1', true)
    useSRStore.getState().recordSRAnswer('card-2', false)
    useSRStore.getState().clearPendingUpdates()

    expect(useSRStore.getState().srPendingUpdates).toEqual({})
  })

  it('clearPendingUpdates does not affect cardProgressMap', () => {
    useSRStore.getState().setCardProgressMap({ 'card-1': makeProgress('card-1') })
    useSRStore.getState().recordSRAnswer('card-1', true)
    useSRStore.getState().clearPendingUpdates()

    expect(useSRStore.getState().cardProgressMap['card-1']).toBeDefined()
  })

  it('clearPendingUpdates on empty queue is safe', () => {
    useSRStore.getState().clearPendingUpdates()

    expect(useSRStore.getState().srPendingUpdates).toEqual({})
  })
})
