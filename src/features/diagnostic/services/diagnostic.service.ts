/**
 * Diagnostic Service
 *
 * Saves and loads diagnostic results from Supabase.
 *
 * Owner: Junior Engineer 5
 */

import { supabase } from '@/config/supabase'
import type { DiagnosticResult } from '@/types'

interface DiagnosticRow {
  correct: number;
  total: number;
  cat_level: string;
  results: (boolean | undefined)[];
}

export async function saveDiagnosticResults(
  studentId: string,
  result: DiagnosticResult,
): Promise<void> {
  const { error } = await supabase
    .from('diagnostic_results')
    .insert({
      student_id: studentId,
      correct: result.correct,
      total: result.total,
      cat_level: result.catLevel,
      results: result.results,
    })

  if (error) throw error
}

export async function loadDiagnosticResults(
  studentId: string,
): Promise<DiagnosticResult | null> {
  const { data, error } = await supabase
    .from('diagnostic_results')
    .select('correct,total,cat_level,results')
    .eq('student_id', studentId)
    .order('id', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  if (!data) return null

  const row = data as DiagnosticRow
  return {
    completed: true,
    correct: row.correct,
    total: row.total,
    catLevel: row.cat_level,
    results: row.results ?? [],
  }
}
