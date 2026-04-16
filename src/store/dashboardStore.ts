/**
 * Dashboard Store
 *
 * Zustand store for aggregated read-only stats.
 * Holds diagnostic results, session history, and player stats.
 *
 * Owner: Junior Engineer 5
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import type {
  DashboardActions,
  DashboardState,
  DiagnosticResult,
  PLStats,
  SessionSnapshot,
} from '@/types'

const INITIAL_STATE: DashboardState = {
  diagnosticResult: {
    completed: false,
    correct: 0,
    total: 0,
    catLevel: '—',
    results: [],
  },
  sessionHistory: [],
  plStats: { cards: 0, xp: 50, sessions: 0 },
  streakDays: 1,
  seenCardTitles: {},
}

export const useDashboardStore = create<DashboardState & DashboardActions>()(
  devtools(
    (set, get) => ({
      ...INITIAL_STATE,

      setDiagnosticResult: (diagnosticResult: DiagnosticResult) =>
        set({ diagnosticResult }),

      addSession: (snapshot: SessionSnapshot) => {
        const history = [...get().sessionHistory, snapshot]
        const stats = get().plStats
        set({
          sessionHistory: history,
          plStats: {
            cards: stats.cards + snapshot.total,
            xp: stats.xp + (snapshot.correct * 20),
            sessions: stats.sessions + 1,
          },
        })
      },

      setStats: (plStats: PLStats) => set({ plStats }),

      setStreak: (streakDays: number) => set({ streakDays }),

      markCardSeen: (title: string) => {
        const seen = { ...get().seenCardTitles, [title]: true }
        set({ seenCardTitles: seen })
      },
    }),
    { name: 'dashboardStore' },
  ),
)
