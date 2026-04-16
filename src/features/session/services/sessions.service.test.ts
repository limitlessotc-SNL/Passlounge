/**
 * sessions.service unit tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockFrom = vi.fn()

vi.mock('@/config/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { createSession, getSessionHistory, updateSession } from './sessions.service'

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

  // ── getSessionHistory ───────────────────────────────────────────────

  describe('getSessionHistory', () => {
    it('returns session rows on success', async () => {
      const fakeRows = [{ id: 's1', correct: 10 }, { id: 's2', correct: 5 }]
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: fakeRows, error: null }),
      }
      mockFrom.mockReturnValue(chain)

      const result = await getSessionHistory('stu-1')

      expect(result).toEqual(fakeRows)
    })

    it('returns empty array when no sessions', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockFrom.mockReturnValue(chain)

      const result = await getSessionHistory('stu-1')

      expect(result).toEqual([])
    })

    it('throws on error', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('Query failed') }),
      }
      mockFrom.mockReturnValue(chain)

      await expect(getSessionHistory('stu-1')).rejects.toThrow('Query failed')
    })
  })
})
