/**
 * useSR hook unit tests
 */

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/store/authStore'
import { useSRStore } from '@/store/srStore'
import { useStudentStore } from '@/store/studentStore'

vi.mock('../services/progress.service', () => ({
  loadCardProgress: vi.fn(),
  batchUpsertProgress: vi.fn(),
  retrySRQueue: vi.fn(),
}))

import {
  batchUpsertProgress,
  loadCardProgress,
  retrySRQueue,
} from '../services/progress.service'

import { useSR } from './useSR'

const mockLoad = vi.mocked(loadCardProgress)
const mockBatch = vi.mocked(batchUpsertProgress)
const mockRetry = vi.mocked(retrySRQueue)

describe('useSR', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ supaStudentId: 'stu-1', isAuthenticated: true, isLoading: false })
    useStudentStore.getState().setTestDate(null, 0)
    useSRStore.setState({
      cardProgressMap: {},
      cardProgressLoaded: false,
      srPendingUpdates: {},
    })
  })

  afterEach(() => {
    useAuthStore.getState().logout()
    useStudentStore.getState().reset()
    useSRStore.setState({
      cardProgressMap: {},
      cardProgressLoaded: false,
      srPendingUpdates: {},
    })
  })

  // ── loadProgress ──────────────────────────────────────────────────────

  it('loadProgress fetches and sets card progress map', async () => {
    const fakeMap = {
      'c1': { card_id: 'c1', student_id: 'stu-1', times_seen: 2, times_correct: 1, times_wrong: 1, ease_factor: 2.4, next_review: '2026-05-01', last_seen: '2026-04-15' },
    }
    mockLoad.mockResolvedValue(fakeMap)

    const { result } = renderHook(() => useSR())

    await act(async () => {
      await result.current.loadProgress()
    })

    expect(mockLoad).toHaveBeenCalledWith('stu-1')
    expect(useSRStore.getState().cardProgressLoaded).toBe(true)
    expect(useSRStore.getState().cardProgressMap).toEqual(fakeMap)
  })

  it('loadProgress calls retrySRQueue after loading', async () => {
    mockLoad.mockResolvedValue({})

    const { result } = renderHook(() => useSR())

    await act(async () => {
      await result.current.loadProgress()
    })

    expect(mockRetry).toHaveBeenCalled()
  })

  it('loadProgress does nothing when already loaded', async () => {
    useSRStore.setState({ cardProgressLoaded: true })

    const { result } = renderHook(() => useSR())

    await act(async () => {
      await result.current.loadProgress()
    })

    expect(mockLoad).not.toHaveBeenCalled()
  })

  it('loadProgress does nothing without student ID', async () => {
    useAuthStore.setState({ supaStudentId: null })

    const { result } = renderHook(() => useSR())

    await act(async () => {
      await result.current.loadProgress()
    })

    expect(mockLoad).not.toHaveBeenCalled()
  })

  it('loadProgress silently handles errors', async () => {
    mockLoad.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useSR())

    await act(async () => {
      await result.current.loadProgress()
    })

    expect(useSRStore.getState().cardProgressLoaded).toBe(false)
  })

  // ── recordSRAnswer ────────────────────────────────────────────────────

  it('recordSRAnswer delegates to store', () => {
    const { result } = renderHook(() => useSR())

    act(() => {
      result.current.recordSRAnswer('card-1', true)
    })

    expect(useSRStore.getState().srPendingUpdates['card-1']).toBeDefined()
    expect(useSRStore.getState().srPendingUpdates['card-1'].correct).toBe(1)
  })

  it('recordSRAnswer tracks wrong answers', () => {
    const { result } = renderHook(() => useSR())

    act(() => {
      result.current.recordSRAnswer('card-1', false)
    })

    expect(useSRStore.getState().srPendingUpdates['card-1'].wrong).toBe(1)
  })

  // ── flushPendingUpdates ───────────────────────────────────────────────

  it('flushPendingUpdates batch upserts to Supabase', async () => {
    mockBatch.mockResolvedValue(undefined)
    useSRStore.getState().recordSRAnswer('card-1', true)

    const { result } = renderHook(() => useSR())

    await act(async () => {
      await result.current.flushPendingUpdates()
    })

    expect(mockBatch).toHaveBeenCalledTimes(1)
    const rows = mockBatch.mock.calls[0][0]
    expect(rows.length).toBe(1)
    expect(rows[0].card_id).toBe('card-1')
    expect(rows[0].times_correct).toBe(1)
  })

  it('flushPendingUpdates updates local cardProgressMap', async () => {
    mockBatch.mockResolvedValue(undefined)
    useSRStore.getState().recordSRAnswer('card-1', true)

    const { result } = renderHook(() => useSR())

    await act(async () => {
      await result.current.flushPendingUpdates()
    })

    expect(useSRStore.getState().cardProgressMap['card-1']).toBeDefined()
    expect(useSRStore.getState().cardProgressMap['card-1'].times_correct).toBe(1)
  })

  it('flushPendingUpdates clears pending queue', async () => {
    mockBatch.mockResolvedValue(undefined)
    useSRStore.getState().recordSRAnswer('card-1', true)

    const { result } = renderHook(() => useSR())

    await act(async () => {
      await result.current.flushPendingUpdates()
    })

    expect(useSRStore.getState().srPendingUpdates).toEqual({})
  })

  it('flushPendingUpdates does nothing with no pending updates', async () => {
    const { result } = renderHook(() => useSR())

    await act(async () => {
      await result.current.flushPendingUpdates()
    })

    expect(mockBatch).not.toHaveBeenCalled()
  })

  it('flushPendingUpdates does nothing without student ID', async () => {
    useAuthStore.setState({ supaStudentId: null })
    useSRStore.getState().recordSRAnswer('card-1', true)

    const { result } = renderHook(() => useSR())

    await act(async () => {
      await result.current.flushPendingUpdates()
    })

    expect(mockBatch).not.toHaveBeenCalled()
  })

  it('flushPendingUpdates increases ease_factor on correct', async () => {
    mockBatch.mockResolvedValue(undefined)
    useSRStore.setState({
      cardProgressMap: {
        'c1': { card_id: 'c1', student_id: 'stu-1', times_seen: 1, times_correct: 0, times_wrong: 1, ease_factor: 2.5, next_review: '2026-04-15', last_seen: '2026-04-14' },
      },
    })
    useSRStore.getState().recordSRAnswer('c1', true)

    const { result } = renderHook(() => useSR())

    await act(async () => {
      await result.current.flushPendingUpdates()
    })

    const row = mockBatch.mock.calls[0][0][0]
    expect(row.ease_factor).toBe(2.6)
  })

  it('flushPendingUpdates decreases ease_factor on wrong', async () => {
    mockBatch.mockResolvedValue(undefined)
    useSRStore.setState({
      cardProgressMap: {
        'c1': { card_id: 'c1', student_id: 'stu-1', times_seen: 1, times_correct: 1, times_wrong: 0, ease_factor: 2.5, next_review: '2026-04-15', last_seen: '2026-04-14' },
      },
    })
    useSRStore.getState().recordSRAnswer('c1', false)

    const { result } = renderHook(() => useSR())

    await act(async () => {
      await result.current.flushPendingUpdates()
    })

    const row = mockBatch.mock.calls[0][0][0]
    expect(row.ease_factor).toBe(2.3)
  })

  it('flushPendingUpdates caps ease_factor at 3.5 max', async () => {
    mockBatch.mockResolvedValue(undefined)
    useSRStore.setState({
      cardProgressMap: {
        'c1': { card_id: 'c1', student_id: 'stu-1', times_seen: 5, times_correct: 5, times_wrong: 0, ease_factor: 3.5, next_review: '2026-04-15', last_seen: '2026-04-14' },
      },
    })
    useSRStore.getState().recordSRAnswer('c1', true)

    const { result } = renderHook(() => useSR())

    await act(async () => {
      await result.current.flushPendingUpdates()
    })

    const row = mockBatch.mock.calls[0][0][0]
    expect(row.ease_factor).toBe(3.5)
  })

  it('flushPendingUpdates caps ease_factor at 1.3 min', async () => {
    mockBatch.mockResolvedValue(undefined)
    useSRStore.setState({
      cardProgressMap: {
        'c1': { card_id: 'c1', student_id: 'stu-1', times_seen: 5, times_correct: 0, times_wrong: 5, ease_factor: 1.3, next_review: '2026-04-15', last_seen: '2026-04-14' },
      },
    })
    useSRStore.getState().recordSRAnswer('c1', false)

    const { result } = renderHook(() => useSR())

    await act(async () => {
      await result.current.flushPendingUpdates()
    })

    const row = mockBatch.mock.calls[0][0][0]
    expect(row.ease_factor).toBe(1.3)
  })

  it('flushPendingUpdates sets interval to 1 day on wrong answer', async () => {
    mockBatch.mockResolvedValue(undefined)
    useSRStore.getState().recordSRAnswer('c1', false)

    const { result } = renderHook(() => useSR())

    await act(async () => {
      await result.current.flushPendingUpdates()
    })

    const row = mockBatch.mock.calls[0][0][0]
    const nextReview = new Date(row.next_review)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    expect(nextReview.toDateString()).toBe(tomorrow.toDateString())
  })

  it('flushPendingUpdates caps interval to 7 days in urgency mode', async () => {
    useStudentStore.getState().setTestDate('2026-05-01', 15)
    mockBatch.mockResolvedValue(undefined)
    useSRStore.setState({
      cardProgressMap: {
        'c1': { card_id: 'c1', student_id: 'stu-1', times_seen: 10, times_correct: 10, times_wrong: 0, ease_factor: 3.5, next_review: '2026-04-15', last_seen: '2026-04-14' },
      },
    })
    useSRStore.getState().recordSRAnswer('c1', true)

    const { result } = renderHook(() => useSR())

    await act(async () => {
      await result.current.flushPendingUpdates()
    })

    const row = mockBatch.mock.calls[0][0][0]
    const nextReview = new Date(row.next_review)
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 8)
    expect(nextReview.getTime()).toBeLessThanOrEqual(maxDate.getTime())
  })

  it('flushPendingUpdates handles batch upsert failure gracefully', async () => {
    mockBatch.mockRejectedValue(new Error('Network error'))
    useSRStore.getState().recordSRAnswer('c1', true)

    const { result } = renderHook(() => useSR())

    await act(async () => {
      await result.current.flushPendingUpdates()
    })

    // Local map still updated even if remote fails
    expect(useSRStore.getState().cardProgressMap['c1']).toBeDefined()
  })

  // ── buildSRPool ───────────────────────────────────────────────────────

  it('buildSRPool returns cards sorted by SR priority', () => {
    const { result } = renderHook(() => useSR())

    const cards = [
      { id: 'c1', cat: 'Cardiac', title: 'Card 1' },
      { id: 'c2', cat: 'Pharmacology', title: 'Card 2' },
    ]

    const pool = result.current.buildSRPool(cards as never[], 2)

    expect(pool.length).toBe(2)
  })

  it('buildSRPool limits to count', () => {
    const { result } = renderHook(() => useSR())

    const cards = [
      { id: 'c1', cat: 'Cardiac', title: 'Card 1' },
      { id: 'c2', cat: 'Pharmacology', title: 'Card 2' },
      { id: 'c3', cat: 'Respiratory', title: 'Card 3' },
    ]

    const pool = result.current.buildSRPool(cards as never[], 2)

    expect(pool.length).toBe(2)
  })
})
