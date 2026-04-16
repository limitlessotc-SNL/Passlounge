/**
 * useOnboarding hook unit tests
 */

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/store/authStore'
import { useStudentStore } from '@/store/studentStore'

vi.mock('../services/student.service', () => ({
  upsertStudent: vi.fn(),
  saveOnboardingToAuth: vi.fn(),
}))

import { upsertStudent, saveOnboardingToAuth } from '../services/student.service'

import { useOnboarding } from './useOnboarding'

const mockUpsert = vi.mocked(upsertStudent)
const mockSaveAuth = vi.mocked(saveOnboardingToAuth)

describe('useOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ supaStudentId: 'student-123', isAuthenticated: true, isLoading: false })
    useStudentStore.getState().setNickname('Nurse Dev')
    useStudentStore.getState().setTesterType('first_time')
    useStudentStore.getState().setConfidence('confident')
    useStudentStore.getState().setDailyCards(35)
  })

  afterEach(() => {
    useStudentStore.getState().reset()
    useAuthStore.getState().logout()
  })

  it('completeOnboarding returns true on success', async () => {
    mockUpsert.mockResolvedValue({
      id: 'student-123',
      nickname: 'Nurse Dev',
      tester_type: 'first_time',
      confidence: 'confident',
      test_date: null,
      daily_cards: 35,
      onboarded: true,
    })
    mockSaveAuth.mockResolvedValue(undefined)

    const { result } = renderHook(() => useOnboarding())
    let success: boolean | undefined

    await act(async () => {
      success = await result.current.completeOnboarding()
    })

    expect(success).toBe(true)
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'student-123',
        nickname: 'Nurse Dev',
        onboarded: true,
      }),
    )
    expect(mockSaveAuth).toHaveBeenCalled()
    expect(useStudentStore.getState().onboarded).toBe(true)
  })

  it('completeOnboarding returns false on error', async () => {
    mockUpsert.mockRejectedValue(new Error('DB error'))

    const { result } = renderHook(() => useOnboarding())
    let success: boolean | undefined

    await act(async () => {
      success = await result.current.completeOnboarding()
    })

    expect(success).toBe(false)
    expect(result.current.error?.message).toBe('DB error')
  })

  it('completeOnboarding returns false when no student ID', async () => {
    useAuthStore.setState({ supaStudentId: null })

    const { result } = renderHook(() => useOnboarding())
    let success: boolean | undefined

    await act(async () => {
      success = await result.current.completeOnboarding()
    })

    expect(success).toBe(false)
    expect(result.current.error?.message).toContain('No student ID')
  })

  it('getProjectedDays calculates correctly', () => {
    const { result } = renderHook(() => useOnboarding())

    expect(result.current.getProjectedDays(25)).toBe(80)
    expect(result.current.getProjectedDays(35)).toBe(58)
    expect(result.current.getProjectedDays(50)).toBe(40)
  })

  it('getProjectedDate returns a formatted date string', () => {
    const { result } = renderHook(() => useOnboarding())

    const dateStr = result.current.getProjectedDate(35)

    expect(dateStr).toMatch(/^[A-Z][a-z]+ \d+, \d{4}$/)
  })

  it('getCountdownDays calculates future days', () => {
    const { result } = renderHook(() => useOnboarding())

    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)
    const dateStr = futureDate.toISOString().split('T')[0]

    const days = result.current.getCountdownDays(dateStr)

    expect(days).toBeGreaterThanOrEqual(29)
    expect(days).toBeLessThanOrEqual(31)
  })
})
