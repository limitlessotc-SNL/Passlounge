/**
 * sessionStore unit tests
 *
 * Tests every action and state transition.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { StudyCard } from '@/types'

import { useSessionStore } from './sessionStore'

const makeCard = (id: string, xp = 20): StudyCard => ({
  id,
  cat: 'Cardiac',
  bloom: 'Apply',
  xp,
  title: `Card ${id}`,
  type: 'Multiple Choice',
  scenario: 'A patient presents...',
  question: 'What is the priority?',
  opts: ['A. Option 1', 'B. Option 2', 'C. Option 3', 'D. Option 4'],
  correct: 0,
  layers: ['Core', 'Complication', 'Connection', 'Confirmation'],
  lens: 'Assessment vs Intervention',
  pearl: 'Remember this.',
  mnemonic: [['A', 'Alpha'], ['B', 'Beta']],
  why_wrong: { 'Option 2': 'Wrong because...', 'Option 3': 'Wrong because...' },
})

describe('sessionStore', () => {
  afterEach(() => {
    useSessionStore.getState().reset()
  })

  // ── Initial State ─────────────────────────────────────────────────────

  it('has correct initial state', () => {
    const s = useSessionStore.getState()

    expect(s.mode).toBe('test')
    expect(s.pool).toBe('all')
    expect(s.cards).toEqual([])
    expect(s.currentIdx).toBe(0)
    expect(s.isActive).toBe(false)
    expect(s.isDiagnostic).toBe(false)
    expect(s.correctCount).toBe(0)
    expect(s.wrongCount).toBe(0)
    expect(s.xp).toBe(50)
    expect(s.streakCount).toBe(0)
    expect(s.qCount).toBe(10)
    expect(s.sessionName).toBe('')
    expect(s.sessionId).toBeNull()
    expect(s.cardTimes).toEqual({})
    expect(s.cardTimerStart).toBe(0)
  })

  // ── setMode ───────────────────────────────────────────────────────────

  it('setMode updates mode to study', () => {
    useSessionStore.getState().setMode('study')
    expect(useSessionStore.getState().mode).toBe('study')
  })

  it('setMode updates mode to test', () => {
    useSessionStore.getState().setMode('study')
    useSessionStore.getState().setMode('test')
    expect(useSessionStore.getState().mode).toBe('test')
  })

  // ── setPool ───────────────────────────────────────────────────────────

  it('setPool updates to new', () => {
    useSessionStore.getState().setPool('new')
    expect(useSessionStore.getState().pool).toBe('new')
  })

  it('setPool updates to missed', () => {
    useSessionStore.getState().setPool('missed')
    expect(useSessionStore.getState().pool).toBe('missed')
  })

  it('setPool updates to all', () => {
    useSessionStore.getState().setPool('missed')
    useSessionStore.getState().setPool('all')
    expect(useSessionStore.getState().pool).toBe('all')
  })

  // ── setQCount ─────────────────────────────────────────────────────────

  it('setQCount updates count', () => {
    useSessionStore.getState().setQCount(20)
    expect(useSessionStore.getState().qCount).toBe(20)
  })

  it('setQCount updates to custom value', () => {
    useSessionStore.getState().setQCount(42)
    expect(useSessionStore.getState().qCount).toBe(42)
  })

  // ── setSessionName ────────────────────────────────────────────────────

  it('setSessionName updates name', () => {
    useSessionStore.getState().setSessionName('Week 2 Review')
    expect(useSessionStore.getState().sessionName).toBe('Week 2 Review')
  })

  it('setSessionName can set empty string', () => {
    useSessionStore.getState().setSessionName('Test')
    useSessionStore.getState().setSessionName('')
    expect(useSessionStore.getState().sessionName).toBe('')
  })

  // ── startSession ──────────────────────────────────────────────────────

  it('startSession sets cards and activates', () => {
    const cards = [makeCard('1'), makeCard('2'), makeCard('3')]
    useSessionStore.getState().startSession(cards, false)
    const s = useSessionStore.getState()

    expect(s.cards).toEqual(cards)
    expect(s.isActive).toBe(true)
    expect(s.isDiagnostic).toBe(false)
    expect(s.currentIdx).toBe(0)
    expect(s.correctCount).toBe(0)
    expect(s.wrongCount).toBe(0)
    expect(s.xp).toBe(50)
    expect(s.streakCount).toBe(0)
  })

  it('startSession creates results/answers/shuffles arrays matching card count', () => {
    const cards = [makeCard('1'), makeCard('2')]
    useSessionStore.getState().startSession(cards, false)
    const s = useSessionStore.getState()

    expect(s.results.length).toBe(2)
    expect(s.answers.length).toBe(2)
    expect(s.shuffles.length).toBe(2)
    expect(s.results.every((r) => r === undefined)).toBe(true)
    expect(s.answers.every((a) => a === undefined)).toBe(true)
    expect(s.shuffles.every((sh) => sh === undefined)).toBe(true)
  })

  it('startSession with isDiagnostic true', () => {
    useSessionStore.getState().startSession([makeCard('1')], true)
    expect(useSessionStore.getState().isDiagnostic).toBe(true)
  })

  it('startSession resets counters from previous session', () => {
    useSessionStore.getState().startSession([makeCard('1')], false)
    useSessionStore.getState().recordAnswer(0, 1, true, 20)
    useSessionStore.getState().startSession([makeCard('2'), makeCard('3')], false)
    const s = useSessionStore.getState()

    expect(s.correctCount).toBe(0)
    expect(s.wrongCount).toBe(0)
    expect(s.xp).toBe(50)
    expect(s.streakCount).toBe(0)
  })

  // ── recordAnswer ──────────────────────────────────────────────────────

  it('recordAnswer correct increments correctCount and xp', () => {
    useSessionStore.getState().startSession([makeCard('1', 25)], false)
    useSessionStore.getState().recordAnswer(0, 0, true, 25)
    const s = useSessionStore.getState()

    expect(s.correctCount).toBe(1)
    expect(s.wrongCount).toBe(0)
    expect(s.xp).toBe(75)
    expect(s.results[0]).toBe(true)
    expect(s.answers[0]).toBe(0)
  })

  it('recordAnswer wrong increments wrongCount and resets streak', () => {
    useSessionStore.getState().startSession([makeCard('1'), makeCard('2')], false)
    useSessionStore.getState().recordAnswer(0, 0, true, 20)
    useSessionStore.getState().recordAnswer(1, 2, false, 0)
    const s = useSessionStore.getState()

    expect(s.correctCount).toBe(1)
    expect(s.wrongCount).toBe(1)
    expect(s.xp).toBe(70)
    expect(s.streakCount).toBe(0)
    expect(s.results[1]).toBe(false)
    expect(s.answers[1]).toBe(2)
  })

  it('recordAnswer builds streak on consecutive correct', () => {
    useSessionStore.getState().startSession([makeCard('1'), makeCard('2'), makeCard('3')], false)
    useSessionStore.getState().recordAnswer(0, 0, true, 20)
    useSessionStore.getState().recordAnswer(1, 1, true, 20)
    useSessionStore.getState().recordAnswer(2, 0, true, 20)

    expect(useSessionStore.getState().streakCount).toBe(3)
  })

  it('recordAnswer does not add xp on wrong answer', () => {
    useSessionStore.getState().startSession([makeCard('1', 30)], false)
    useSessionStore.getState().recordAnswer(0, 2, false, 30)

    expect(useSessionStore.getState().xp).toBe(50)
  })

  // ── setShuffle ────────────────────────────────────────────────────────

  it('setShuffle stores shuffle for a card index', () => {
    useSessionStore.getState().startSession([makeCard('1')], false)
    const shuffle = { opts: ['A. X', 'B. Y', 'C. Z', 'D. W'], correct: 2, origMap: [3, 1, 0, 2] }
    useSessionStore.getState().setShuffle(0, shuffle)

    expect(useSessionStore.getState().shuffles[0]).toEqual(shuffle)
  })

  it('setShuffle does not overwrite other card shuffles', () => {
    useSessionStore.getState().startSession([makeCard('1'), makeCard('2')], false)
    const s1 = { opts: ['A. A', 'B. B', 'C. C', 'D. D'], correct: 0, origMap: [0, 1, 2, 3] }
    const s2 = { opts: ['A. D', 'B. C', 'C. B', 'D. A'], correct: 3, origMap: [3, 2, 1, 0] }
    useSessionStore.getState().setShuffle(0, s1)
    useSessionStore.getState().setShuffle(1, s2)

    expect(useSessionStore.getState().shuffles[0]).toEqual(s1)
    expect(useSessionStore.getState().shuffles[1]).toEqual(s2)
  })

  // ── setCurrentIdx ─────────────────────────────────────────────────────

  it('setCurrentIdx updates index', () => {
    useSessionStore.getState().setCurrentIdx(5)
    expect(useSessionStore.getState().currentIdx).toBe(5)
  })

  it('setCurrentIdx to 0', () => {
    useSessionStore.getState().setCurrentIdx(3)
    useSessionStore.getState().setCurrentIdx(0)
    expect(useSessionStore.getState().currentIdx).toBe(0)
  })

  // ── startCardTimer / stopCardTimer ────────────────────────────────────

  it('startCardTimer sets a non-zero timestamp', () => {
    useSessionStore.getState().startCardTimer()
    expect(useSessionStore.getState().cardTimerStart).toBeGreaterThan(0)
  })

  it('stopCardTimer records elapsed time and resets start', () => {
    const store = useSessionStore.getState()
    store.startSession([makeCard('1')], false)

    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(1000000)
      .mockReturnValueOnce(1005000)

    useSessionStore.getState().startCardTimer()
    useSessionStore.getState().stopCardTimer()
    const s = useSessionStore.getState()

    expect(s.cardTimes[0]).toBe(5)
    expect(s.cardTimerStart).toBe(0)

    vi.restoreAllMocks()
  })

  it('stopCardTimer does nothing if timer not started', () => {
    useSessionStore.getState().startSession([makeCard('1')], false)
    useSessionStore.getState().stopCardTimer()

    expect(useSessionStore.getState().cardTimes).toEqual({})
  })

  // ── endSession ────────────────────────────────────────────────────────

  it('endSession sets isActive to false', () => {
    useSessionStore.getState().startSession([makeCard('1')], false)
    useSessionStore.getState().endSession()

    expect(useSessionStore.getState().isActive).toBe(false)
  })

  it('endSession preserves results and counters', () => {
    useSessionStore.getState().startSession([makeCard('1')], false)
    useSessionStore.getState().recordAnswer(0, 0, true, 20)
    useSessionStore.getState().endSession()
    const s = useSessionStore.getState()

    expect(s.correctCount).toBe(1)
    expect(s.xp).toBe(70)
    expect(s.results[0]).toBe(true)
  })

  // ── reset ─────────────────────────────────────────────────────────────

  it('reset returns to initial state', () => {
    useSessionStore.getState().startSession([makeCard('1'), makeCard('2')], true)
    useSessionStore.getState().recordAnswer(0, 1, true, 25)
    useSessionStore.getState().setMode('study')
    useSessionStore.getState().setPool('missed')
    useSessionStore.getState().setSessionName('My Session')
    useSessionStore.getState().reset()
    const s = useSessionStore.getState()

    expect(s.mode).toBe('test')
    expect(s.pool).toBe('all')
    expect(s.cards).toEqual([])
    expect(s.isActive).toBe(false)
    expect(s.correctCount).toBe(0)
    expect(s.xp).toBe(50)
    expect(s.sessionName).toBe('')
    expect(s.isDiagnostic).toBe(false)
  })
})
