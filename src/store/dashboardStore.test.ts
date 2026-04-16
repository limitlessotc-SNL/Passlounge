/**
 * dashboardStore unit tests
 */

import { afterEach, describe, expect, it } from 'vitest'

import type { SessionSnapshot } from '@/types'

import { useDashboardStore } from './dashboardStore'

const makeSnapshot = (id: number, correct: number, wrong: number): SessionSnapshot => ({
  id,
  name: `Session ${id}`,
  mode: 'test',
  date: 'Apr 15',
  categories: 'Cardiac, Pharmacology',
  correct,
  wrong,
  total: correct + wrong,
  pct: Math.round((correct / (correct + wrong)) * 100),
  cards: [],
  results: [],
  answers: [],
  shuffles: [],
})

describe('dashboardStore', () => {
  afterEach(() => {
    useDashboardStore.setState({
      diagnosticResult: { completed: false, correct: 0, total: 0, catLevel: '—', results: [] },
      sessionHistory: [],
      plStats: { cards: 0, xp: 50, sessions: 0 },
      streakDays: 1,
      seenCardTitles: {},
    })
  })

  // ── Initial State ─────────────────────────────────────────────────────

  it('has correct initial state', () => {
    const s = useDashboardStore.getState()

    expect(s.diagnosticResult.completed).toBe(false)
    expect(s.diagnosticResult.correct).toBe(0)
    expect(s.diagnosticResult.total).toBe(0)
    expect(s.diagnosticResult.catLevel).toBe('—')
    expect(s.sessionHistory).toEqual([])
    expect(s.plStats.cards).toBe(0)
    expect(s.plStats.xp).toBe(50)
    expect(s.plStats.sessions).toBe(0)
    expect(s.streakDays).toBe(1)
    expect(s.seenCardTitles).toEqual({})
  })

  // ── setDiagnosticResult ───────────────────────────────────────────────

  it('setDiagnosticResult sets completed result', () => {
    useDashboardStore.getState().setDiagnosticResult({
      completed: true,
      correct: 10,
      total: 15,
      catLevel: '3.5',
      results: [true, false, true],
    })

    const r = useDashboardStore.getState().diagnosticResult
    expect(r.completed).toBe(true)
    expect(r.correct).toBe(10)
    expect(r.total).toBe(15)
    expect(r.catLevel).toBe('3.5')
  })

  it('setDiagnosticResult replaces previous result', () => {
    useDashboardStore.getState().setDiagnosticResult({ completed: true, correct: 5, total: 15, catLevel: '2.0', results: [] })
    useDashboardStore.getState().setDiagnosticResult({ completed: true, correct: 12, total: 15, catLevel: '4.0', results: [] })

    expect(useDashboardStore.getState().diagnosticResult.correct).toBe(12)
  })

  // ── addSession ────────────────────────────────────────────────────────

  it('addSession appends to session history', () => {
    useDashboardStore.getState().addSession(makeSnapshot(1, 8, 2))

    expect(useDashboardStore.getState().sessionHistory.length).toBe(1)
    expect(useDashboardStore.getState().sessionHistory[0].name).toBe('Session 1')
  })

  it('addSession increments plStats', () => {
    useDashboardStore.getState().addSession(makeSnapshot(1, 8, 2))

    const stats = useDashboardStore.getState().plStats
    expect(stats.cards).toBe(10)
    expect(stats.xp).toBe(210) // 50 base + 8*20
    expect(stats.sessions).toBe(1)
  })

  it('addSession accumulates across multiple sessions', () => {
    useDashboardStore.getState().addSession(makeSnapshot(1, 8, 2))
    useDashboardStore.getState().addSession(makeSnapshot(2, 5, 5))

    const stats = useDashboardStore.getState().plStats
    expect(stats.cards).toBe(20)
    expect(stats.xp).toBe(310) // 50 + 160 + 100
    expect(stats.sessions).toBe(2)
    expect(useDashboardStore.getState().sessionHistory.length).toBe(2)
  })

  // ── setStats ──────────────────────────────────────────────────────────

  it('setStats overwrites plStats', () => {
    useDashboardStore.getState().setStats({ cards: 100, xp: 2000, sessions: 10 })

    expect(useDashboardStore.getState().plStats).toEqual({ cards: 100, xp: 2000, sessions: 10 })
  })

  // ── setStreak ─────────────────────────────────────────────────────────

  it('setStreak updates streak days', () => {
    useDashboardStore.getState().setStreak(5)

    expect(useDashboardStore.getState().streakDays).toBe(5)
  })

  it('setStreak can reset to 0', () => {
    useDashboardStore.getState().setStreak(5)
    useDashboardStore.getState().setStreak(0)

    expect(useDashboardStore.getState().streakDays).toBe(0)
  })

  // ── markCardSeen ──────────────────────────────────────────────────────

  it('markCardSeen adds title to seen map', () => {
    useDashboardStore.getState().markCardSeen('MI Priority')

    expect(useDashboardStore.getState().seenCardTitles['MI Priority']).toBe(true)
  })

  it('markCardSeen does not overwrite existing entries', () => {
    useDashboardStore.getState().markCardSeen('Card A')
    useDashboardStore.getState().markCardSeen('Card B')

    expect(useDashboardStore.getState().seenCardTitles['Card A']).toBe(true)
    expect(useDashboardStore.getState().seenCardTitles['Card B']).toBe(true)
  })

  it('markCardSeen is idempotent', () => {
    useDashboardStore.getState().markCardSeen('Card A')
    useDashboardStore.getState().markCardSeen('Card A')

    expect(Object.keys(useDashboardStore.getState().seenCardTitles).length).toBe(1)
  })
})
