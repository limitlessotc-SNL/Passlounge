// src/features/coach/coach.types.ts
//
// All shapes for the SNL Educator coaching dashboard. The DB-row interfaces
// mirror migration 011's tables exactly. The "computed metrics" types at the
// bottom are produced client-side by the readiness engine + coach service.

export type LicenseTier = 'individual' | 'program' | 'enterprise';
export type CoachRole = 'super_admin' | 'school_admin' | 'faculty';
export type CohortStudentStatus = 'active' | 'passed' | 'failed' | 'withdrawn';
export type InterventionType = 'message' | 'session' | 'resource' | 'referral' | 'other';
export type NCLEXResult = 'pending' | 'passed' | 'failed';
export type RiskLevel = 'red' | 'amber' | 'green';

// ─── DB rows ─────────────────────────────────────────────────────────

export interface School {
  id: string;
  name: string;
  contact_email: string;
  license_tier: LicenseTier;
  license_expires_at: string | null;
  max_students: number;
  is_active: boolean;
  created_at: string;
}

export interface Coach {
  id: string;
  school_id: string;
  auth_id: string;
  name: string;
  email: string;
  role: CoachRole;
  is_active: boolean;
  created_at: string;
}

export interface Cohort {
  id: string;
  school_id: string;
  coach_id: string;
  name: string;
  cohort_code: string;
  target_test_date: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CohortStudent {
  cohort_id: string;
  student_id: string;
  joined_at: string;
  status: CohortStudentStatus;
}

export interface CoachNote {
  id: string;
  coach_id: string;
  student_id: string;
  note: string;
  created_at: string;
}

export interface Intervention {
  id: string;
  coach_id: string;
  student_id: string;
  type: InterventionType;
  notes: string;
  outcome: string | null;
  created_at: string;
}

export interface NCLEXOutcome {
  id: string;
  student_id: string;
  cohort_id: string | null;
  test_date: string;
  result: NCLEXResult;
  attempt_number: number;
  recorded_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  cohort_id: string | null;
  subject: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  cohort_id: string;
  coach_id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
}

// ─── Computed metrics ────────────────────────────────────────────────

export interface CategoryAccuracy {
  category: string;
  correct: number;
  total: number;
  /** 0..1 */
  accuracy: number;
}

export interface StudentMetrics {
  student_id: string;
  name: string;
  email: string;
  avatar: string | null;

  // Test logistics
  test_date: string | null;
  days_to_test: number | null;

  // CAT trajectory
  cat_level: number | null;
  cat_level_previous: number | null;
  /** Levels per week. */
  cat_velocity: number | null;
  /** 0..100, current. */
  pass_probability: number | null;
  /** 0..100, projected forward to test_date using velocity. */
  projected_pass_probability: number | null;

  // Composite
  /** 0..100 weighted score, see readiness.ts. */
  readiness_score: number;
  risk_level: RiskLevel;

  // Activity
  last_active_at: string | null;
  days_since_active: number | null;
  /** Distinct calendar days with activity in the last 14. */
  active_days_last_14: number;
  total_cards_studied: number;
  total_cat_sessions: number;
  current_streak: number;

  // Category breakdown
  category_accuracy: CategoryAccuracy[];
  weakest_categories: string[];

  // Other signals
  /** 0..1 — fraction of due SR cards reviewed in the last 7 days. */
  sr_compliance: number;
  /** 0..1 — null if no NGN attempted. */
  ngn_accuracy: number | null;
  trend_direction: 'improving' | 'declining' | 'stable' | 'first';

  risk_flags: string[];
}

export interface CohortSummary {
  cohort: Cohort;
  total_students: number;
  red_count: number;
  amber_count: number;
  green_count: number;
  /** 0..100. */
  avg_pass_probability: number;
  avg_cat_level: number;
  most_failed_category: string | null;
  days_to_test: number | null;
}

export interface CoachAuthState {
  coach: Coach | null;
  school: School | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
