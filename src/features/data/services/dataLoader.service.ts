/**
 * Data Loader Service
 *
 * Loads a student's full dataset from Supabase into the Zustand stores:
 * - Session history → dashboardStore.sessionHistory + derived plStats
 * - Diagnostic results → dashboardStore.diagnosticResult
 * - Card progress → srStore.cardProgressMap + seenCardTitles
 *
 * Called from AuthProvider after a session is restored on page load.
 *
 * Failures are swallowed per-store — missing data just means empty state,
 * not a broken UX.
 *
 * Owner: Senior Engineer
 */

import { loadDiagnosticResults } from '@/features/diagnostic/services/diagnostic.service'
import { getSessionHistory } from '@/features/session/services/sessions.service'
import { loadCardProgress } from '@/features/sr/services/progress.service'
import { useDashboardStore } from '@/store/dashboardStore'
import { useSRStore } from '@/store/srStore'
import type { PLStats, SessionSnapshot } from '@/types'
import { calculateStreak } from '@/utils/streak'

/**
 * Computes player stats from a list of session snapshots.
 */
export function computePLStats(sessions: SessionSnapshot[]): PLStats {
  let cards = 0
  let xp = 50
  for (const s of sessions) {
    cards += s.total
    xp += s.correct * 20
  }
  return { cards, xp, sessions: sessions.length }
}

/**
 * Builds a seen-titles map from historic session snapshots.
 */
export function buildSeenTitlesMap(sessions: SessionSnapshot[]): Record<string, boolean> {
  const seen: Record<string, boolean> = {}
  for (const s of sessions) {
    for (const card of s.cards) {
      if (card.title) seen[card.title] = true
    }
  }
  return seen
}

/**
 * Fetches all user data from Supabase and populates the stores.
 * Safe to call multiple times — each store is replaced fully.
 */
export async function loadUserData(studentId: string): Promise<void> {
  const [sessionsResult, diagnosticResult, progressResult] = await Promise.allSettled([
    getSessionHistory(studentId),
    loadDiagnosticResults(studentId),
    loadCardProgress(studentId),
  ])

  // ─ Sessions ─────────────────────────────────────────────────
  if (sessionsResult.status === 'fulfilled') {
    const sessions = sessionsResult.value
    const stats = computePLStats(sessions)
    const seenTitles = buildSeenTitlesMap(sessions)
    const streakDays = calculateStreak(sessions)

    useDashboardStore.setState({
      sessionHistory: sessions,
      plStats: stats,
      seenCardTitles: seenTitles,
      streakDays,
    })
  }

  // ─ Diagnostic ───────────────────────────────────────────────
  if (diagnosticResult.status === 'fulfilled' && diagnosticResult.value !== null) {
    useDashboardStore.setState({ diagnosticResult: diagnosticResult.value })
  }

  // ─ SR Card Progress ─────────────────────────────────────────
  if (progressResult.status === 'fulfilled') {
    useSRStore.setState({
      cardProgressMap: progressResult.value,
      cardProgressLoaded: true,
    })
  }
}
