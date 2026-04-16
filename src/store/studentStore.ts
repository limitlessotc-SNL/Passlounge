/**
 * Student Store
 *
 * Zustand store for student profile / onboarding state.
 * State: nickname, testerType, confidence, testDays, dailyCards, onboarded
 *
 * Owner: Junior Engineer 2
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import type {
  ConfidenceLevel,
  Student,
  StudentActions,
  StudentState,
  TesterType,
} from '@/types'

export const useStudentStore = create<StudentState & StudentActions>()(
  devtools(
    (set) => ({
      nickname: '',
      testerType: null,
      confidence: null,
      testDays: 0,
      testDate: null,
      dailyCards: 35,
      onboarded: false,

      setNickname: (nickname: string) => set({ nickname }),

      setTesterType: (testerType: TesterType) => set({ testerType }),

      setConfidence: (confidence: ConfidenceLevel) => set({ confidence }),

      setTestDate: (testDate: string | null, testDays: number) =>
        set({ testDate, testDays }),

      setDailyCards: (dailyCards: number) => set({ dailyCards }),

      setOnboarded: (onboarded: boolean) => set({ onboarded }),

      loadFromStudent: (student: Student) =>
        set({
          nickname: student.nickname,
          testerType: student.tester_type,
          confidence: student.confidence,
          testDate: student.test_date,
          dailyCards: student.daily_cards,
          onboarded: student.onboarded,
        }),

      reset: () =>
        set({
          nickname: '',
          testerType: null,
          confidence: null,
          testDays: 0,
          testDate: null,
          dailyCards: 35,
          onboarded: false,
        }),
    }),
    { name: 'studentStore' },
  ),
)
