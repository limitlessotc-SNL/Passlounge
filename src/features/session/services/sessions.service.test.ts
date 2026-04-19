/**
 * sessions.service unit tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SessionSnapshot } from '@/types'

const mockFrom = vi.fn()

vi.mock('@/config/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import {
  createSession,
  getSessionHistory,
  saveCompletedSession,
  updateSession,
} from './sessions.service'

describe('sessions.service', () => {
  beforeEach(() => { vi.clearAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  // ── createSession ───────────────────────────────────────────────────

  describe('createSession', () => {
    it('returns session id on success', async () => {
      const chain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'sess-123' }, error: null }),
      }
      mockFrom.mockReturnValue(chain)

      const id = await createSession({
        studentId: 'stu-1',
        name: 'Session 1',
        mode: 'test',
        cardCount: 10,
      })

      expect(id).toBe('sess-123')
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          student_id: 'stu-1',
          name: 'Session 1',
          mode: 'test',
          card_count: 10,
        }),
      )
    })

    it('returns null when no id returned', async () => {
      const chain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockFrom.mockReturnValue(chain)

      const id = await createSession({
        studentId: 'stu-1',
        name: 'Session 1',
        mode: 'test',
        cardCount: 10,
      })

      expect(id).toBeNull()
    })

    it('throws on error', async () => {
      const chain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Insert failed') }),
      }
      mockFrom.mockReturnValue(chain)

      await expect(
        createSession({ studentId: 'stu-1', name: 'S', mode: 'test', cardCount: 5 }),
      ).rejects.toThrow('Insert failed')
    })
  })

  // ── updateSession ───────────────────────────────────────────────────

  describe('updateSession', () => {
    it('resolves on success', async () => {
      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
      mockFrom.mockReturnValue(chain)

      await expect(
        updateSession('sess-123', { correct: 8, wrong: 2, xp: 210, completed: true }),
      ).resolves.toBeUndefined()
    })

    it('throws on error', async () => {
      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: new Error('Update failed') }),
      }
      mockFrom.mockReturnValue(chain)

      await expect(
        updateSession('sess-123', { correct: 0, wrong: 0, xp: 50, completed: false }),
      ).rejects.toThrow('Update failed')
    })
  })

  // ── saveCompletedSession ─────────────────────────────────────────────

  describe('saveCompletedSession', () => {
    const makeSnapshot = (): SessionSnapshot => ({
      id: 1,
      name: 'Week 1',
      mode: 'test',
      date: 'Apr 18',
      categories: 'Cardiac, Pharma',
      correct: 8,
      wrong: 2,
      total: 10,
      pct: 80,
      cards: [],
      results: [],
      answers: [],
      shuffles: [],
    })

    it('resolves on success', async () => {
      const chain = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockFrom.mockReturnValue(chain)

      await expect(saveCompletedSession('stu-1', makeSnapshot())).resolves.toBeUndefined()
    })

    it('inserts with completed=true and calculated xp', async () => {
      const chain = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockFrom.mockReturnValue(chain)

      await saveCompletedSession('stu-1', makeSnapshot())

      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          student_id: 'stu-1',
          name: 'Week 1',
          mode: 'test',
          card_count: 10,
          correct: 8,
          wrong: 2,
          xp: 210, // 50 + 8 * 20
          completed: true,
          date: 'Apr 18',
          categories: 'Cardiac, Pharma',
        }),
      )
    })

    it('stores full snapshot JSONB (cards, results, answers, shuffles)', async () => {
      const chain = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockFrom.mockReturnValue(chain)

      await saveCompletedSession('stu-1', makeSnapshot())

      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          snapshot: expect.objectContaining({
            cards: [],
            results: [],
            answers: [],
            shuffles: [],
            pct: 80,
          }),
        }),
      )
    })

    it('throws on error', async () => {
      const chain = {
        insert: vi.fn().mockResolvedValue({ error: new Error('Insert failed') }),
      }
      mockFrom.mockReturnValue(chain)

      await expect(saveCompletedSession('stu-1', makeSnapshot())).rejects.toThrow('Insert failed')
    })
  })

  // ── getSessionHistory ───────────────────────────────────────────────

  describe('getSessionHistory', () => {
    function chainMock(result: { data: unknown; error: unknown }) {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(result),
      }
      mockFrom.mockReturnValue(chain)
      return chain
    }

    it('returns SessionSnapshot array from rows with snapshot JSONB', async () => {
      const fakeRows = [
        {
          id: 's1',
          name: 'Sess 1',
          mode: 'test',
          card_count: 10,
          correct: 8,
          wrong: 2,
          date: 'Apr 18',
          categories: 'Cardiac',
          created_at: '2026-04-18T10:00:00Z',
          snapshot: {
            cards: [{ title: 'Card A' }],
            results: [true],
            answers: [0],
            shuffles: [],
            pct: 80,
          },
        },
      ]
      chainMock({ data: fakeRows, error: null })

      const result = await getSessionHistory('stu-1')

      expect(result.length).toBe(1)
      expect(result[0].name).toBe('Sess 1')
      expect(result[0].mode).toBe('test')
      expect(result[0].correct).toBe(8)
      expect(result[0].wrong).toBe(2)
      expect(result[0].total).toBe(10)
      expect(result[0].pct).toBe(80)
      expect(result[0].cards.length).toBe(1)
    })

    it('returns empty arrays for fields when snapshot is missing (backward compat)', async () => {
      const fakeRows = [
        {
          id: 's1',
          name: 'Old Sess',
          mode: 'study',
          card_count: 10,
          correct: 5,
          wrong: 5,
          created_at: '2026-04-18T10:00:00Z',
        },
      ]
      chainMock({ data: fakeRows, error: null })

      const result = await getSessionHistory('stu-1')

      expect(result[0].cards).toEqual([])
      expect(result[0].results).toEqual([])
      expect(result[0].answers).toEqual([])
      expect(result[0].shuffles).toEqual([])
      expect(result[0].pct).toBe(50) // computed from correct/total
    })

    it('computes pct when snapshot pct is missing', async () => {
      const fakeRows = [
        {
          id: 's1',
          name: 'X',
          mode: 'test',
          card_count: 20,
          correct: 15,
          wrong: 5,
          created_at: '2026-04-18T10:00:00Z',
        },
      ]
      chainMock({ data: fakeRows, error: null })

      const result = await getSessionHistory('stu-1')

      expect(result[0].pct).toBe(75)
    })

    it('formats created_at to "Mon Day" when date column is missing', async () => {
      const fakeRows = [
        {
          id: 's1',
          name: 'X',
          mode: 'test',
          card_count: 10,
          correct: 5,
          wrong: 5,
          created_at: '2026-04-18T10:00:00Z',
        },
      ]
      chainMock({ data: fakeRows, error: null })

      const result = await getSessionHistory('stu-1')

      expect(result[0].date).toMatch(/^[A-Z][a-z]{2} \d+$/)
    })

    it('returns empty array when no sessions', async () => {
      chainMock({ data: [], error: null })

      const result = await getSessionHistory('stu-1')

      expect(result).toEqual([])
    })

    it('returns empty array when data is null', async () => {
      chainMock({ data: null, error: null })

      const result = await getSessionHistory('stu-1')

      expect(result).toEqual([])
    })

    it('throws on error', async () => {
      chainMock({ data: null, error: new Error('Query failed') })

      await expect(getSessionHistory('stu-1')).rejects.toThrow('Query failed')
    })
  })
})
