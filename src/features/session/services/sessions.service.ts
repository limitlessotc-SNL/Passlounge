/**
 * Sessions Service
 *
 * Creates and updates session records in Supabase.
 *
 * Owner: Junior Engineer 3
 */

import { supabase } from '@/config/supabase'
import type { SessionMode } from '@/types'

export interface CreateSessionParams {
  studentId: string;
  name: string;
  mode: SessionMode;
  cardCount: number;
}

export interface UpdateSessionParams {
  correct: number;
  wrong: number;
  xp: number;
  completed: boolean;
}

/**
 * Creates a new session record in Supabase. Returns the session ID.
 */
export async function createSession(params: CreateSessionParams): Promise<string | null> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      student_id: params.studentId,
      name: params.name,
      mode: params.mode,
      card_count: params.cardCount,
      correct: 0,
      wrong: 0,
      xp: 50,
      completed: false,
    })
    .select('id')
    .single()

  if (error) throw error
  return data?.id ?? null
}

/**
 * Updates a session record with final results.
 */
export async function updateSession(sessionId: string, params: UpdateSessionParams): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({
      correct: params.correct,
      wrong: params.wrong,
      xp: params.xp,
      completed: params.completed,
    })
    .eq('id', sessionId)

  if (error) throw error
}

/**
 * Fetches session history for a student.
 */
export async function getSessionHistory(studentId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('student_id', studentId)
    .eq('completed', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}
