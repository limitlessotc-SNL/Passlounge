/**
 * useSR Hook
 *
 * Bridges the SR store with the progress service and sr.utils.
 * Loads card progress on init, records answers during sessions,
 * and flushes pending updates to Supabase after sessions.
 *
 * Owner: Junior Engineer 4
 */

import { useCallback } from 'react'

import { useAuthStore } from '@/store/authStore'
import { useSRStore } from '@/store/srStore'
import { useStudentStore } from '@/store/studentStore'
import type { CardProgress, StudyCard } from '@/types'
import { buildSRPool as buildSRPoolUtil } from '@/utils/sr.utils'

import {
  batchUpsertProgress,
  loadCardProgress as loadCardProgressService,
  retrySRQueue,
} from '../services/progress.service'

export function useSR() {
  const supaStudentId = useAuthStore((s) => s.supaStudentId)
  const testDays = useStudentStore((s) => s.testDays)
  const {
    cardProgressMap,
    cardProgressLoaded,
    srPendingUpdates,
    setCardProgressMap,
    setCardProgressLoaded,
    recordSRAnswer,
    clearPendingUpdates,
  } = useSRStore()

  /**
   * Load card progress from Supabase into the store.
   */
  const loadProgress = useCallback(async () => {
    if (!supaStudentId || cardProgressLoaded) return
    try {
      const map = await loadCardProgressService(supaStudentId)
      setCardProgressMap(map)
      setCardProgressLoaded(true)
      void retrySRQueue()
    } catch {
      // Silently fail — SR will work without persisted progress
    }
  }, [supaStudentId, cardProgressLoaded, setCardProgressMap, setCardProgressLoaded])

  /**
   * Build an SR-weighted pool of cards for a session.
   * Wraps the pure buildSRPool from sr.utils.
   */
  const buildSRPool = useCallback(
    (allCards: StudyCard[], count: number): StudyCard[] => {
      // sr.utils.buildSRPool expects Card type with `id` and `cat` fields
      // StudyCard has these, so we cast through unknown
      return buildSRPoolUtil(
        allCards as unknown as import('@/types').Card[],
        cardProgressMap,
        count,
      ) as unknown as StudyCard[]
    },
    [cardProgressMap],
  )

  /**
   * Flush all pending SR updates to Supabase after a session.
   * Calculates new ease_factor, interval, and next_review for each card.
   */
  const flushPendingUpdates = useCallback(async () => {
    if (!supaStudentId) return

    const ids = Object.keys(srPendingUpdates)
    if (ids.length === 0) return

    const now = new Date().toISOString()
    const urgentMode = testDays > 0 && testDays <= 30

    const upserts: CardProgress[] = ids.map((cardId) => {
      const update = srPendingUpdates[cardId]
      const existing = cardProgressMap[cardId] ?? {
        card_id: cardId,
        student_id: supaStudentId,
        times_seen: 0,
        times_correct: 0,
        times_wrong: 0,
        ease_factor: 2.5,
        next_review: now,
        last_seen: now,
      }

      const newSeen = (existing.times_seen ?? 0) + update.seen
      const newCorrect = (existing.times_correct ?? 0) + update.correct
      const newWrong = (existing.times_wrong ?? 0) + update.wrong

      let ef = parseFloat(String(existing.ease_factor)) || 2.5
      if (update.correct > 0) ef = Math.min(3.5, ef + 0.1)
      if (update.wrong > 0) ef = Math.max(1.3, ef - 0.2)

      let intervalDays = 1
      if (update.wrong > 0) {
        intervalDays = 1
      } else if (newCorrect > 0) {
        intervalDays = Math.round(ef * 2.0 * (newCorrect > 1 ? newCorrect - 1 : 1))
        intervalDays = Math.min(intervalDays, urgentMode ? 7 : 60)
        intervalDays = Math.max(intervalDays, 1)
      }

      const nextReview = new Date()
      nextReview.setDate(nextReview.getDate() + intervalDays)

      return {
        student_id: supaStudentId,
        card_id: cardId,
        times_seen: newSeen,
        times_correct: newCorrect,
        times_wrong: newWrong,
        ease_factor: ef,
        next_review: nextReview.toISOString(),
        last_seen: now,
      }
    })

    // Update local map immediately
    const newMap = { ...cardProgressMap }
    for (const row of upserts) {
      newMap[row.card_id] = row
    }
    setCardProgressMap(newMap)
    clearPendingUpdates()

    // Persist to Supabase
    try {
      await batchUpsertProgress(upserts)
    } catch {
      // Already queued to localStorage by the service
    }
  }, [supaStudentId, srPendingUpdates, cardProgressMap, testDays, setCardProgressMap, clearPendingUpdates])

  return {
    loadProgress,
    buildSRPool,
    recordSRAnswer,
    flushPendingUpdates,
    cardProgressLoaded,
    cardProgressMap,
  }
}
