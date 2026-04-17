/**
 * Cards Service
 *
 * Fetches study cards from Supabase and maps them to the StudyCard format.
 * Components never call supabase directly.
 *
 * Owner: Junior Engineer 3
 */

import { DIAGNOSTIC_CARDS, STUDY_CARDS } from '@/config/fallback-cards'
import { supabase } from '@/config/supabase'
import type { StudyCard } from '@/types'

function parseJsonField<T>(val: unknown): T {
  if (typeof val === 'string') {
    try { return JSON.parse(val) as T } catch { return val as T }
  }
  return (val ?? []) as T
}

/**
 * Maps a raw Supabase row to a StudyCard.
 */
export function mapSupabaseCard(row: Record<string, unknown>): StudyCard {
  return {
    id: row.id as string | undefined,
    title: (row.title as string) || '',
    cat: (row.cat as string) || '',
    bloom: (row.bloom as string) || 'Apply',
    xp: (row.xp as number) || 20,
    type: (row.type as string) || 'Multiple Choice',
    scenario: (row.scenario as string) || '',
    question: (row.question as string) || '',
    opts: parseJsonField<string[]>(row.opts),
    correct: typeof row.correct === 'number' ? row.correct : parseInt(String(row.correct)) || 0,
    layers: parseJsonField<string[]>(row.layers),
    lens: (row.lens as string) || '',
    pearl: (row.pearl as string) || '',
    mnemonic: parseJsonField<[string, string][]>(row.mnemonic),
    why_wrong: parseJsonField<Record<string, string>>(row.why_wrong),
    difficulty_level: (row.difficulty_level as number) || 2,
    difficulty_label: (row.difficulty_label as string) || 'Application',
    nclex_category: (row.nclex_category as string) || (row.cat as string) || '',
  }
}

/**
 * Fetches all non-diagnostic study cards from Supabase.
 * Falls back to hardcoded STUDY_CARDS if Supabase returns empty or errors.
 */
export async function fetchStudyCards(): Promise<StudyCard[]> {
  try {
    const { data, error } = await supabase
      .from('cards')
      .select('id,title,cat,bloom,xp,type,scenario,question,opts,correct,layers,lens,pearl,mnemonic,why_wrong,difficulty_level,difficulty_label,nclex_category')
      .eq('is_diagnostic', false)
      .order('id', { ascending: true })
      .limit(2000)

    if (error) throw error
    if (!data || data.length === 0) return STUDY_CARDS

    return data.map((row) => mapSupabaseCard(row as Record<string, unknown>))
  } catch {
    return STUDY_CARDS
  }
}

/**
 * Fetches diagnostic cards from Supabase.
 * Falls back to hardcoded DIAGNOSTIC_CARDS if Supabase returns empty or errors.
 */
export async function fetchDiagnosticCards(): Promise<StudyCard[]> {
  try {
    const { data, error } = await supabase
      .from('cards')
      .select('id,title,cat,bloom,xp,type,scenario,question,opts,correct,layers,lens,pearl,mnemonic,why_wrong,difficulty_level,difficulty_label,nclex_category')
      .eq('is_diagnostic', true)
      .order('id', { ascending: true })

    if (error) throw error
    if (!data || data.length === 0) return DIAGNOSTIC_CARDS

    return data.map((row) => mapSupabaseCard(row as Record<string, unknown>))
  } catch {
    return DIAGNOSTIC_CARDS
  }
}
