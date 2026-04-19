/**
 * Streak Utility
 *
 * Pure functions for calculating a study streak from a list of session
 * timestamps. A streak = consecutive days of activity leading up to the
 * most recent session. Grace period: if the most recent session was
 * yesterday (not today), the streak is still considered active.
 *
 * Owner: Junior Engineer 5
 */

import type { SessionSnapshot } from '@/types'

/**
 * Converts a Date to a `YYYY-MM-DD` string in the local timezone.
 * Sortable lexicographically; safe for date-only comparisons.
 */
export function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Returns a new Date offset by `days` (positive or negative) from `d`.
 */
export function addDays(d: Date, days: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + days)
  return copy
}

/**
 * Returns the number of consecutive study days up to and including the
 * most recent session. Grace period allows streak to survive until the
 * end of the next day.
 *
 * @param sessions - Array of completed session snapshots
 * @param now - Optional reference "today" (defaults to current Date).
 *              Exposed for deterministic testing.
 */
export function calculateStreak(
  sessions: SessionSnapshot[],
  now: Date = new Date(),
): number {
  if (sessions.length === 0) return 0

  // Collect unique study dates (YYYY-MM-DD) from sessions with createdAt
  const dateSet = new Set<string>()
  for (const s of sessions) {
    if (s.createdAt) {
      dateSet.add(toLocalDateString(new Date(s.createdAt)))
    }
  }

  if (dateSet.size === 0) return 0

  // Sort descending (newest first) — YYYY-MM-DD strings sort correctly
  const sortedDates = [...dateSet].sort().reverse()

  const todayStr = toLocalDateString(now)
  const yesterdayStr = toLocalDateString(addDays(now, -1))

  // Must have activity today or yesterday for streak to be active
  if (sortedDates[0] !== todayStr && sortedDates[0] !== yesterdayStr) {
    return 0
  }

  let streak = 1
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1])
    const curr = new Date(sortedDates[i])
    const diffDays = Math.round(
      (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24),
    )

    if (diffDays === 1) {
      streak++
    } else {
      break
    }
  }

  return streak
}
