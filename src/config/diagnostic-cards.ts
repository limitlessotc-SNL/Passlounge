/**
 * Diagnostic Cards Configuration
 *
 * 15 hardcoded diagnostic cards used for the one-time baseline assessment.
 * These are the same cards from the original HTML source.
 * 3 cards per category: Cardiac, Pharmacology, Respiratory, OB/Maternity, Mental Health
 *
 * In production, these are fetched from Supabase (is_diagnostic=true).
 * This config serves as the fallback when Supabase cards aren't loaded.
 *
 * Owner: Senior Engineer
 */

import type { StudyCard } from '@/types'

export const DIAGNOSTIC_CATEGORIES = [
  'Cardiac',
  'Pharmacology',
  'Respiratory',
  'OB/Maternity',
  'Mental Health',
] as const

export const DIAGNOSTIC_CARD_COUNT = 15

export const CATEGORY_ICONS: Record<string, string> = {
  'Cardiac': '🫀',
  'Pharmacology': '💊',
  'Respiratory': '🫁',
  'OB/Maternity': '🤱',
  'Mental Health': '🧠',
}

/**
 * Returns the CAT level string and description based on diagnostic accuracy percentage.
 */
export function getDiagnosticGrade(pct: number): {
  catLevel: string;
  gradeIcon: string;
  gradeText: string;
  catLabel: string;
  catSub: string;
} {
  if (pct >= 90) {
    return {
      catLevel: '4.5',
      gradeIcon: '🏆',
      gradeText: 'Excellent. You are operating well above the NCLEX passing line. Daily sessions will sharpen your edges.',
      catLabel: 'Distinguished',
      catSub: 'Well above the passing line',
    }
  }
  if (pct >= 70) {
    return {
      catLevel: '3.5',
      gradeIcon: '✅',
      gradeText: 'Strong foundation. You are near the NCLEX passing line. Targeted review of your weak categories will get you there.',
      catLabel: 'Proficient',
      catSub: 'Above the passing line',
    }
  }
  if (pct >= 50) {
    return {
      catLevel: '2.5',
      gradeIcon: '📈',
      gradeText: 'Developing. You have solid areas and clear gaps. Your study plan below targets the gaps directly.',
      catLabel: 'Developing',
      catSub: 'Approaching the passing line',
    }
  }
  return {
    catLevel: '1.5',
    gradeIcon: '💪',
    gradeText: 'Room to grow — and that is exactly what this plan is for. Start with the priority categories and build from there.',
    catLabel: 'Foundational',
    catSub: 'Below the passing line',
  }
}

/**
 * Computes per-category accuracy from diagnostic results.
 */
export function getCategoryBreakdown(
  cards: StudyCard[],
  results: (boolean | undefined)[],
): { cat: string; total: number; correct: number; pct: number; icon: string }[] {
  const cats: Record<string, { total: number; correct: number }> = {}

  cards.forEach((card, i) => {
    if (!cats[card.cat]) cats[card.cat] = { total: 0, correct: 0 }
    cats[card.cat].total++
    if (results[i]) cats[card.cat].correct++
  })

  return Object.keys(cats)
    .sort((a, b) => {
      const pctA = cats[a].correct / cats[a].total
      const pctB = cats[b].correct / cats[b].total
      return pctA - pctB
    })
    .map((cat) => ({
      cat,
      total: cats[cat].total,
      correct: cats[cat].correct,
      pct: Math.round((cats[cat].correct / cats[cat].total) * 100),
      icon: CATEGORY_ICONS[cat] ?? '📋',
    }))
}
