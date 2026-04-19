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
  uploadCPRPhoto: vi.fn(),
}))

import {
  getLatestCPRReport,
  insertCPRReport,
  uploadCPRPhoto,
} from '../services/cpr.service'
import { useCPR } from './useCPR'

const mockGetLatest = vi.mocked(getLatestCPRReport)
const mockInsert = vi.mocked(insertCPRReport)
const mockUpload = vi.mocked(uploadCPRPhoto)

const sampleReport: CPRReport = {
  id: 'r-1',
  student_id: 'stu-1',
  attempt_date: '2026-03-01',
  overall_result: 'fail',
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
  })

  // ── attachPhoto / clearPhoto ───────────────────────────────────────

  describe('photo handling', () => {
    it('attachPhoto stores the pending file', () => {
      const { result } = renderHook(() => useCPR())
      const file = new File(['x'], 'cpr.jpg', { type: 'image/jpeg' })

      act(() => result.current.attachPhoto(file))

      expect(result.current.pendingFile).toBe(file)
    })

    it('clearPhoto resets both pending file and draft image_path', () => {
      const { result } = renderHook(() => useCPR())
      const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' })

      act(() => result.current.attachPhoto(file))
      act(() => result.current.clearPhoto())

      expect(result.current.pendingFile).toBeNull()
      expect(useCPRStore.getState().draft.image_path).toBeNull()
    })
  })

  // ── saveDraft ──────────────────────────────────────────────────────

  describe('saveDraft', () => {
    it('uploads photo then inserts row with image path', async () => {
      mockUpload.mockResolvedValue('stu-1/123.jpg')
      mockInsert.mockResolvedValue({ ...sampleReport, image_path: 'stu-1/123.jpg' })

      const { result } = renderHook(() => useCPR())
      const file = new File(['x'], 'cpr.jpg', { type: 'image/jpeg' })
      act(() => result.current.attachPhoto(file))

      await act(async () => {
        await result.current.saveDraft()
      })

      expect(mockUpload).toHaveBeenCalledWith('stu-1', file)
      expect(mockInsert).toHaveBeenCalledWith(
        'stu-1',
        expect.objectContaining({ image_path: 'stu-1/123.jpg' }),
      )
      expect(useCPRStore.getState().latest?.image_path).toBe('stu-1/123.jpg')
    })

    it('skips upload when no pending file', async () => {
      mockInsert.mockResolvedValue(sampleReport)
      const { result } = renderHook(() => useCPR())

      await act(async () => {
        await result.current.saveDraft()
      })

      expect(mockUpload).not.toHaveBeenCalled()
      expect(mockInsert).toHaveBeenCalled()
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
  })
})
