// src/features/ngn/ngn.service.ts
//
// Supabase CRUD for ngn_cards. RLS enforces that only admins can write,
// and any authenticated user can read. We also expose a thin lookup of
// titles+scenarios for the AI generator's duplicate-awareness pass.

import { supabase } from '@/config/supabase';

import type { NGNCard, NGNContent, NGNQuestionType } from './ngn.types';

// ─── Row → NGNCard mapper ─────────────────────────────────────────────

function parseContent(val: unknown): NGNContent {
  if (val && typeof val === 'object' && !Array.isArray(val)) return val as NGNContent;
  if (typeof val === 'string') {
    try { return JSON.parse(val) as NGNContent; } catch { /* fall through */ }
  }
  return {} as NGNContent;
}

function mapRow(row: Record<string, unknown>): NGNCard {
  return {
    id:               String(row.id ?? ''),
    title:            String(row.title ?? ''),
    scenario:         String(row.scenario ?? ''),
    question:         String(row.question ?? ''),
    type:             (row.type ?? 'mcq') as NGNQuestionType,
    nclex_category:   String(row.nclex_category ?? ''),
    difficulty_level: Number(row.difficulty_level ?? 3),
    scoring_rule:     (row.scoring_rule ?? '0/1') as NGNCard['scoring_rule'],
    max_points:       Number(row.max_points ?? 1),
    content:          parseContent(row.content),
    rationale:        String(row.rationale ?? ''),
    source:           String(row.source ?? ''),
    created_by:       row.created_by ? String(row.created_by) : undefined,
    created_at:       row.created_at ? String(row.created_at) : undefined,
  };
}

// ─── Reads ────────────────────────────────────────────────────────────

export async function fetchAllNGNCards(): Promise<NGNCard[]> {
  const { data, error } = await supabase
    .from('ngn_cards')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ngn.service] fetchAllNGNCards error:', error.message);
    return [];
  }
  return (data ?? []).map(r => mapRow(r as Record<string, unknown>));
}

export async function fetchNGNCardsByType(type: NGNQuestionType): Promise<NGNCard[]> {
  const { data, error } = await supabase
    .from('ngn_cards')
    .select('*')
    .eq('type', type)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ngn.service] fetchNGNCardsByType error:', error.message);
    return [];
  }
  return (data ?? []).map(r => mapRow(r as Record<string, unknown>));
}

/**
 * Compact projection for the AI generator's duplicate-awareness pass —
 * we only need the human-meaningful title+scenario, not the full payload.
 */
export async function fetchNGNCardTitlesAndScenarios(): Promise<
  Array<{ id: string; title: string; scenario: string }>
> {
  const { data, error } = await supabase
    .from('ngn_cards')
    .select('id,title,scenario');

  if (error) {
    console.error('[ngn.service] fetchNGNCardTitlesAndScenarios error:', error.message);
    return [];
  }
  return (data ?? []).map(r => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id ?? ''),
      title: String(row.title ?? ''),
      scenario: String(row.scenario ?? ''),
    };
  });
}

// ─── Writes (admin RLS enforces server-side) ─────────────────────────

export async function insertNGNCard(
  card: Omit<NGNCard, 'id' | 'created_at'>,
): Promise<NGNCard> {
  const { data, error } = await supabase
    .from('ngn_cards')
    .insert({
      title:            card.title,
      scenario:         card.scenario,
      question:         card.question,
      type:             card.type,
      nclex_category:   card.nclex_category,
      difficulty_level: card.difficulty_level,
      scoring_rule:     card.scoring_rule,
      max_points:       card.max_points,
      content:          card.content,
      rationale:        card.rationale,
      source:           card.source,
      created_by:       card.created_by,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Insert returned no row');
  return mapRow(data as Record<string, unknown>);
}

export async function updateNGNCard(
  id: string,
  updates: Partial<Omit<NGNCard, 'id' | 'created_at'>>,
): Promise<void> {
  const { error } = await supabase
    .from('ngn_cards')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);
}
