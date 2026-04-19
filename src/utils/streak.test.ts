/**
 * streak utility unit tests
 */

import { describe, expect, it } from 'vitest'

import type { SessionSnapshot } from '@/types'

import { addDays, calculateStreak, toLocalDateString } from './streak'

// ─── toLocalDateString ────────────────────────────────────────────────

describe('toLocalDateString', () => {
  it('formats a date as YYYY-MM-DD', () => {
    const d = new Date(2026, 3, 19) // Apr 19, 2026 local
    expect(toLocalDateString(d)).toBe('2026-04-19')
  })

  it('zero-pads single-digit months', () => {
    const d = new Date(2026, 0, 5) // Jan 5
    expect(toLocalDateString(d)).toBe('2026-01-05')
  })

  it('zero-pads single-digit days', () => {
    const d = new Date(2026, 5, 7) // Jun 7
    expect(toLocalDateString(d)).toBe('2026-06-07')
  })

  it('produces lexically sortable output', () => {
    const a = toLocalDateString(new Date(2026, 0, 15))
    const b = toLocalDateString(new Date(2026, 2, 1))
    const c = toLocalDateString(new Date(2025, 11, 31))
    expect([c, a, b].sort()).toEqual([c, a, b])
  })
})

// ─── addDays ──────────────────────────────────────────────────────────

describe('addDays', () => {
  it('adds a positive number of days', () => {
    const d = new Date(2026, 3, 19)
    const result = addDays(d, 3)
    expect(toLocalDateString(result)).toBe('2026-04-22')
  })

  it('subtracts days with a negative offset', () => {
    const d = new Date(2026, 3, 19)
    const result = addDays(d, -5)
    expect(toLocalDateString(result)).toBe('2026-04-14')
  })

  it('does not mutate the input date', () => {
    const d = new Date(2026, 3, 19)
    const before = d.getTime()
    addDays(d, 10)
    expect(d.getTime()).toBe(before)
  })

  it('handles month rollover forward', () => {
    const d = new Date(2026, 3, 30) // Apr 30
    const result = addDays(d, 2)
    expect(toLocalDateString(result)).toBe('2026-05-02')
  })

  it('handles year rollover backward', () => {
    const d = new Date(2026, 0, 2) // Jan 2
    const result = addDays(d, -3)
    expect(toLocalDateString(result)).toBe('2025-12-30')
  })
})

// ─── calculateStreak ──────────────────────────────────────────────────

function makeSession(isoDate: string): SessionSnapshot {
  return {
    id: 1,
    name: 'S',
    mode: 'test',
    date: '',
    categories: '',
    correct: 0,
    wrong: 0,
    total: 0,
    pct: 0,
    cards: [],
    results: [],
    answers: [],
    shuffles: [],
    createdAt: isoDate,
  }
}

describe('calculateStreak', () => {
  const today = new Date(2026, 3, 19) // Apr 19, 2026
  const toISO = (d: Date) => d.toISOString()

  it('returns 0 for empty sessions', () => {
    expect(calculateStreak([], today)).toBe(0)
  })

  it('returns 0 when no sessions have createdAt', () => {
    const sessions = [makeSession('')]
    sessions[0].createdAt = undefined
    expect(calculateStreak(sessions, today)).toBe(0)
  })

  it('returns 1 for a single session today', () => {
    const sessions = [makeSession(toISO(today))]
    expect(calculateStreak(sessions, today)).toBe(1)
  })

  it('returns 1 for a single session yesterday (grace period)', () => {
    const yesterday = addDays(today, -1)
    const sessions = [makeSession(toISO(yesterday))]
    expect(calculateStreak(sessions, today)).toBe(1)
  })

  it('returns 0 when most recent session is 2 days ago (streak broken)', () => {
    const twoDaysAgo = addDays(today, -2)
    const sessions = [makeSession(toISO(twoDaysAgo))]
    expect(calculateStreak(sessions, today)).toBe(0)
  })

  it('returns 3 for today + yesterday + day before', () => {
    const sessions = [
      makeSession(toISO(today)),
      makeSession(toISO(addDays(today, -1))),
      makeSession(toISO(addDays(today, -2))),
    ]
    expect(calculateStreak(sessions, today)).toBe(3)
  })

  it('dedupes multiple sessions on the same day', () => {
    const sessions = [
      makeSession(toISO(today)),
      makeSession(toISO(today)),
      makeSession(toISO(addDays(today, -1))),
    ]
    expect(calculateStreak(sessions, today)).toBe(2)
  })

  it('stops counting at the first gap', () => {
    const sessions = [
      makeSession(toISO(today)),
      makeSession(toISO(addDays(today, -1))),
      // gap (no session 2 days ago)
      makeSession(toISO(addDays(today, -3))),
      makeSession(toISO(addDays(today, -4))),
    ]
    expect(calculateStreak(sessions, today)).toBe(2)
  })

  it('counts back from yesterday when no session today', () => {
    const sessions = [
      makeSession(toISO(addDays(today, -1))),
      makeSession(toISO(addDays(today, -2))),
      makeSession(toISO(addDays(today, -3))),
    ]
    expect(calculateStreak(sessions, today)).toBe(3)
  })

  it('ignores sessions without createdAt field', () => {
    const withDate = makeSession(toISO(today))
    const withoutDate = makeSession('')
    withoutDate.createdAt = undefined
    expect(calculateStreak([withDate, withoutDate], today)).toBe(1)
  })

  it('handles 7-day streak', () => {
    const sessions: SessionSnapshot[] = []
    for (let i = 0; i < 7; i++) {
      sessions.push(makeSession(toISO(addDays(today, -i))))
    }
    expect(calculateStreak(sessions, today)).toBe(7)
  })

  it('handles very long streaks (30 days)', () => {
    const sessions: SessionSnapshot[] = []
    for (let i = 0; i < 30; i++) {
      sessions.push(makeSession(toISO(addDays(today, -i))))
    }
    expect(calculateStreak(sessions, today)).toBe(30)
  })

  it('order of sessions in array does not matter', () => {
    const sessions = [
      makeSession(toISO(addDays(today, -2))),
      makeSession(toISO(today)),
      makeSession(toISO(addDays(today, -1))),
    ]
    expect(calculateStreak(sessions, today)).toBe(3)
  })

  it('session last week with no activity since = 0 streak', () => {
    const sessions = [makeSession(toISO(addDays(today, -7)))]
    expect(calculateStreak(sessions, today)).toBe(0)
  })

  it('handles month boundary (end of March → start of April)', () => {
    const april1 = new Date(2026, 3, 1)
    const sessions = [
      makeSession(toISO(april1)),
      makeSession(toISO(addDays(april1, -1))), // Mar 31
      makeSession(toISO(addDays(april1, -2))), // Mar 30
    ]
    expect(calculateStreak(sessions, april1)).toBe(3)
  })
})
