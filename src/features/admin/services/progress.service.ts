// src/features/admin/services/progress.service.ts
//
// Aggregates student + session data into roster rows for the admin
// /admin/progress screen. Two queries (students, completed sessions),
// reduced client-side per student. RLS already gates these reads to
// is_admin = true accounts (admin policies on `students` and `sessions`),
// so the roster is empty for non-admins regardless of what the client
// requests.
//
// In dev-skip mode the service returns a small mock so the table is
// previewable without a real Supabase session.
//
// Owner: Senior Engineer

import { supabase } from '@/config/supabase';
import { isDevSession } from '@/utils/devMode';

export type TesterType = 'first_time' | 'repeat';

export interface RosterRow {
  id:             string;
  nickname:       string;
  testerType:     TesterType | null;
  onboarded:      boolean;
  testDate:       string | null;
  daysToTest:     number | null;
  dailyCards:     number;
  totalSessions:  number;
  totalCorrect:   number;
  totalWrong:     number;
  /** 0..100 — overall accuracy across all completed sessions. */
  accuracyPct:    number;
  /** ISO timestamp of the most recent completed session, if any. */
  lastSessionAt:  string | null;
  /** ISO timestamp of when the student row was created. */
  createdAt:      string | null;
}

interface StudentRow {
  id:           string;
  nickname:     string | null;
  tester_type:  string | null;
  onboarded:    boolean | null;
  test_date:    string | null;
  daily_cards:  number | null;
  created_at:   string | null;
}

interface SessionAgg {
  student_id:  string;
  correct:     number | null;
  wrong:       number | null;
  created_at:  string;
}

function computeDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diffMs = target.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function buildRow(stu: StudentRow, agg: {
  totalSessions: number; totalCorrect: number; totalWrong: number; lastSessionAt: string | null;
}): RosterRow {
  const total       = agg.totalCorrect + agg.totalWrong;
  const accuracyPct = total > 0 ? Math.round((agg.totalCorrect / total) * 100) : 0;
  const daysToTest  = stu.test_date ? computeDaysUntil(stu.test_date) : null;
  return {
    id:             stu.id,
    nickname:       (stu.nickname ?? '').trim() || 'Nurse',
    testerType:     stu.tester_type === 'first_time' || stu.tester_type === 'repeat'
                      ? stu.tester_type
                      : null,
    onboarded:      !!stu.onboarded,
    testDate:       stu.test_date,
    daysToTest,
    dailyCards:     stu.daily_cards ?? 35,
    totalSessions:  agg.totalSessions,
    totalCorrect:   agg.totalCorrect,
    totalWrong:     agg.totalWrong,
    accuracyPct,
    lastSessionAt:  agg.lastSessionAt,
    createdAt:      stu.created_at,
  };
}

// ─── Dev-skip mock ────────────────────────────────────────────────────

const NOW_MS = Date.now();
const days = (n: number) => new Date(NOW_MS - n * 86_400_000).toISOString();

const DEV_MOCK_ROSTER: RosterRow[] = [
  {
    id: 'mock-1', nickname: 'Keisha', testerType: 'first_time', onboarded: true,
    testDate: '2026-07-15', daysToTest: 78, dailyCards: 35,
    totalSessions: 24, totalCorrect: 612, totalWrong: 188,
    accuracyPct: 76, lastSessionAt: days(0), createdAt: days(60),
  },
  {
    id: 'mock-2', nickname: 'Jamal', testerType: 'repeat', onboarded: true,
    testDate: '2026-06-04', daysToTest: 37, dailyCards: 50,
    totalSessions: 41, totalCorrect: 1180, totalWrong: 410,
    accuracyPct: 74, lastSessionAt: days(1), createdAt: days(120),
  },
  {
    id: 'mock-3', nickname: 'Priya', testerType: 'first_time', onboarded: true,
    testDate: null, daysToTest: null, dailyCards: 25,
    totalSessions: 7, totalCorrect: 110, totalWrong: 70,
    accuracyPct: 61, lastSessionAt: days(8), createdAt: days(30),
  },
  {
    id: 'mock-4', nickname: 'Marco', testerType: 'first_time', onboarded: false,
    testDate: null, daysToTest: null, dailyCards: 35,
    totalSessions: 0, totalCorrect: 0, totalWrong: 0,
    accuracyPct: 0, lastSessionAt: null, createdAt: days(2),
  },
  {
    id: 'mock-5', nickname: 'Aaliyah', testerType: 'repeat', onboarded: true,
    testDate: '2026-05-20', daysToTest: 22, dailyCards: 50,
    totalSessions: 33, totalCorrect: 985, totalWrong: 240,
    accuracyPct: 80, lastSessionAt: days(0), createdAt: days(95),
  },
];

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Returns one row per student in the database, with their completed-session
 * aggregates folded in. Sort/filter happens client-side in the screen.
 */
export async function fetchStudentRoster(): Promise<RosterRow[]> {
  if (import.meta.env.DEV && isDevSession()) {
    return DEV_MOCK_ROSTER;
  }

  const studentsQ = supabase
    .from('students')
    .select('id, nickname, tester_type, onboarded, test_date, daily_cards, created_at');
  const sessionsQ = supabase
    .from('sessions')
    .select('student_id, correct, wrong, created_at')
    .eq('completed', true);

  const [{ data: students, error: sErr }, { data: sessions, error: seErr }] = await Promise.all([
    studentsQ, sessionsQ,
  ]);
  if (sErr)  throw new Error(`students: ${sErr.message}`);
  if (seErr) throw new Error(`sessions: ${seErr.message}`);

  const aggs = new Map<string, {
    totalSessions: number; totalCorrect: number; totalWrong: number; lastSessionAt: string | null;
  }>();
  for (const row of (sessions ?? []) as SessionAgg[]) {
    const a = aggs.get(row.student_id) ?? {
      totalSessions: 0, totalCorrect: 0, totalWrong: 0, lastSessionAt: null,
    };
    a.totalSessions += 1;
    a.totalCorrect  += row.correct ?? 0;
    a.totalWrong    += row.wrong ?? 0;
    if (!a.lastSessionAt || row.created_at > a.lastSessionAt) {
      a.lastSessionAt = row.created_at;
    }
    aggs.set(row.student_id, a);
  }

  return ((students ?? []) as StudentRow[]).map(stu =>
    buildRow(stu, aggs.get(stu.id) ?? {
      totalSessions: 0, totalCorrect: 0, totalWrong: 0, lastSessionAt: null,
    }),
  );
}
