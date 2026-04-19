/**
 * dataLoader.service unit tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDashboardStore } from '@/store/dashboardStore'
import { useSRStore } from '@/store/srStore'
import type { SessionSnapshot } from '@/types'

// Mock the three service dependencies
vi.mock('@/features/session/services/sessions.service', () => ({
  getSessionHistory: vi.fn(),
}))
vi.mock('@/features/diagnostic/services/diagnostic.service', () => ({
  loadDiagnosticResults: vi.fn(),
}))
vi.mock('@/features/sr/services/progress.service', () => ({
  loadCardProgress: vi.fn(),
}))

import { loadDiagnosticResults } from '@/features/diagnostic/services/diagnostic.service'
import { getSessionHistory } from '@/features/session/services/sessions.service'
import { loadCardProgress } from '@/features/sr/services/progress.service'

import { buildSeenTitlesMap, computePLStats, loadUserData } from './dataLoader.service'

const mockSessions = vi.mocked(getSessionHistory)
const mockDiag = vi.mocked(loadDiagnosticResults)
const mockProgress = vi.mocked(loadCardProgress)

const makeSnapshot = (overrides: Partial<SessionSnapshot> = {}): SessionSnapshot => ({
  id: 1,
  name: 'Sess',
  mode: 'test',
  date: 'Apr 18',
  categories: 'Cardiac',
  correct: 8,
  wrong: 2,
  total: 10,
  pct: 80,
  cards: [],
  results: [],
  answers: [],
  shuffles: [],
  ...overrides,
})

describe('dataLoader.service', () => {
  beforeEach(() => { vi.clearAllMocks() })

  afterEach(() => {
    useDashboardStore.setState({
      diagnosticResult: { completed: false, correct: 0, total: 0, catLevel: '—', results: [] },
      sessionHistory: [],
      plStats: { cards: 0, xp: 50, sessions: 0 },
      streakDays: 1,
      seenCardTitles: {},
    })
    useSRStore.setState({
      cardProgressMap: {},
      cardProgressLoaded: false,
      srPendingUpdates: {},
    })
  })

  // ── computePLStats ─────────────────────────────────────────────────

  describe('computePLStats', () => {
    it('returns base stats for empty sessions', () => {
      expect(computePLStats([])).toEqual({ cards: 0, xp: 50, sessions: 0 })
    })

    it('sums total cards across sessions', () => {
      const stats = computePLStats([
        makeSnapshot({ total: 10 }),
        makeSnapshot({ total: 20 }),
      ])
      expect(stats.cards).toBe(30)
    })

    it('calculates xp as 50 base + 20 per correct', () => {
      const stats = computePLStats([
        makeSnapshot({ correct: 8 }),
        makeSnapshot({ correct: 5 }),
      ])
      expect(stats.xp).toBe(50 + 13 * 20)
    })

    it('counts sessions', () => {
      expect(computePLStats([makeSnapshot(), makeSnapshot(), makeSnapshot()]).sessions).toBe(3)
    })
  })

  // ── buildSeenTitlesMap ─────────────────────────────────────────────

  describe('buildSeenTitlesMap', () => {
    it('returns empty map for no sessions', () => {
      expect(buildSeenTitlesMap([])).toEqual({})
    })

    it('marks each card title from all sessions', () => {
      const map = buildSeenTitlesMap([
        makeSnapshot({
          cards: [
            { title: 'Card A', cat: '', bloom: '', xp: 0, type: '', scenario: '', question: '', opts: [], correct: 0, layers: [], lens: '', pearl: '', mnemonic: [], why_wrong: {} },
            { title: 'Card B', cat: '', bloom: '', xp: 0, type: '', scenario: '', question: '', opts: [], correct: 0, layers: [], lens: '', pearl: '', mnemonic: [], why_wrong: {} },
          ],
        }),
        makeSnapshot({
          cards: [
            { title: 'Card C', cat: '', bloom: '', xp: 0, type: '', scenario: '', question: '', opts: [], correct: 0, layers: [], lens: '', pearl: '', mnemonic: [], why_wrong: {} },
          ],
        }),
      ])
      expect(map).toEqual({ 'Card A': true, 'Card B': true, 'Card C': true })
    })

    it('dedupes titles across sessions', () => {
      const map = buildSeenTitlesMap([
        makeSnapshot({
          cards: [{ title: 'Card A', cat: '', bloom: '', xp: 0, type: '', scenario: '', question: '', opts: [], correct: 0, layers: [], lens: '', pearl: '', mnemonic: [], why_wrong: {} }],
        }),
        makeSnapshot({
          cards: [{ title: 'Card A', cat: '', bloom: '', xp: 0, type: '', scenario: '', question: '', opts: [], correct: 0, layers: [], lens: '', pearl: '', mnemonic: [], why_wrong: {} }],
        }),
      ])
      expect(Object.keys(map).length).toBe(1)
    })
  })

  // ── loadUserData ───────────────────────────────────────────────────

  describe('loadUserData', () => {
    it('populates sessionHistory from sessions.service', async () => {
      const sessions = [makeSnapshot({ name: 'S1' }), makeSnapshot({ name: 'S2' })]
      mockSessions.mockResolvedValue(sessions)
      mockDiag.mockResolvedValue(null)
      mockProgress.mockResolvedValue({})

      await loadUserData('stu-1')

      expect(useDashboardStore.getState().sessionHistory.length).toBe(2)
      expect(useDashboardStore.getState().sessionHistory[0].name).toBe('S1')
    })

    it('computes and populates plStats', async () => {
      mockSessions.mockResolvedValue([
        makeSnapshot({ correct: 8, total: 10 }),
        makeSnapshot({ correct: 5, total: 10 }),
      ])
      mockDiag.mockResolvedValue(null)
      mockProgress.mockResolvedValue({})

      await loadUserData('stu-1')

      const stats = useDashboardStore.getState().plStats
      expect(stats.cards).toBe(20)
      expect(stats.xp).toBe(50 + 13 * 20)
      expect(stats.sessions).toBe(2)
    })

    it('computes and populates streakDays from sessions', async () => {
      const today = new Date()
      const yesterday = new Date()
      yesterday.setDate(today.getDate() - 1)

      mockSessions.mockResolvedValue([
        makeSnapshot({ createdAt: today.toISOString() }),
        makeSnapshot({ createdAt: yesterday.toISOString() }),
      ])
      mockDiag.mockResolvedValue(null)
      mockProgress.mockResolvedValue({})

      await loadUserData('stu-1')

      expect(useDashboardStore.getState().streakDays).toBe(2)
    })

    it('sets streakDays to 0 when no sessions have createdAt', async () => {
      mockSessions.mockResolvedValue([makeSnapshot()])
      mockDiag.mockResolvedValue(null)
      mockProgress.mockResolvedValue({})

      await loadUserData('stu-1')

      expect(useDashboardStore.getState().streakDays).toBe(0)
    })

    it('populates seenCardTitles from sessions', async () => {
      mockSessions.mockResolvedValue([
        makeSnapshot({
          cards: [{ title: 'Card A', cat: '', bloom: '', xp: 0, type: '', scenario: '', question: '', opts: [], correct: 0, layers: [], lens: '', pearl: '', mnemonic: [], why_wrong: {} }],
        }),
      ])
      mockDiag.mockResolvedValue(null)
      mockProgress.mockResolvedValue({})

      await loadUserData('stu-1')

      expect(useDashboardStore.getState().seenCardTitles['Card A']).toBe(true)
    })

    it('populates diagnosticResult when non-null', async () => {
      mockSessions.mockResolvedValue([])
      mockDiag.mockResolvedValue({
        completed: true,
        correct: 10,
        total: 15,
        catLevel: '3.5',
        results: [],
      })
      mockProgress.mockResolvedValue({})

      await loadUserData('stu-1')

      const diag = useDashboardStore.getState().diagnosticResult
      expect(diag.completed).toBe(true)
      expect(diag.correct).toBe(10)
    })

    it('leaves diagnosticResult untouched when null', async () => {
      mockSessions.mockResolvedValue([])
      mockDiag.mockResolvedValue(null)
      mockProgress.mockResolvedValue({})

      await loadUserData('stu-1')

      expect(useDashboardStore.getState().diagnosticResult.completed).toBe(false)
    })

    it('populates cardProgressMap in srStore', async () => {
      mockSessions.mockResolvedValue([])
      mockDiag.mockResolvedValue(null)
      mockProgress.mockResolvedValue({
        'card-1': {
          card_id: 'card-1',
          student_id: 'stu-1',
          times_seen: 3,
          times_correct: 2,
          times_wrong: 1,
          ease_factor: 2.5,
          next_review: '2026-05-01',
          last_seen: '2026-04-15',
        },
      })

      await loadUserData('stu-1')

      expect(useSRStore.getState().cardProgressMap['card-1']).toBeDefined()
      expect(useSRStore.getState().cardProgressLoaded).toBe(true)
    })

    it('tolerates sessions service failure without crashing', async () => {
      mockSessions.mockRejectedValue(new Error('DB down'))
      mockDiag.mockResolvedValue(null)
      mockProgress.mockResolvedValue({})

      await expect(loadUserData('stu-1')).resolves.toBeUndefined()
      // Session history stays empty
      expect(useDashboardStore.getState().sessionHistory).toEqual([])
    })

    it('tolerates diagnostic service failure without crashing', async () => {
      mockSessions.mockResolvedValue([])
      mockDiag.mockRejectedValue(new Error('DB down'))
      mockProgress.mockResolvedValue({})

      await expect(loadUserData('stu-1')).resolves.toBeUndefined()
    })

    it('tolerates progress service failure without crashing', async () => {
      mockSessions.mockResolvedValue([])
      mockDiag.mockResolvedValue(null)
      mockProgress.mockRejectedValue(new Error('DB down'))

      await expect(loadUserData('stu-1')).resolves.toBeUndefined()
      expect(useSRStore.getState().cardProgressLoaded).toBe(false)
    })

    it('still loads partial data when one service fails', async () => {
      mockSessions.mockResolvedValue([makeSnapshot({ name: 'survived' })])
      mockDiag.mockRejectedValue(new Error('DB down'))
      mockProgress.mockResolvedValue({})

      await loadUserData('stu-1')

      expect(useDashboardStore.getState().sessionHistory.length).toBe(1)
      expect(useDashboardStore.getState().sessionHistory[0].name).toBe('survived')
    })
  })
})
