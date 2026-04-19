/**
 * useCPR unit tests
 */

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/store/authStore'
import { useCPRStore } from '@/store/cprStore'
import type { CPRReport } from '@/types'

vi.mock('../services/cpr.service', () => ({
  getLatestCPRReport: vi.fn(),
  insertCPRReport: vi.fn(),
}))

vi.mock('@/features/onboarding/services/student.service', () => ({
  upsertStudent: vi.fn().mockResolvedValue({ id: 'stu-1' }),
}))

import { upsertStudent } from '@/features/onboarding/services/student.service'

import { getLatestCPRReport, insertCPRReport } from '../services/cpr.service'
import { useCPR } from './useCPR'

const mockGetLatest = vi.mocked(getLatestCPRReport)
const mockInsert = vi.mocked(insertCPRReport)
const mockUpsertStudent = vi.mocked(upsertStudent)

const sampleReport: CPRReport = {
  id: 'r-1',
  student_id: 'stu-1',
  attempt_date: '2026-03-01',
  overall_result: null,
  image_path: null,
  categories: { management_of_care: 'below' },
  created_at: '2026-03-02T00:00:00Z',
}

describe('useCPR', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: { id: 'stu-1', email: 't@t.com' },
      supaStudentId: 'stu-1',
      token: 'real-token',
      isAuthenticated: true,
      isLoading: false,
    })
    useCPRStore.setState({
      draft: { attempt_date: null, overall_result: null, image_path: null, categories: {} },
      latest: null,
      isLoading: false,
      isSaving: false,
      error: null,
    })
  })

  afterEach(() => {
    useAuthStore.getState().logout()
  })

  // ── loadLatest ─────────────────────────────────────────────────────

  describe('loadLatest', () => {
    it('populates latest on success', async () => {
      mockGetLatest.mockResolvedValue(sampleReport)
      const { result } = renderHook(() => useCPR())

      await act(async () => {
        await result.current.loadLatest()
      })

      expect(useCPRStore.getState().latest).toEqual(sampleReport)
      expect(useCPRStore.getState().isLoading).toBe(false)
    })

    it('returns null and sets error on failure', async () => {
      mockGetLatest.mockRejectedValue(new Error('DB down'))
      const { result } = renderHook(() => useCPR())

      await act(async () => {
        await result.current.loadLatest()
      })

      expect(useCPRStore.getState().latest).toBeNull()
      expect(useCPRStore.getState().error).toBe('DB down')
    })

    it('no-ops when signed out', async () => {
      useAuthStore.setState({ supaStudentId: null })
      const { result } = renderHook(() => useCPR())

      await act(async () => {
        await result.current.loadLatest()
      })

      expect(mockGetLatest).not.toHaveBeenCalled()
    })

    it('skips Supabase in a dev session', async () => {
      useAuthStore.setState({
        user: { id: 'dev-user-id', email: 'dev@passlounge.local' },
        supaStudentId: 'dev-user-id',
        token: 'dev-mock-token',
        isAuthenticated: true,
        isLoading: false,
      })
      const { result } = renderHook(() => useCPR())

      await act(async () => {
        await result.current.loadLatest()
      })

      expect(mockGetLatest).not.toHaveBeenCalled()
    })
  })

  // ── saveDraft ──────────────────────────────────────────────────────

  describe('saveDraft', () => {
    it('inserts row and stores latest', async () => {
      mockInsert.mockResolvedValue(sampleReport)
      const { result } = renderHook(() => useCPR())

      await act(async () => {
        await result.current.saveDraft()
      })

      expect(mockInsert).toHaveBeenCalledWith(
        'stu-1',
        expect.objectContaining({ image_path: null }),
      )
      expect(useCPRStore.getState().latest).toEqual(sampleReport)
    })

    it('upserts a student row before inserting (ensures FK to students)', async () => {
      mockInsert.mockResolvedValue(sampleReport)
      const { result } = renderHook(() => useCPR())

      await act(async () => {
        await result.current.saveDraft()
      })

      expect(mockUpsertStudent).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'stu-1' }),
      )
    })

    it('surfaces a non-Error supabase failure message', async () => {
      mockInsert.mockRejectedValue({ message: 'violates foreign key', details: '' })
      const { result } = renderHook(() => useCPR())

      await act(async () => {
        await result.current.saveDraft()
      })

      expect(useCPRStore.getState().error).toBe('violates foreign key')
    })

    it('resets the draft after a successful save', async () => {
      mockInsert.mockResolvedValue(sampleReport)
      useCPRStore.getState().setCategoryResult('management_of_care', 'below')

      const { result } = renderHook(() => useCPR())
      await act(async () => {
        await result.current.saveDraft()
      })

      expect(useCPRStore.getState().draft.categories).toEqual({})
    })

    it('sets error and returns null on failure', async () => {
      mockInsert.mockRejectedValue(new Error('Insert failed'))
      const { result } = renderHook(() => useCPR())

      await act(async () => {
        await result.current.saveDraft()
      })

      expect(useCPRStore.getState().error).toBe('Insert failed')
      expect(useCPRStore.getState().latest).toBeNull()
    })

    it('sets error when signed out', async () => {
      useAuthStore.setState({ supaStudentId: null })
      const { result } = renderHook(() => useCPR())

      await act(async () => {
        await result.current.saveDraft()
      })

      expect(useCPRStore.getState().error).toContain('Not signed in')
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('dev-mode save writes a local row without hitting Supabase', async () => {
      useAuthStore.setState({
        user: { id: 'dev-user-id', email: 'dev@passlounge.local' },
        supaStudentId: 'dev-user-id',
        token: 'dev-mock-token',
        isAuthenticated: true,
        isLoading: false,
      })
      useCPRStore.getState().setCategoryResult('management_of_care', 'below')

      const { result } = renderHook(() => useCPR())
      await act(async () => {
        await result.current.saveDraft()
      })

      expect(mockInsert).not.toHaveBeenCalled()
      const saved = useCPRStore.getState().latest
      expect(saved?.student_id).toBe('dev-user-id')
      expect(saved?.categories.management_of_care).toBe('below')
    })
  })
})
