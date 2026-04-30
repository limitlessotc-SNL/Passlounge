/**
 * Sessions Service
 *
 * Creates, updates, and fetches session records in Supabase.
 *
 * Owner: Junior Engineer 3
 */

import { supabase } from '@/config/supabase'
import { trackEvent } from '@/services/analytics'
import type { SessionMode, SessionSnapshot, ShuffleResult, StudyCard } from '@/types'

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
 * Creates a pending session row (completed=false).
 * Used when session starts so we can track in-flight sessions.
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
  trackEvent('study_session_started', {
    mode: params.mode,
    card_count: params.cardCount,
  })
  return data?.id ?? null
}

/**
 * Updates an existing session row with final stats.
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
 * Saves a fully-completed session in a single insert.
 * Stores the full SessionSnapshot (including cards/results/answers/shuffles)
 * so the session can be reviewed on any device.
 */
export async function saveCompletedSession(
  studentId: string,
  snapshot: SessionSnapshot,
): Promise<void> {
  const xp = 50 + snapshot.correct * 20

  const { error } = await supabase
    .from('sessions')
    .insert({
      student_id: studentId,
      name: snapshot.name,
      mode: snapshot.mode,
      card_count: snapshot.total,
      correct: snapshot.correct,
      wrong: snapshot.wrong,
      xp,
      completed: true,
      date: snapshot.date,
      categories: snapshot.categories,
      snapshot: {
        cards: snapshot.cards,
        results: snapshot.results,
        answers: snapshot.answers,
        shuffles: snapshot.shuffles,
        pct: snapshot.pct,
      },
    })

  if (error) throw error
  trackEvent('study_session_completed', {
    mode: snapshot.mode,
    correct_count: snapshot.correct,
    total_count: snapshot.total,
    pct: snapshot.pct,
  })
}

interface RawSessionRow {
  id: string;
  name: string;
  mode: SessionMode;
  card_count: number;
  correct: number;
  wrong: number;
  date?: string;
  categories?: string;
  created_at: string;
  snapshot?: {
    cards: StudyCard[];
    results: (boolean | undefined)[];
    answers: (number | undefined)[];
    shuffles: (ShuffleResult | undefined)[];
    pct: number;
  };
}

/**
 * Fetches session history for a student and maps to SessionSnapshot[].
 * Sessions without snapshot JSONB return with empty arrays for cards/results
 * (Review Session won't work on old records, but stats will display).
 */
export async function getSessionHistory(studentId: string): Promise<SessionSnapshot[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('student_id', studentId)
    .eq('completed', true)
    .order('created_at', { ascending: true })

  if (error) throw error
  if (!data) return []

  return (data as RawSessionRow[]).map((row, idx) => {
    const total = row.card_count
    const snap = row.snapshot
    return {
      id: idx + 1,
      name: row.name,
      mode: row.mode,
      date: row.date ?? formatDate(row.created_at),
      categories: row.categories ?? '',
      createdAt: row.created_at,
      correct: row.correct,
      wrong: row.wrong,
      total,
      pct: snap?.pct ?? (total > 0 ? Math.round((row.correct / total) * 100) : 0),
      cards: snap?.cards ?? [],
      results: snap?.results ?? [],
      answers: snap?.answers ?? [],
      shuffles: snap?.shuffles ?? [],
    }
  })
}

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${d.getDate()}`
}
