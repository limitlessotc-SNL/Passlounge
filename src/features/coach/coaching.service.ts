// src/features/coach/coaching.service.ts
//
// Phase D5 — elite AI coaching service. Combines:
//   • An AI-backed suggestion generator (calls the coaching-suggestion
//     Edge Function and persists results to coaching_suggestions for
//     deduplication + analytics).
//   • Pure helpers (countdown alerts, cohort-wide issue detection,
//     weekly digest assembly) that stay client-side because they're
//     deterministic and don't need a model in the loop.
//   • Study-pattern computation that aggregates session timestamps and
//     upserts study_patterns for use by the AI prompt.
//
// All Supabase reads/writes assume RLS is in place (migration 013).

import { supabase } from '@/config/supabase';

import type {
  CohortHealth,
  CoachingSuggestion,
  CountdownAlert,
  Intervention,
  InterventionOutcome,
  StudentMetrics,
  StudyPattern,
  WeeklyDigest,
} from './coach.types';

// ─── Constants ─────────────────────────────────────────────────────

const FUNCTION_NAME = 'coaching-suggestion';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Readiness thresholds for countdown alerts.
const COUNTDOWN_RULES: Array<{ days: number; readinessFloor: number; level: CountdownAlert['alert_level'] }> = [
  { days: 7,  readinessFloor: 80, level: 'critical' },
  { days: 14, readinessFloor: 70, level: 'urgent'   },
  { days: 30, readinessFloor: 60, level: 'warning'  },
];

// ─── FEATURE 1 — AI suggestion ─────────────────────────────────────

interface InvokeResponse {
  suggestion?: Partial<CoachingSuggestion>;
}

/**
 * Calls the coaching-suggestion Edge Function and persists the result to
 * coaching_suggestions. The Edge Function does its own auth + coach check;
 * this client just shapes the request, parses the response, and logs.
 */
export async function generateCoachingSuggestion(
  studentMetrics: StudentMetrics,
  recentInterventions: Intervention[],
  interventionOutcomes: InterventionOutcome[],
  previousSuggestions: string[],
  studyPattern: StudyPattern | null,
  cohortName: string,
  cohortHealth: CohortHealth,
): Promise<CoachingSuggestion> {
  const { data, error } = await supabase.functions.invoke<InvokeResponse>(FUNCTION_NAME, {
    body: {
      student_id:            studentMetrics.student_id,
      student_metrics:       studentMetrics,
      recent_interventions:  recentInterventions,
      intervention_outcomes: interventionOutcomes,
      previous_suggestions:  previousSuggestions,
      study_pattern:         studyPattern,
      cohort_name:           cohortName,
      days_to_test:          studentMetrics.days_to_test,
      cohort_health:         cohortHealth,
    },
  });
  if (error) throw new Error(`Edge function error: ${error.message}`);
  if (!data?.suggestion) throw new Error('Edge function returned no suggestion');

  const s = data.suggestion;
  const suggestion: CoachingSuggestion = {
    recommendation:       String(s.recommendation ?? ''),
    urgency:              (s.urgency ?? 'medium') as CoachingSuggestion['urgency'],
    suggested_message:    String(s.suggested_message ?? ''),
    milestone:            s.milestone,
    celebration:          s.celebration ?? false,
    focus_categories:     Array.isArray(s.focus_categories) ? s.focus_categories.map(String) : [],
    weekly_actions:       Array.isArray(s.weekly_actions) ? s.weekly_actions.map(String) : [],
    study_pattern_insight: s.study_pattern_insight,
    countdown_alert:      s.countdown_alert,
    intervention_approach: s.intervention_approach,
    generated_at:         new Date().toISOString(),
    student_id:           studentMetrics.student_id,
  };

  // Persist for deduplication + analytics. Lookup the coach row id from
  // auth so coaching_suggestions.coach_id matches the FK.
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: coach } = await supabase
        .from('coaches')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle();
      if (coach) {
        await supabase.from('coaching_suggestions').insert({
          coach_id:    (coach as { id: string }).id,
          student_id:  studentMetrics.student_id,
          suggestion:  suggestion.recommendation,
          urgency:     suggestion.urgency,
        });
      }
    }
  } catch (e) {
    // Logging is best-effort — surface-level errors don't break the UI.
    console.warn('[coaching.service] log suggestion failed:', (e as Error).message);
  }

  return suggestion;
}

export async function getPreviousSuggestions(
  studentId: string,
  limit = 5,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('coaching_suggestions')
    .select('suggestion')
    .eq('student_id', studentId)
    .order('generated_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('[coaching.service] getPreviousSuggestions:', error.message);
    return [];
  }
  return ((data ?? []) as Array<{ suggestion: string }>).map(r => r.suggestion);
}

// ─── FEATURE 2 — Intervention outcome learning ─────────────────────

export async function recordInterventionOutcome(
  interventionId: string,
  studentId: string,
  coachId: string,
  catLevelBefore: number | null,
  catLevelAfter: number | null,
  wasEffective: boolean,
  notes: string,
): Promise<void> {
  const { error } = await supabase.from('intervention_outcomes').insert({
    intervention_id:  interventionId,
    student_id:       studentId,
    coach_id:         coachId,
    cat_level_before: catLevelBefore,
    cat_level_after:  catLevelAfter,
    was_effective:    wasEffective,
    notes,
  });
  if (error) throw new Error(error.message);
}

export async function getInterventionOutcomes(
  studentId: string,
): Promise<InterventionOutcome[]> {
  const { data, error } = await supabase
    .from('intervention_outcomes')
    .select('*')
    .eq('student_id', studentId)
    .order('recorded_at', { ascending: false });
  if (error) {
    console.warn('[coaching.service] getInterventionOutcomes:', error.message);
    return [];
  }
  return (data ?? []) as InterventionOutcome[];
}

// ─── FEATURE 3 — Test-date countdown ───────────────────────────────

/**
 * Pure, no API call. Returns null when the student has no test date or is
 * already on track for the relevant tier. The thresholds chosen here are
 * deliberately conservative — even a "warning" should make a coach reach
 * out, and "critical" should produce a same-day intervention.
 */
export function generateCountdownAlert(
  daysToTest: number | null,
  readinessScore: number,
): CountdownAlert | null {
  if (daysToTest == null) return null;
  // Sorted closest-first so we pick the most urgent matching tier.
  for (const rule of COUNTDOWN_RULES) {
    if (daysToTest <= rule.days && readinessScore < rule.readinessFloor) {
      return {
        days_remaining: daysToTest,
        alert_level:    rule.level,
        message:        countdownMessage(daysToTest, rule.level, readinessScore),
      };
    }
  }
  return null;
}

function countdownMessage(days: number, level: CountdownAlert['alert_level'], readiness: number): string {
  if (level === 'critical') {
    return `Test in ${days} days — readiness ${readiness}/100. Book a same-week 1:1 and narrow the focus to 1–2 weakest categories.`;
  }
  if (level === 'urgent') {
    return `Test in ${days} days — readiness ${readiness}/100. Daily check-ins recommended; focus on highest-weight gaps.`;
  }
  return `Test in ${days} days — readiness ${readiness}/100. Make a weekly plan that targets the weakest categories.`;
}

// ─── FEATURE 4 — Study pattern analysis ────────────────────────────

interface SessionRow {
  student_id: string;
  card_count: number | null;
  created_at: string;
}

/**
 * Reads the last 30 days of completed sessions, derives the student's
 * peak day-of-week / peak hour-of-day, average session length, and any
 * "dropout-risk" days (a day with 0 sessions sandwiched between active
 * days). Upserts to study_patterns and returns the row.
 *
 * Session length is approximated from `card_count * 60s` because the
 * sessions table doesn't carry a duration column. Coaches read this as
 * a directional signal, not a literal stopwatch.
 */
export async function computeStudyPattern(studentId: string): Promise<StudyPattern> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from('sessions')
    .select('student_id, card_count, created_at')
    .eq('student_id', studentId)
    .eq('completed', true)
    .gte('created_at', since)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as SessionRow[];
  const pattern = derivePatternFromSessions(studentId, rows);

  // Upsert (PK = student_id).
  await supabase
    .from('study_patterns')
    .upsert({
      student_id:              pattern.student_id,
      peak_study_days:         pattern.peak_study_days,
      peak_study_hours:        pattern.peak_study_hours,
      avg_session_length_mins: pattern.avg_session_length_mins,
      avg_daily_cards:         pattern.avg_daily_cards,
      dropout_risk_days:       pattern.dropout_risk_days,
      last_computed_at:        pattern.last_computed_at,
    });
  return pattern;
}

/**
 * Pure helper extracted so the test suite can verify grouping without
 * mocking Supabase. Empty input returns the neutral default pattern.
 */
export function derivePatternFromSessions(
  studentId: string,
  rows: SessionRow[],
): StudyPattern {
  const dayCounts: Record<string, number> = {};
  const hourCounts: Record<number, number> = {};
  const dayKeysSeen = new Set<string>();
  let totalCards = 0;
  let sessionCount = 0;

  for (const r of rows) {
    const d = new Date(r.created_at);
    if (isNaN(d.getTime())) continue;
    const dow = DAYS_OF_WEEK[d.getDay()];
    dayCounts[dow] = (dayCounts[dow] ?? 0) + 1;
    const hour = d.getHours();
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
    dayKeysSeen.add(d.toISOString().slice(0, 10));
    totalCards += r.card_count ?? 0;
    sessionCount++;
  }

  const peakDays  = pickTop(dayCounts, 2).filter(([, n]) => n > 0).map(([k]) => k);
  const peakHours = pickTop(hourCounts as Record<string, number>, 3)
    .filter(([, n]) => n > 0)
    .map(([k]) => Number(k))
    .sort((a, b) => a - b);

  // Avg session length: card_count * ~60s, capped to a sane max.
  const avgCards = sessionCount > 0 ? totalCards / sessionCount : 0;
  const avgLengthMins = Math.min(120, Math.round(avgCards * 1));

  // Avg daily cards across distinct calendar days observed.
  const avgDaily = dayKeysSeen.size > 0 ? totalCards / dayKeysSeen.size : 0;

  // Dropout-risk days: a calendar day with no session that's bracketed
  // by active days within the same week. We bucket by ISO date string.
  const sortedDays = Array.from(dayKeysSeen).sort();
  const dropoutRiskDays: string[] = [];
  if (sortedDays.length >= 2) {
    for (let i = 0; i < sortedDays.length - 1; i++) {
      const a = new Date(sortedDays[i] + 'T00:00:00').getTime();
      const b = new Date(sortedDays[i + 1] + 'T00:00:00').getTime();
      const gapDays = Math.round((b - a) / 86_400_000) - 1;
      if (gapDays >= 1 && gapDays <= 6) {
        for (let g = 1; g <= gapDays; g++) {
          const skipped = new Date(a + g * 86_400_000);
          dropoutRiskDays.push(DAYS_OF_WEEK[skipped.getDay()]);
        }
      }
    }
  }

  // Dedup risk days, keep most-frequent first.
  const riskCount: Record<string, number> = {};
  for (const d of dropoutRiskDays) riskCount[d] = (riskCount[d] ?? 0) + 1;
  const sortedRisk = pickTop(riskCount, 3).filter(([, n]) => n >= 2).map(([k]) => k);

  return {
    student_id:              studentId,
    peak_study_days:         peakDays,
    peak_study_hours:        peakHours,
    avg_session_length_mins: avgLengthMins,
    avg_daily_cards:         Math.round(avgDaily * 10) / 10,
    dropout_risk_days:       sortedRisk,
    last_computed_at:        new Date().toISOString(),
  };
}

function pickTop(
  obj: Record<string, number>,
  limit: number,
): Array<[string, number]> {
  return Object.entries(obj)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit);
}

export async function getStudyPattern(studentId: string): Promise<StudyPattern | null> {
  const { data, error } = await supabase
    .from('study_patterns')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle();
  if (error) {
    console.warn('[coaching.service] getStudyPattern:', error.message);
    return null;
  }
  return (data as StudyPattern | null) ?? null;
}

// ─── FEATURE 5 — Cohort health ─────────────────────────────────────

const PASSING_LEVEL  = 3.0;
const INACTIVE_DAYS  = 7;
const COHORT_AT_RISK_INACTIVE_PCT     = 0.30;
const COHORT_AT_RISK_BELOW_PASSING    = 0.50;
const COHORT_WEAKNESS_THRESHOLD       = 0.55;
const CATEGORY_MIN_QUESTIONS          = 5;

/**
 * Pure aggregation over already-fetched StudentMetrics. The cohortId arg
 * is currently unused but accepted for API stability — we may later want
 * to fan out additional cohort-scoped queries here.
 */
export async function getCohortHealth(
  _cohortId: string,
  allMetrics: StudentMetrics[],
): Promise<CohortHealth> {
  return computeCohortHealth(allMetrics);
}

export function computeCohortHealth(allMetrics: StudentMetrics[]): CohortHealth {
  const total = allMetrics.length;
  let ppSum = 0, ppCount = 0;
  let inactive = 0;
  let belowPassing = 0;

  // Cohort-wide weakest category: average accuracy across all students who
  // have answered enough questions in that category.
  const catTotals: Record<string, { correctSum: number; totalSum: number; nStudents: number }> = {};
  for (const m of allMetrics) {
    if (m.pass_probability != null) { ppSum += m.pass_probability; ppCount++; }
    if (m.days_since_active != null && m.days_since_active >= INACTIVE_DAYS) inactive++;
    if (m.cat_level != null && m.cat_level < PASSING_LEVEL) belowPassing++;

    for (const c of m.category_accuracy) {
      if (c.total < CATEGORY_MIN_QUESTIONS) continue;
      const bucket = catTotals[c.category] ?? { correctSum: 0, totalSum: 0, nStudents: 0 };
      bucket.correctSum += c.correct;
      bucket.totalSum   += c.total;
      bucket.nStudents  += 1;
      catTotals[c.category] = bucket;
    }
  }

  let weakestCategory: string | null = null;
  let weakestAccuracy: number | null = null;
  for (const [cat, b] of Object.entries(catTotals)) {
    if (b.nStudents < 2) continue; // need at least 2 students for a cohort signal
    const acc = b.totalSum > 0 ? b.correctSum / b.totalSum : 0;
    if (weakestAccuracy === null || acc < weakestAccuracy) {
      weakestCategory = cat;
      weakestAccuracy = acc;
    }
  }

  return {
    avg_pass_probability:           ppCount > 0 ? Math.round(ppSum / ppCount) : 0,
    weakest_category:               weakestCategory,
    weakest_category_avg_accuracy:  weakestAccuracy,
    students_not_active_7_days:     inactive,
    students_below_passing:         belowPassing,
    total_students:                 total,
  };
}

/** Returns a human-readable cohort-wide alert if any of the rule thresholds
 *  fire. Pure function, no side effects. */
export function detectCohortWideIssue(health: CohortHealth): string | null {
  if (
    health.weakest_category &&
    health.weakest_category_avg_accuracy != null &&
    health.weakest_category_avg_accuracy < COHORT_WEAKNESS_THRESHOLD
  ) {
    return `Cohort weakness: ${health.weakest_category} averaging ${Math.round(health.weakest_category_avg_accuracy * 100)}%. Consider a class-wide review.`;
  }
  if (
    health.total_students > 0 &&
    health.students_not_active_7_days / health.total_students > COHORT_AT_RISK_INACTIVE_PCT
  ) {
    return `${health.students_not_active_7_days} of ${health.total_students} students have been inactive 7+ days. Time for a re-engagement push.`;
  }
  if (
    health.total_students > 0 &&
    health.students_below_passing / health.total_students > COHORT_AT_RISK_BELOW_PASSING
  ) {
    return `${health.students_below_passing} of ${health.total_students} students are below the passing CAT level (3.0). Cohort needs intensive review.`;
  }
  return null;
}

// ─── Weekly digest (rule-based) ────────────────────────────────────

export async function generateWeeklyDigest(
  cohortId: string,
  allStudentMetrics: StudentMetrics[],
): Promise<WeeklyDigest> {
  return buildWeeklyDigest(cohortId, allStudentMetrics);
}

/** Pure helper extracted for direct test access (no Supabase dependency). */
export function buildWeeklyDigest(
  cohortId: string,
  allStudentMetrics: StudentMetrics[],
): WeeklyDigest {
  const health = computeCohortHealth(allStudentMetrics);

  // Most improved: highest positive cat_velocity.
  let mostImproved: StudentMetrics | null = null;
  let mostImprovedDelta: number | null = null;
  for (const m of allStudentMetrics) {
    if (m.cat_velocity == null || m.cat_velocity <= 0) continue;
    if (mostImprovedDelta === null || m.cat_velocity > mostImprovedDelta) {
      mostImproved = m;
      mostImprovedDelta = m.cat_velocity;
    }
  }

  // Most at risk: red, sorted by readiness ascending, max 5.
  const mostAtRisk = allStudentMetrics
    .filter(m => m.risk_level === 'red')
    .sort((a, b) => a.readiness_score - b.readiness_score)
    .slice(0, 5);

  // Students needing contact: not active 3+ days AND days_to_test < 30.
  const studentsNeedingContact = allStudentMetrics.filter(
    m => m.days_since_active != null && m.days_since_active >= 3 &&
         m.days_to_test != null && m.days_to_test < 30,
  );

  // Pull the cohort's earliest test date from the metrics for the alert.
  // Different students may have different personal dates; use the soonest.
  let nearestDays: number | null = null;
  let cohortReadiness = 0;
  let readinessCount = 0;
  for (const m of allStudentMetrics) {
    if (m.days_to_test != null && (nearestDays === null || m.days_to_test < nearestDays)) {
      nearestDays = m.days_to_test;
    }
    cohortReadiness += m.readiness_score;
    readinessCount++;
  }
  const avgReadiness = readinessCount > 0 ? Math.round(cohortReadiness / readinessCount) : 0;
  const countdown = generateCountdownAlert(nearestDays, avgReadiness);

  const focus = pickWeeklyFocus({
    countdown,
    cohortIssue: detectCohortWideIssue(health),
    mostAtRisk,
    needContact: studentsNeedingContact.length,
  });

  return {
    generated_at:                  new Date().toISOString(),
    cohort_id:                     cohortId,
    most_improved:                 mostImproved,
    most_improved_delta:           mostImprovedDelta,
    most_at_risk:                  mostAtRisk,
    cohort_wide_weakness:          health.weakest_category,
    cohort_wide_weakness_accuracy: health.weakest_category_avg_accuracy,
    coach_focus_this_week:         focus,
    students_needing_contact:      studentsNeedingContact,
    cohort_health:                 health,
    countdown_alert:               countdown?.message ?? null,
  };
}

interface FocusInputs {
  countdown:    CountdownAlert | null;
  cohortIssue:  string | null;
  mostAtRisk:   StudentMetrics[];
  needContact:  number;
}

function pickWeeklyFocus(inp: FocusInputs): string {
  if (inp.countdown && inp.countdown.alert_level === 'critical') {
    return inp.countdown.message;
  }
  if (inp.cohortIssue) return inp.cohortIssue;
  if (inp.mostAtRisk.length >= 3) {
    return `Triage the ${inp.mostAtRisk.length} red-risk students before the end of the week.`;
  }
  if (inp.needContact > 0) {
    return `${inp.needContact} student${inp.needContact === 1 ? '' : 's'} need${inp.needContact === 1 ? 's' : ''} a check-in this week.`;
  }
  if (inp.countdown) return inp.countdown.message;
  return 'Cohort is on track. Run weekly check-ins and celebrate the most-improved.';
}
