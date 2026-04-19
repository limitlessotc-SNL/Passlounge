/**
 * cpr.service unit tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockFrom = vi.fn()
const mockStorageFrom = vi.fn()

vi.mock('@/config/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    storage: {
      from: (...args: unknown[]) => mockStorageFrom(...args),
    },
  },
}))

import type { CPRReport } from '@/types'

import {
  deleteCPRReport,
  getLatestCPRReport,
  insertCPRReport,
  listCPRReports,
} from './cpr.service'

const sampleReport: CPRReport = {
  id: 'r-1',
  student_id: 'stu-1',
  attempt_date: '2026-03-01',
  overall_result: 'fail',
  image_path: null,
  categories: { management_of_care: 'below', safety_and_infection_control: 'above' },
  created_at: '2026-03-02T00:00:00Z',
}

describe('cpr.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── getLatestCPRReport ────────────────────────────────────────────

  describe('getLatestCPRReport', () => {
    it('returns the most recent report', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: sampleReport, error: null }),
      }
      mockFrom.mockReturnValue(chain)

      const result = await getLatestCPRReport('stu-1')

      expect(result).toEqual(sampleReport)
      expect(mockFrom).toHaveBeenCalledWith('cpr_reports')
      expect(chain.eq).toHaveBeenCalledWith('student_id', 'stu-1')
      expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('returns null when no rows exist', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockFrom.mockReturnValue(chain)

      expect(await getLatestCPRReport('stu-1')).toBeNull()
    })

    it('throws on supabase error', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error('DB down') }),
      }
      mockFrom.mockReturnValue(chain)

      await expect(getLatestCPRReport('stu-1')).rejects.toThrow('DB down')
    })
  })

  // ── listCPRReports ────────────────────────────────────────────────

  describe('listCPRReports', () => {
    it('returns all reports newest first', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [sampleReport, sampleReport], error: null }),
      }
      mockFrom.mockReturnValue(chain)

      const out = await listCPRReports('stu-1')
      expect(out.length).toBe(2)
      expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('returns empty array when no rows', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockFrom.mockReturnValue(chain)

      expect(await listCPRReports('stu-1')).toEqual([])
    })
  })

  // ── insertCPRReport ───────────────────────────────────────────────

  describe('insertCPRReport', () => {
    it('inserts and returns the new row', async () => {
      const chain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: sampleReport, error: null }),
      }
      mockFrom.mockReturnValue(chain)

      const result = await insertCPRReport('stu-1', {
        attempt_date: '2026-03-01',
        overall_result: 'fail',
        image_path: null,
        categories: { management_of_care: 'below' },
      })

      expect(result).toEqual(sampleReport)
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          student_id: 'stu-1',
          attempt_date: '2026-03-01',
          overall_result: 'fail',
          categories: { management_of_care: 'below' },
        }),
      )
    })

    it('throws on insert error', async () => {
      const chain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Insert failed') }),
      }
      mockFrom.mockReturnValue(chain)

      await expect(
        insertCPRReport('stu-1', {
          attempt_date: null,
          overall_result: null,
          image_path: null,
          categories: {},
        }),
      ).rejects.toThrow('Insert failed')
    })
  })

  // ── deleteCPRReport ───────────────────────────────────────────────

  describe('deleteCPRReport', () => {
    it('deletes the row and removes the photo', async () => {
      const chain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
      mockFrom.mockReturnValue(chain)
      const remove = vi.fn().mockResolvedValue({ error: null })
      mockStorageFrom.mockReturnValue({ remove })

      await deleteCPRReport({ ...sampleReport, image_path: 'stu-1/123.jpg' })

      expect(chain.eq).toHaveBeenCalledWith('id', sampleReport.id)
      expect(remove).toHaveBeenCalledWith(['stu-1/123.jpg'])
    })

    it('swallows photo delete errors', async () => {
      const chain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
      mockFrom.mockReturnValue(chain)
      const remove = vi.fn().mockRejectedValue(new Error('gone'))
      mockStorageFrom.mockReturnValue({ remove })

      await expect(
        deleteCPRReport({ ...sampleReport, image_path: 'stu-1/123.jpg' }),
      ).resolves.toBeUndefined()
    })

    it('skips storage when image_path is null', async () => {
      const chain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
      mockFrom.mockReturnValue(chain)

      await deleteCPRReport({ ...sampleReport, image_path: null })
      expect(mockStorageFrom).not.toHaveBeenCalled()
    })

    it('throws when row delete fails', async () => {
      const chain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: new Error('RLS fail') }),
      }
      mockFrom.mockReturnValue(chain)

      await expect(deleteCPRReport(sampleReport)).rejects.toThrow('RLS fail')
    })
  })

})
