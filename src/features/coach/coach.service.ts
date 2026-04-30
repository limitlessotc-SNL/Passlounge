// src/features/coach/coach.service.ts
//
// Data layer for the SNL Educator coaching dashboard. Reads/writes the
// migration-011 tables and reduces raw Supabase rows into the StudentMetrics
// shape the dashboard renders. RLS enforces school scoping server-side; this
// module trusts those policies (no client-side allow-list).

import { supabase } from '@/config/supabase';

import type {
  CategoryAccuracy,
  Coach,
  CoachNote,
  Cohort,
  CohortStudent,
  CohortStudentStatus,
  CohortSummary,
  Intervention,
  NCLEXOutcome,
  RiskLevel,
  School,
  StudentMetrics,
} from './coach.types';
import {
  calculateProjectedPP,
  calculateReadinessScore,
  calculateRiskFlags,
  calculateRiskLevel,
  calculateVelocity,
} from './readiness';

// ─── Cohort code generation ──────────────────────────────────────────

const ALPHANUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateCohortCode(): string {
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += ALPHANUM[Math.floor(Math.random() * ALPHANUM.length)];
  }
  return out;
}

// ─── Coach auth ──────────────────────────────────────────────────────

export async function getCoachByAuthId(authId: string): Promise<Coach | null> {
  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .eq('auth_id', authId)
    .maybeSingle();
  // ─── TEMPORARY DIAG (remove after coach-login bug is diagnosed) ───
  // eslint-disable-next-line no-console
  console.log('[coach.diag] getCoachByAuthId', {
    requestedAuthId: authId,
    requestedAuthIdLen: authId?.length ?? null,
    foundData: data ? { id: (data as { id?: string }).id, auth_id: (data as { auth_id?: string }).auth_id, is_active: (data as { is_active?: boolean }).is_active } : null,
    errorCode: error?.code ?? null,
    errorMessage: error?.message ?? null,
  });
  // ─── END DIAG ───
  if (error) {
    console.warn('[coach.service] getCoachByAuthId:', error.message);
    return null;
  }
  return (data as Coach | null) ?? null;
}

export async function getSchoolById(schoolId: string): Promise<School | null> {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .eq('id', schoolId)
    .maybeSingle();
  if (error) {
    console.warn('[coach.service] getSchoolById:', error.message);
    return null;
  }
  return (data as School | null) ?? null;
}

// ─── Cohort management ──────────────────────────────────────────────

export async function getCoachCohorts(coachId: string): Promise<Cohort[]> {
  const { data, error } = await supabase
    .from('cohorts')
    .select('*')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Cohort[];
}

export async function createCohort(
  data: Omit<Cohort, 'id' | 'created_at' | 'cohort_code'>,
): Promise<Cohort> {
  // Up to 3 retries if the random code collides (UNIQUE constraint).
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateCohortCode();
    const { data: row, error } = await supabase
      .from('cohorts')
      .insert({ ...data, cohort_code: code })
      .select()
      .single();
    if (!error && row) return row as Cohort;
    // 23505 = unique_violation
    if (error && (error.code === '23505' || /unique/i.test(error.message))) {
      continue;
    }
    if (error) throw new Error(error.message);
  }
  throw new Error('Could not generate unique cohort code after 3 attempts');
}

export async function updateCohort(
  id: string,
  updates: Partial<Pick<Cohort, 'name' | 'target_test_date' | 'is_active'>>,
): Promise<void> {
  const { error } = await supabase.from('cohorts').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getCohortStudents(cohortId: string): Promise<CohortStudent[]> {
  const { data, error } = await supabase
    .from('cohort_students')
    .select('*')
    .eq('cohort_id', cohortId);
  if (error) throw new Error(error.message);
  return (data ?? []) as CohortStudent[];
}

export async function addStudentToCohort(
  cohortId: string,
  studentId: string,
): Promise<void> {
  const { error } = await supabase
    .from('cohort_students')
    .insert({ cohort_id: cohortId, student_id: studentId });
  if (error) throw new Error(error.message);
}

export async function joinCohortByCode(
  code: string,
  studentId: string,
): Promise<Cohort> {
  const upper = code.trim().toUpperCase();
  const { data: cohort, error: ce } = await supabase
    .from('cohorts')
    .select('*')
    .eq('cohort_code', upper)
    .maybeSingle();
  if (ce) throw new Error(ce.message);
  if (!cohort) throw new Error('Invalid code');
  if (!(cohort as Cohort).is_active) {
    throw new Error('This cohort is no longer active');
  }
  const { error: ie } = await supabase
    .from('cohort_students')
    .insert({ cohort_id: (cohort as Cohort).id, student_id: studentId });
  if (ie && !/duplicate/i.test(ie.message) && ie.code !== '23505') {
    throw new Error(ie.message);
  }
  return cohort as Cohort;
}

export async function updateStudentStatus(
  cohortId: string,
  studentId: string,
  status: CohortStudentStatus,
): Promise<void> {
  const { error } = await supabase
    .from('cohort_students')
    .update({ status })
    .eq('cohort_id', cohortId)
    .eq('student_id', studentId);
  if (error) throw new Error(error.message);
}

// ─── Student metrics ─────────────────────────────────────────────────

interface StudentRow {
  id: string;
  nickname: string | null;
  email?: string | null;
  test_date: string | null;
  avatar?: string | null;
}

interface CATResultRow {
  cat_level: number | null;
  pass_probability: number | null;
  taken_at: string | null;
  category_accuracy: Record<string, { correct: number; total: number }> | null;
  trend_direction: string | null;
}

interface SessionRow {
  student_id: string;
  correct: number | null;
  wrong: number | null;
  card_count: number | null;
  created_at: string;
  categories: string | null;
}

function daysBetween(later: string | Date, earlier: string | Date): number | null {
  const t1 = new Date(later).getTime();
  const t0 = new Date(earlier).getTime();
  if (!Number.isFinite(t1) || !Number.isFinite(t0)) return null;
  return Math.floor((t1 - t0) / 86_400_000);
}

function daysToFutureDate(target: string | null): number | null {
  if (!target) return null;
  const t = new Date(target + 'T00:00:00').getTime();
  if (!Number.isFinite(t)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((t - today.getTime()) / 86_400_000);
}

function buildCategoryAccuracy(
  raw: CATResultRow['category_accuracy'],
): CategoryAccuracy[] {
  if (!raw) return [];
  return Object.entries(raw)
    .filter(([, v]) => v && typeof v.total === 'number')
    .map(([category, v]) => ({
      category,
      correct: v.correct ?? 0,
      total: v.total ?? 0,
      accuracy: v.total > 0 ? v.correct / v.total : 0,
    }));
}

function pickWeakest(cats: CategoryAccuracy[], limit = 3): string[] {
  return [...cats]
    .filter(c => c.total >= 3)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, limit)
    .map(c => c.category);
}

function computeStreak(sessionsByDayDesc: string[]): number {
  if (sessionsByDayDesc.length === 0) return 0;
  // sessionsByDayDesc are unique YYYY-MM-DD strings, newest first.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  let cursor = today;
  for (const day of sessionsByDayDesc) {
    const d = new Date(day + 'T00:00:00');
    const diff = Math.round((cursor.getTime() - d.getTime()) / 86_400_000);
    if (streak === 0 && diff <= 1) {
      streak = 1;
      cursor = d;
    } else if (streak > 0 && diff === 1) {
      streak += 1;
      cursor = d;
    } else if (streak > 0) {
      break;
    } else {
      // First entry too old; no streak.
      break;
    }
  }
  return streak;
}

/**
 * Aggregates a single student's metrics from students, cat_results, and
 * sessions. Returns a fully-shaped StudentMetrics row even when the student
 * has zero activity (caller can render without null-checks everywhere).
 */
export async function fetchStudentMetrics(studentId: string): Promise<StudentMetrics> {
  const [studentR, catR, sessionsR] = await Promise.all([
    supabase.from('students')
      .select('id, nickname, test_date, avatar')
      .eq('id', studentId)
      .maybeSingle(),
    supabase.from('cat_results')
      .select('cat_level, pass_probability, taken_at, category_accuracy, trend_direction')
      .eq('student_id', studentId)
      .order('taken_at', { ascending: false }),
    supabase.from('sessions')
      .select('student_id, correct, wrong, card_count, created_at, categories')
      .eq('student_id', studentId)
      .eq('completed', true),
  ]);

  if (studentR.error) throw new Error(studentR.error.message);
  const stu = (studentR.data as StudentRow | null);
  const cats = (catR.data ?? []) as CATResultRow[];
  const sessions = (sessionsR.data ?? []) as SessionRow[];

  // CAT trajectory
  const latest = cats[0] ?? null;
  const previous = cats[1] ?? null;
  const catLevel = latest?.cat_level ?? null;
  const catLevelPrev = previous?.cat_level ?? null;
  const passProbability = latest?.pass_probability ?? null;

  let velocity: number | null = null;
  if (latest && previous && latest.taken_at && previous.taken_at) {
    velocity = calculateVelocity(
      latest.cat_level ?? 0,
      latest.taken_at,
      previous.cat_level ?? 0,
      previous.taken_at,
    );
  }

  const dtt = daysToFutureDate(stu?.test_date ?? null);
  const projectedPP = catLevel != null
    ? calculateProjectedPP(catLevel, velocity, dtt)
    : null;

  // Activity stats
  const sortedSessions = [...sessions].sort(
    (a, b) => b.created_at.localeCompare(a.created_at),
  );
  const lastActiveAt = sortedSessions[0]?.created_at ?? null;
  const dsa = lastActiveAt
    ? daysBetween(new Date(), lastActiveAt)
    : null;
  const totalCards = sessions.reduce((s, r) => s + (r.card_count ?? 0), 0);

  const fourteenDaysAgo = Date.now() - 14 * 86_400_000;
  const distinctDays14 = new Set<string>();
  const distinctDaysAll = new Set<string>();
  for (const s of sessions) {
    const t = new Date(s.created_at).getTime();
    const dayKey = s.created_at.slice(0, 10);
    distinctDaysAll.add(dayKey);
    if (t >= fourteenDaysAgo) distinctDays14.add(dayKey);
  }
  const sortedDays = Array.from(distinctDaysAll).sort((a, b) => b.localeCompare(a));
  const streak = computeStreak(sortedDays);

  const categoryAccuracy = buildCategoryAccuracy(latest?.category_accuracy ?? null);
  const weakest = pickWeakest(categoryAccuracy);

  // NGN accuracy: not split out yet at the session level, leave null until
  // we have an `ngn_session` flag to filter on.
  const ngnAccuracy: number | null = null;

  // SR compliance: best-effort fraction of last-7-days sessions that include
  // the "review" pool. Sessions table doesn't carry a pool flag here either,
  // so we approximate by saying "did any session happen in last 7 days?" →
  // 1 if yes, 0 if no. The dashboard reads this as a signal, not a metric.
  const sevenDaysAgo = Date.now() - 7 * 86_400_000;
  const recentCount = sessions.filter(
    s => new Date(s.created_at).getTime() >= sevenDaysAgo,
  ).length;
  const srCompliance = recentCount > 0 ? Math.min(1, recentCount / 5) : 0;

  // Build the partial then run the readiness engine.
  const partial: Partial<StudentMetrics> = {
    cat_level: catLevel,
    cat_velocity: velocity,
    pass_probability: passProbability,
    days_to_test: dtt,
    days_since_active: dsa,
    active_days_last_14: distinctDays14.size,
    category_accuracy: categoryAccuracy,
    sr_compliance: srCompliance,
    ngn_accuracy: ngnAccuracy,
  };

  const readiness = calculateReadinessScore(partial);
  const riskLevel = calculateRiskLevel({ ...partial, readiness_score: readiness });
  const flags = calculateRiskFlags(partial);

  return {
    student_id: studentId,
    name:       (stu?.nickname ?? '').trim() || 'Nurse',
    email:      stu?.email ?? '',
    avatar:     stu?.avatar ?? null,
    test_date:  stu?.test_date ?? null,
    days_to_test: dtt,
    cat_level: catLevel,
    cat_level_previous: catLevelPrev,
    cat_velocity: velocity,
    pass_probability: passProbability,
    projected_pass_probability: projectedPP,
    readiness_score: readiness,
    risk_level: riskLevel as RiskLevel,
    last_active_at: lastActiveAt,
    days_since_active: dsa,
    active_days_last_14: distinctDays14.size,
    total_cards_studied: totalCards,
    total_cat_sessions: cats.length,
    current_streak: streak,
    category_accuracy: categoryAccuracy,
    weakest_categories: weakest,
    sr_compliance: srCompliance,
    ngn_accuracy: ngnAccuracy,
    trend_direction: (latest?.trend_direction as StudentMetrics['trend_direction'])
      ?? 'first',
    risk_flags: flags,
  };
}

export async function fetchCohortMetrics(cohortId: string): Promise<StudentMetrics[]> {
  const members = await getCohortStudents(cohortId);
  const active = members.filter(m => m.status === 'active');
  return Promise.all(active.map(m => fetchStudentMetrics(m.student_id)));
}

export async function fetchCohortSummary(cohortId: string): Promise<CohortSummary> {
  const { data: cohortRow, error: ce } = await supabase
    .from('cohorts')
    .select('*')
    .eq('id', cohortId)
    .maybeSingle();
  if (ce) throw new Error(ce.message);
  if (!cohortRow) throw new Error('Cohort not found');
  const cohort = cohortRow as Cohort;
  const metrics = await fetchCohortMetrics(cohortId);

  let red = 0, amber = 0, green = 0;
  let ppSum = 0, ppCount = 0;
  let lvlSum = 0, lvlCount = 0;
  const failedTotals = new Map<string, number>();

  for (const m of metrics) {
    if (m.risk_level === 'red')   red++;
    if (m.risk_level === 'amber') amber++;
    if (m.risk_level === 'green') green++;
    if (m.pass_probability != null) { ppSum += m.pass_probability; ppCount++; }
    if (m.cat_level != null)        { lvlSum += m.cat_level; lvlCount++; }
    for (const cat of m.category_accuracy) {
      if (cat.total >= 3 && cat.accuracy < 0.6) {
        failedTotals.set(cat.category, (failedTotals.get(cat.category) ?? 0) + 1);
      }
    }
  }

  let mostFailed: string | null = null;
  let bestCount = 0;
  for (const [k, v] of failedTotals) {
    if (v > bestCount) { mostFailed = k; bestCount = v; }
  }

  return {
    cohort,
    total_students: metrics.length,
    red_count: red,
    amber_count: amber,
    green_count: green,
    avg_pass_probability: ppCount > 0 ? Math.round(ppSum / ppCount) : 0,
    avg_cat_level: lvlCount > 0 ? Math.round((lvlSum / lvlCount) * 100) / 100 : 0,
    most_failed_category: mostFailed,
    days_to_test: daysToFutureDate(cohort.target_test_date ?? null),
  };
}

// ─── Notes + interventions ───────────────────────────────────────────

export async function getCoachNotes(
  coachId: string,
  studentId: string,
): Promise<CoachNote[]> {
  const { data, error } = await supabase
    .from('coach_notes')
    .select('*')
    .eq('coach_id', coachId)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CoachNote[];
}

export async function addCoachNote(
  coachId: string,
  studentId: string,
  note: string,
): Promise<void> {
  const trimmed = note.trim();
  if (!trimmed) throw new Error('Note cannot be empty');
  const { error } = await supabase
    .from('coach_notes')
    .insert({ coach_id: coachId, student_id: studentId, note: trimmed });
  if (error) throw new Error(error.message);
}

export async function logIntervention(
  data: Omit<Intervention, 'id' | 'created_at'>,
): Promise<void> {
  const { error } = await supabase.from('interventions').insert(data);
  if (error) throw new Error(error.message);
}

export async function getInterventions(
  coachId: string,
  studentId: string,
): Promise<Intervention[]> {
  const { data, error } = await supabase
    .from('interventions')
    .select('*')
    .eq('coach_id', coachId)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Intervention[];
}

// ─── Student-facing helpers ──────────────────────────────────────────

export interface StudentCohortMembership {
  cohort: Cohort;
  coachName: string;
}

/**
 * Returns the student's current active cohort + coach name for the profile
 * panel. Returns null when the student is not in any active cohort. Three
 * queries (cohort_students → cohorts → coaches) — RLS scopes each to
 * auth.uid() = student_id so a student can only see their own row.
 */
export async function getStudentCohort(
  studentId: string,
): Promise<StudentCohortMembership | null> {
  const { data: csRow, error: csErr } = await supabase
    .from('cohort_students')
    .select('cohort_id')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .maybeSingle();
  if (csErr) throw new Error(csErr.message);
  if (!csRow) return null;

  const { data: cohort, error: cErr } = await supabase
    .from('cohorts')
    .select('*')
    .eq('id', (csRow as { cohort_id: string }).cohort_id)
    .maybeSingle();
  if (cErr) throw new Error(cErr.message);
  if (!cohort) return null;

  const { data: coach, error: coachErr } = await supabase
    .from('coaches')
    .select('name')
    .eq('id', (cohort as Cohort).coach_id)
    .maybeSingle();
  if (coachErr) throw new Error(coachErr.message);

  return {
    cohort: cohort as Cohort,
    coachName: (coach as { name: string } | null)?.name ?? 'Coach',
  };
}

// ─── NCLEX outcomes ──────────────────────────────────────────────────

export async function recordNCLEXOutcome(
  data: Omit<NCLEXOutcome, 'id' | 'recorded_at'>,
): Promise<void> {
  const { error } = await supabase.from('nclex_outcomes').insert(data);
  if (error) throw new Error(error.message);
}

export async function getStudentOutcomes(studentId: string): Promise<NCLEXOutcome[]> {
  const { data, error } = await supabase
    .from('nclex_outcomes')
    .select('*')
    .eq('student_id', studentId)
    .order('test_date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as NCLEXOutcome[];
}
