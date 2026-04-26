// src/features/cat/cat.service.ts

import { supabase } from '@/config/supabase';
import type { StudyCard } from '@/types';
import { isDevSession } from '@/utils/devMode';
import type { CATResult } from './cat.types';
import { sanitizeCardText } from './cat.utils';

// ─── Dev-mode local persistence ──────────────────────────────────────────
// CAT sessions that run under the DEV button have no real auth session and
// will bounce off Supabase RLS. Mirror the CPR dev-mode pattern — write to
// localStorage so the review flow works end-to-end without a signed-in user.

const DEV_STORAGE_KEY = 'passlounge.cat_results.dev';

function readDevResults(): CATResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(DEV_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CATResult[]) : [];
  } catch {
    return [];
  }
}

function writeDevResults(results: CATResult[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(results));
  } catch {
    // localStorage quota exceeded or unavailable — swallow; test data only.
  }
}

// ─── Card mapping ─────────────────────────────────────────────────────────
// Mirrors the pattern in cards.service.ts — handles both parsed and string JSONB.

function parseJsonField<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val as T[];
  if (typeof val === 'string') {
    try { return JSON.parse(val) as T[]; } catch { return []; }
  }
  return [];
}

function parseJsonObject<T extends object>(val: unknown): T {
  if (val && typeof val === 'object' && !Array.isArray(val)) return val as T;
  if (typeof val === 'string') {
    try { return JSON.parse(val) as T; } catch { return {} as T; }
  }
  return {} as T;
}

function mapCardRow(row: Record<string, unknown>): StudyCard {
  const opts     = parseJsonField<string>(row.opts).map(sanitizeCardText);
  const layers   = parseJsonField<string>(row.layers);
  const mnemonic = parseJsonField<[string, string]>(row.mnemonic);
  const whyWrong = parseJsonObject<Record<string, string>>(row.why_wrong);

  return {
    id:               String(row.id ?? ''),
    title:            String(row.title ?? ''),
    cat:              String(row.cat ?? ''),
    bloom:            String(row.bloom ?? 'Apply'),
    xp:               Number(row.xp ?? 20),
    type:             String(row.type ?? 'Multiple Choice'),
    scenario:         sanitizeCardText(String(row.scenario ?? '')),
    question:         sanitizeCardText(String(row.question ?? '')),
    opts,
    correct:          Number(row.correct ?? 0),
    layers,
    lens:             String(row.lens ?? ''),
    pearl:            String(row.pearl ?? ''),
    mnemonic,
    why_wrong:        whyWrong,
    difficulty_level: Number(row.difficulty_level ?? 3),
    difficulty_label: String(row.difficulty_label ?? 'Application'),
    // Prefer nclex_category; fall back to cat — same logic as cards.service.ts
    nclex_category:   String(row.nclex_category ?? row.cat ?? ''),
  };
}

// ─── fetchAllCardsForCAT ──────────────────────────────────────────────────

/**
 * Fetches every card from the database for CAT use.
 * No LIMIT — we need the full pool so the algorithm can select accurately.
 * Returns [] on error (session will handle gracefully).
 */
export async function fetchAllCardsForCAT(): Promise<StudyCard[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .order('id');

  if (error) {
    console.error('[cat.service] fetchAllCardsForCAT error:', error.message);
    return [];
  }

  if (!data || data.length === 0) return [];

  return data.map(row => mapCardRow(row as Record<string, unknown>));
}

// ─── fetchPreviousCATLevel ────────────────────────────────────────────────

/**
 * Returns the cat_level from the student's most recent completed CAT, or null
 * if they have never taken one.
 */
export async function fetchPreviousCATLevel(studentId: string): Promise<number | null> {
  if (isDevSession()) {
    const results = readDevResults().filter(r => r.student_id === studentId);
    return results[0]?.cat_level ?? null;
  }

  const { data, error } = await supabase
    .from('cat_results')
    .select('cat_level')
    .eq('student_id', studentId)
    .order('taken_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data.cat_level as number;
}

// ─── saveCATResult ────────────────────────────────────────────────────────

/**
 * Persists a completed (or abandoned) CAT result to the database.
 * Throws on Supabase error so the caller can surface the failure to the student.
 */
export async function saveCATResult(
  result: Omit<CATResult, 'id' | 'taken_at'>
): Promise<void> {
  if (isDevSession()) {
    const fake: CATResult = {
      ...result,
      id: `dev-${Date.now()}`,
      taken_at: new Date().toISOString(),
    };
    writeDevResults([fake, ...readDevResults()]);
    return;
  }

  const { error } = await supabase.from('cat_results').insert(result);
  if (error) {
    console.error('[cat.service] saveCATResult error:', error.message);
    throw new Error(error.message);
  }
}

// ─── fetchCATHistory ──────────────────────────────────────────────────────

/**
 * Returns up to 10 of the student's most recent CAT results (newest first).
 * Used by CATTab to display history and by the coach dashboard.
 */
export async function fetchCATHistory(studentId: string): Promise<CATResult[]> {
  if (isDevSession()) {
    return readDevResults()
      .filter(r => r.student_id === studentId)
      .slice(0, 10);
  }

  const { data, error } = await supabase
    .from('cat_results')
    .select('*')
    .eq('student_id', studentId)
    .order('taken_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('[cat.service] fetchCATHistory error:', error.message);
    return [];
  }

  return (data ?? []) as unknown as CATResult[];
}
