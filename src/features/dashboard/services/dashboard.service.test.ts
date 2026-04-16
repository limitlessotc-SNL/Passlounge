/**
 * dashboard.service unit tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockFrom = vi.fn()

vi.mock('@/config/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { getStudentStats } from './dashboard.service'

describe('dashboard.service', () => {
  beforeEach(() => { vi.clearAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  describe('getStudentStats', () => {
    it('returns aggregated stats from sessions', async () => {
      const fakeRows = [
        { correct: 8, wrong: 2, xp: 210, card_count: 10 },
        { correct: 5, wrong: 5, xp: 150, card_count: 10 },
      ]
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      }
      // Second eq call returns the final result
      chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ data: fakeRows, error: null })
      mockFrom.mockReturnValue(chain)

      const stats = await getStudentStats('stu-1')

      expect(stats.cards).toBe(20)
      expect(stats.xp).toBe(410) // 50 base + 210 + 150
      expect(stats.sessions).toBe(2)
    })

    it('returns default stats when no sessions', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      }
      chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ data: [], error: null })
      mockFrom.mockReturnValue(chain)

      const stats = await getStudentStats('stu-1')

      expect(stats).toEqual({ cards: 0, xp: 50, sessions: 0 })
    })

    it('returns default stats when data is null', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      }
      chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      const stats = await getStudentStats('stu-1')

      expect(stats).toEqual({ cards: 0, xp: 50, sessions: 0 })
    })

    it('throws on error', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      }
      chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ data: null, error: new Error('Query failed') })
      mockFrom.mockReturnValue(chain)

      await expect(getStudentStats('stu-1')).rejects.toThrow('Query failed')
    })

    it('handles sessions with missing card_count', async () => {
      const fakeRows = [
        { correct: 5, wrong: 0, xp: 100, card_count: null },
      ]
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      }
      chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ data: fakeRows, error: null })
      mockFrom.mockReturnValue(chain)

      const stats = await getStudentStats('stu-1')

      expect(stats.cards).toBe(0)
      expect(stats.sessions).toBe(1)
    })
  })
})
