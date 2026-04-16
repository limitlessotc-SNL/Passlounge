/**
 * Session Store
 *
 * Zustand store for ephemeral session state.
 * Reset at the start of each new session.
 * State: mode, pool, cards, currentIdx, results, answers, shuffles, etc.
 *
 * Owner: Junior Engineer 3
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import type {
  SessionActions,
  SessionMode,
  SessionPool,
  SessionState,
  ShuffleResult,
  StudyCard,
} from '@/types'

const INITIAL_STATE: SessionState = {
  mode: 'test',
  pool: 'all',
  cards: [],
  currentIdx: 0,
  results: [],
  answers: [],
  shuffles: [],
  sessionId: null,
  sessionName: '',
  isActive: false,
  qCount: 10,
  isDiagnostic: false,
  correctCount: 0,
  wrongCount: 0,
  xp: 50,
  streakCount: 0,
  cardTimes: {},
  cardTimerStart: 0,
}

export const useSessionStore = create<SessionState & SessionActions>()(
  devtools(
    (set, get) => ({
      ...INITIAL_STATE,

      setMode: (mode: SessionMode) => set({ mode }),

      setPool: (pool: SessionPool) => set({ pool }),

      setQCount: (qCount: number) => set({ qCount }),

      setSessionName: (sessionName: string) => set({ sessionName }),

      startSession: (cards: StudyCard[], isDiagnostic: boolean) =>
        set({
          cards,
          isDiagnostic,
          isActive: true,
          currentIdx: 0,
          results: new Array(cards.length).fill(undefined) as (boolean | undefined)[],
          answers: new Array(cards.length).fill(undefined) as (number | undefined)[],
          shuffles: new Array(cards.length).fill(undefined) as (ShuffleResult | undefined)[],
          correctCount: 0,
          wrongCount: 0,
          xp: 50,
          streakCount: 0,
          cardTimes: {},
          cardTimerStart: 0,
        }),

      recordAnswer: (cardIdx: number, optIdx: number, isCorrect: boolean, xpEarned: number) => {
        const state = get()
        const newResults = [...state.results]
        const newAnswers = [...state.answers]
        newResults[cardIdx] = isCorrect
        newAnswers[cardIdx] = optIdx

        set({
          results: newResults,
          answers: newAnswers,
          correctCount: state.correctCount + (isCorrect ? 1 : 0),
          wrongCount: state.wrongCount + (isCorrect ? 0 : 1),
          xp: state.xp + (isCorrect ? xpEarned : 0),
          streakCount: isCorrect ? state.streakCount + 1 : 0,
        })
      },

      setShuffle: (cardIdx: number, shuffle: ShuffleResult) => {
        const newShuffles = [...get().shuffles]
        newShuffles[cardIdx] = shuffle
        set({ shuffles: newShuffles })
      },

      setCurrentIdx: (currentIdx: number) => set({ currentIdx }),

      startCardTimer: () => set({ cardTimerStart: Date.now() }),

      stopCardTimer: () => {
        const state = get()
        if (state.cardTimerStart === 0) return
        const elapsed = Math.round((Date.now() - state.cardTimerStart) / 1000)
        const newTimes = { ...state.cardTimes, [state.currentIdx]: elapsed }
        set({ cardTimes: newTimes, cardTimerStart: 0 })
      },

      endSession: () => set({ isActive: false }),

      reset: () => set(INITIAL_STATE),
    }),
    { name: 'sessionStore' },
  ),
)
