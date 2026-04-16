/**
 * progress.service unit tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CardProgress } from '@/types'

const mockFrom = vi.fn()

vi.mock('@/config/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { batchUpsertProgress, loadCardProgress, retrySRQueue } from './progress.service'

describe('progress.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  // ── loadCardProgress ──────────────────────────────────────────────────

  describe('loadCardProgress', () => {
    it('returns a map of card_id to CardProgress', async () => {
      const fakeRows = [
        { card_id: 'c1', times_seen: 3, times_correct: 2, times_wrong: 1, ease_factor: 2.5, next_review: '2026-05-01', last_seen: '2026-04-15' },
        { card_id: 'c2', times_seen: 1, times_correct: 1, times_wrong: 0, ease_factor: 2.6, next_review: '2026-05-03', last_seen: '2026-04-15' },
      ]
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: fakeRows, error: null }),
      }
      mockFrom.mockReturnValue(chain)

      const result = await loadCardProgress('stu-1')

      expect(Object.keys(result)).toEqual(['c1', 'c2'])
      expect(result['c1'].times_seen).toBe(3)
      expect(result['c2'].ease_factor).toBe(2.6)
    })

    it('returns empty map when no progress exists', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockFrom.mockReturnValue(chain)

      const result = await loadCardProgress('stu-1')

      expect(result).toEqual({})
    })

    it('returns empty map when data is null', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockFrom.mockReturnValue(chain)

      const result = await loadCardProgress('stu-1')

      expect(result).toEqual({})
    })

    it('throws on error', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
      }
      mockFrom.mockReturnValue(chain)

      await expect(loadCardProgress('stu-1')).rejects.toThrow('DB error')
    })
  })

  // ── batchUpsertProgress ───────────────────────────────────────────────

  describe('batchUpsertProgress', () => {
    const makeRow = (cardId: string): CardProgress => ({
      card_id: cardId,
      student_id: 'stu-1',
      times_seen: 1,
      times_correct: 1,
      times_wrong: 0,
      ease_factor: 2.6,
      next_review: '2026-05-01T00:00:00Z',
      last_seen: '2026-04-15T00:00:00Z',
    })

    it('resolves on success', async () => {
      const chain = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockFrom.mockReturnValue(chain)

      await expect(batchUpsertProgress([makeRow('c1')])).resolves.toBeUndefined()
      expect(chain.upsert).toHaveBeenCalledWith(
        [makeRow('c1')],
        { onConflict: 'student_id,card_id' },
      )
    })

    it('does nothing when rows array is empty', async () => {
      await expect(batchUpsertProgress([])).resolves.toBeUndefined()
      expect(mockFrom).not.toHaveBeenCalled()
    })

    it('queues to localStorage and throws on error', async () => {
      const chain = {
        upsert: vi.fn().mockResolvedValue({ error: new Error('Upsert failed') }),
      }
      mockFrom.mockReturnValue(chain)

      await expect(batchUpsertProgress([makeRow('c1')])).rejects.toThrow('Upsert failed')

      const queue = JSON.parse(localStorage.getItem('pl_sr_queue') ?? '[]')
      expect(queue.length).toBe(1)
      expect(queue[0].card_id).toBe('c1')
    })

    it('appends to existing localStorage queue on error', async () => {
      localStorage.setItem('pl_sr_queue', JSON.stringify([makeRow('existing')]))
      const chain = {
        upsert: vi.fn().mockResolvedValue({ error: new Error('Fail') }),
      }
      mockFrom.mockReturnValue(chain)

      await expect(batchUpsertProgress([makeRow('new')])).rejects.toThrow()

      const queue = JSON.parse(localStorage.getItem('pl_sr_queue') ?? '[]')
      expect(queue.length).toBe(2)
    })
  })

  // ── retrySRQueue ──────────────────────────────────────────────────────

  describe('retrySRQueue', () => {
    const makeRow = (cardId: string): CardProgress => ({
      card_id: cardId,
      student_id: 'stu-1',
      times_seen: 1,
      times_correct: 1,
      times_wrong: 0,
      ease_factor: 2.5,
      next_review: '2026-05-01T00:00:00Z',
      last_seen: '2026-04-15T00:00:00Z',
    })

    it('flushes queue on success and removes from localStorage', async () => {
      localStorage.setItem('pl_sr_queue', JSON.stringify([makeRow('c1')]))
      const chain = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockFrom.mockReturnValue(chain)

      await retrySRQueue()

      expect(localStorage.getItem('pl_sr_queue')).toBeNull()
      expect(chain.upsert).toHaveBeenCalled()
    })

    it('does nothing when queue is empty', async () => {
      await retrySRQueue()

      expect(mockFrom).not.toHaveBeenCalled()
    })

    it('does nothing when localStorage has empty array', async () => {
      localStorage.setItem('pl_sr_queue', '[]')

      await retrySRQueue()

      expect(mockFrom).not.toHaveBeenCalled()
    })

    it('keeps queue in localStorage when upsert fails', async () => {
      localStorage.setItem('pl_sr_queue', JSON.stringify([makeRow('c1')]))
      const chain = {
        upsert: vi.fn().mockResolvedValue({ error: new Error('Still failing') }),
      }
      mockFrom.mockReturnValue(chain)

      await retrySRQueue()

      expect(localStorage.getItem('pl_sr_queue')).not.toBeNull()
    })
  })
})
