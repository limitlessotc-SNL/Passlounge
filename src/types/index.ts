/**
 * Core TypeScript types for PassLounge
 * 
 * Owner: Senior Engineer
 * All engineers import from here. Never define types inline in components.
 */

// ─── Auth Types ───────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  supaStudentId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthActions {
  setUser: (user: AuthUser | null, token: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => void;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
}

export interface AuthError {
  message: string;
}

// ─── Card Types ────────────────────────────────────────────────────────────

export type CardCategory =
  | 'Management of Care'
  | 'MOC'
  | 'Safety and Infection Control'
  | 'Safety'
  | 'Pharmacology'
  | 'Physiological Adaptation'
  | 'Reduction of Risk'
  | 'Reduction of Risk Potential'
  | 'Basic Care & Comfort'
  | 'Basic Care and Comfort'
  | 'Health Promotion'
  | 'Health Promotion and Maintenance'
  | 'Psychosocial Integrity'
  | 'Mental Health';

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export type DifficultyLabel =
  | 'Foundation'
  | 'Application'
  | 'Analysis'
  | 'Complex'
  | 'Expert';

export interface Card {
  id: string;
  title: string;
  cat: CardCategory;
  question: string;
  opt_a: string;
  opt_b: string;
  opt_c: string;
  opt_d: string;
  correct: 0 | 1 | 2 | 3;
  difficulty_level: DifficultyLevel;
  difficulty_label: DifficultyLabel;
  xp: number;
  pearl: string;
  layer_1: string;
  layer_2: string;
  layer_3: string;
  layer_4: string;
  why_wrong_a: string;
  why_wrong_b: string;
  why_wrong_c: string;
  why_wrong_d: string;
}

// ─── SR / Card Progress Types ──────────────────────────────────────────────

export interface CardProgress {
  card_id: string;
  student_id: string;
  times_seen: number;
  times_correct: number;
  times_wrong: number;
  ease_factor: number;
  next_review: string;  // ISO date string
  last_seen: string;    // ISO date string
}

export type CardProgressMap = Record<string, CardProgress>;

// ─── Input type for calculateNextReview ───────────────────────────────────

export interface ReviewInput {
  existing: CardProgress;
  wasCorrect: boolean;
  difficultyLevel: DifficultyLevel;
  testDays: number;  // days until exam, 0 = no date set
}

// ─── Output type for calculateNextReview ──────────────────────────────────

export interface ReviewResult {
  ease_factor: number;
  next_review: string;  // ISO date string
  interval_days: number;
}

// ─── Session Types ─────────────────────────────────────────────────────────

export type SessionMode = 'study' | 'test';
export type SessionPool = 'all' | 'new' | 'missed';

// ─── Student Types ─────────────────────────────────────────────────────────

export type TesterType = 'first_time' | 'repeat' | 'international' | 'lpn_transition';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface Student {
  id: string;
  nickname: string;
  tester_type: TesterType;
  confidence: ConfidenceLevel;
  test_date: string | null;
  daily_cards: number;
  onboarded: boolean;
}
