/**
 * Progress Service
 *
 * Reads and writes card_progress rows in Supabase for the SR engine.
 * Supports batch upsert after sessions and offline retry queue.
 *
 * Owner: Junior Engineer 4
 */

import { supabase } from '@/config/supabase'
import type { CardProgress, CardProgressMap } from '@/types'

/**
 * Loads all card_progress rows for a student into a map.
 */
export async function loadCardProgress(studentId: string): Promise<CardProgressMap> {
  const { data, error } = await supabase
    .from('card_progress')
    .select('card_id,times_seen,times_correct,times_wrong,ease_factor,next_review,last_seen')
    .eq('student_id', studentId)

  if (error) throw error

  const map: CardProgressMap = {}
  if (data) {
    for (const row of data) {
      map[row.card_id as string] = row as CardProgress
    }
  }
  return map
}

/**
 * Batch upserts card_progress rows after a session.
 * Uses Supabase's merge-duplicates upsert for idempotency.
 */
export async function batchUpsertProgress(rows: CardProgress[]): Promise<void> {
  if (rows.length === 0) return

  const { error } = await supabase
    .from('card_progress')
    .upsert(rows, { onConflict: 'student_id,card_id' })

  if (error) {
    // Queue to localStorage for offline retry
    try {
      const existing = JSON.parse(localStorage.getItem('pl_sr_queue') ?? '[]') as CardProgress[]
      localStorage.setItem('pl_sr_queue', JSON.stringify([...existing, ...rows]))
    } catch {
      // localStorage unavailable — silently fail
    }
    throw error
  }
}

/**
 * Retries any queued offline SR writes.
 */
export async function retrySRQueue(): Promise<void> {
  let queue: CardProgress[]
  try {
    queue = JSON.parse(localStorage.getItem('pl_sr_queue') ?? '[]') as CardProgress[]
  } catch {
    return
  }

  if (queue.length === 0) return

  const { error } = await supabase
    .from('card_progress')
    .upsert(queue, { onConflict: 'student_id,card_id' })

  if (!error) {
    localStorage.removeItem('pl_sr_queue')
  }
}
