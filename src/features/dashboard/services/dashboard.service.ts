/**
 * Dashboard Service
 *
 * Aggregates stats from Supabase for the dashboard.
 *
 * Owner: Junior Engineer 5
 */

import { supabase } from '@/config/supabase'
import type { PLStats } from '@/types'

/**
 * Fetches aggregated session stats for a student.
 */
export async function getStudentStats(studentId: string): Promise<PLStats> {
  const { data, error } = await supabase
    .from('sessions')
    .select('correct,wrong,xp,card_count')
    .eq('student_id', studentId)
    .eq('completed', true)

  if (error) throw error

  if (!data || data.length === 0) {
    return { cards: 0, xp: 50, sessions: 0 }
  }

  let totalCards = 0
  let totalXP = 50
  const totalSessions = data.length

  for (const s of data) {
    totalCards += (s.card_count as number) || 0
    totalXP += (s.xp as number) || 0
  }

  return { cards: totalCards, xp: totalXP, sessions: totalSessions }
}
