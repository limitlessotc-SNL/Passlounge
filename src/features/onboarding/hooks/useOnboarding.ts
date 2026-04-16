/**
 * useOnboarding Hook
 *
 * Manages onboarding step navigation and final profile save.
 * Bridges studentStore with student.service for Supabase persistence.
 *
 * Owner: Junior Engineer 2
 */

import { useCallback, useState } from 'react'

import { useAuthStore } from '@/store/authStore'
import { useStudentStore } from '@/store/studentStore'
import type { AuthError } from '@/types'

import {
  saveOnboardingToAuth,
  upsertStudent,
} from '../services/student.service'

export function useOnboarding() {
  const supaStudentId = useAuthStore((s) => s.supaStudentId)
  const {
    nickname,
    testerType,
    confidence,
    testDate,
    testDays,
    dailyCards,
    setOnboarded,
  } = useStudentStore()

  const [error, setError] = useState<AuthError | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const completeOnboarding = useCallback(async (): Promise<boolean> => {
    if (!supaStudentId) {
      setError({ message: 'No student ID found. Please log in again.' })
      return false
    }

    setError(null)
    setIsSaving(true)

    try {
      await upsertStudent({
        id: supaStudentId,
        nickname: nickname || 'Nurse',
        tester_type: testerType ?? 'first_time',
        confidence: confidence ?? 'unsure',
        test_date: testDate,
        daily_cards: dailyCards,
        onboarded: true,
      })

      await saveOnboardingToAuth({
        nickname: nickname || 'Nurse',
        onboarded: true,
        tester_type: testerType ?? 'first_time',
        confidence: confidence ?? 'unsure',
        daily_cards: dailyCards,
      })

      setOnboarded(true)
      return true
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to save profile'
      setError({ message })
      return false
    } finally {
      setIsSaving(false)
    }
  }, [supaStudentId, nickname, testerType, confidence, testDate, dailyCards, setOnboarded])

  const getProjectedDays = useCallback(
    (cardsPerDay: number): number => {
      const totalCards = 2000
      return Math.ceil(totalCards / cardsPerDay)
    },
    [],
  )

  const getProjectedDate = useCallback(
    (cardsPerDay: number): string => {
      const daysNeeded = Math.ceil(2000 / cardsPerDay)
      const projDate = new Date()
      projDate.setDate(projDate.getDate() + daysNeeded)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${months[projDate.getMonth()]} ${projDate.getDate()}, ${projDate.getFullYear()}`
    },
    [],
  )

  const getCountdownDays = useCallback(
    (dateStr: string): number => {
      const today = new Date()
      const test = new Date(dateStr + 'T00:00:00')
      return Math.ceil((test.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    },
    [],
  )

  return {
    completeOnboarding,
    getProjectedDays,
    getProjectedDate,
    getCountdownDays,
    error,
    isSaving,
    testDays,
    nickname,
  }
}
