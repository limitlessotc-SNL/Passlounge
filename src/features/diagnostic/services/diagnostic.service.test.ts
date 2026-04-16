/**
 * diagnostic.service unit tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockFrom = vi.fn()

vi.mock('@/config/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { loadDiagnosticResults, saveDiagnosticResults } from './diagnostic.service'

describe('diagnostic.service', () => {
  beforeEach(() => { vi.clearAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  // ── saveDiagnosticResults ─────────────────────────────────────────────

  describe('saveDiagnosticResults', () => {
    it('resolves on success', async () => {
      const chain = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
      mockFrom.mockReturnValue(chain)

      await expect(
        saveDiagnosticResults('stu-1', { completed: true, correct: 10, total: 15, catLevel: '3.5', results: [] }),
      ).resolves.toBeUndefined()

      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ student_id: 'stu-1', correct: 10, total: 15, cat_level: '3.5' }),
      )
    })

    it('throws on error', async () => {
      const chain = {
        insert: vi.fn().mockResolvedValue({ error: new Error('Insert failed') }),
      }
      mockFrom.mockReturnValue(chain)

      await expect(
        saveDiagnosticResults('stu-1', { completed: true, correct: 10, total: 15, catLevel: '3.5', results: [] }),
      ).rejects.toThrow('Insert failed')
    })
  })

  // ── loadDiagnosticResults ─────────────────────────────────────────────

  describe('loadDiagnosticResults', () => {
    it('returns diagnostic result on success', async () => {
      const fakeRow = { correct: 10, total: 15, cat_level: '3.5', results: [true, false, true] }
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: fakeRow, error: null }),
      }
      mockFrom.mockReturnValue(chain)

      const result = await loadDiagnosticResults('stu-1')

      expect(result).toEqual({
        completed: true,
        correct: 10,
        total: 15,
        catLevel: '3.5',
        results: [true, false, true],
      })
    })

    it('returns null when no results found (PGRST116)', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } }),
      }
      mockFrom.mockReturnValue(chain)

      const result = await loadDiagnosticResults('stu-1')

      expect(result).toBeNull()
    })

    it('returns null when data is null', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockFrom.mockReturnValue(chain)

      const result = await loadDiagnosticResults('stu-1')

      expect(result).toBeNull()
    })

    it('throws on other errors', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
      }
      mockFrom.mockReturnValue(chain)

      await expect(loadDiagnosticResults('stu-1')).rejects.toThrow('DB error')
    })

    it('handles null results field gracefully', async () => {
      const fakeRow = { correct: 5, total: 15, cat_level: '2.0', results: null }
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: fakeRow, error: null }),
      }
      mockFrom.mockReturnValue(chain)

      const result = await loadDiagnosticResults('stu-1')

      expect(result?.results).toEqual([])
    })
  })
})
