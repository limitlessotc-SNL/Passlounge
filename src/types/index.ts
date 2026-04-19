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

// ─── Study Card (runtime format matching HTML card engine) ────────────────

export interface StudyCard {
  id?: string;
  cat: string;
  bloom: string;
  xp: number;
  title: string;
  type: string;
  scenario: string;
  question: string;
  opts: string[];
  correct: number;
  layers: string[];
  lens: string;
  pearl: string;
  mnemonic: [string, string][];
  why_wrong: Record<string, string>;
  difficulty_level?: number;
  difficulty_label?: string;
  nclex_category?: string;
}

// ─── Shuffle Types ────────────────────────────────────────────────────────

export interface ShuffleResult {
  opts: string[];
  correct: number;
  origMap: number[];
}

// ─── Session Types ─────────────────────────────────────────────────────────

export type SessionMode = 'study' | 'test';
export type SessionPool = 'all' | 'new' | 'missed';

export interface SessionState {
  mode: SessionMode;
  pool: SessionPool;
  cards: StudyCard[];
  currentIdx: number;
  results: (boolean | undefined)[];
  answers: (number | undefined)[];
  shuffles: (ShuffleResult | undefined)[];
  sessionId: string | null;
  sessionName: string;
  isActive: boolean;
  qCount: number;
  isDiagnostic: boolean;
  correctCount: number;
  wrongCount: number;
  xp: number;
  streakCount: number;
  cardTimes: Record<number, number>;
  cardTimerStart: number;
}

export interface SessionActions {
  setMode: (mode: SessionMode) => void;
  setPool: (pool: SessionPool) => void;
  setQCount: (count: number) => void;
  setSessionName: (name: string) => void;
  startSession: (cards: StudyCard[], isDiagnostic: boolean) => void;
  recordAnswer: (cardIdx: number, optIdx: number, isCorrect: boolean, xpEarned: number) => void;
  setShuffle: (cardIdx: number, shuffle: ShuffleResult) => void;
  setCurrentIdx: (idx: number) => void;
  startCardTimer: () => void;
  stopCardTimer: () => void;
  endSession: () => void;
  reset: () => void;
}

// ─── Session History ──────────────────────────────────────────────────────

export interface SessionSnapshot {
  id: number;
  name: string;
  mode: SessionMode;
  date: string;
  categories: string;
  correct: number;
  wrong: number;
  total: number;
  pct: number;
  cards: StudyCard[];
  results: (boolean | undefined)[];
  answers: (number | undefined)[];
  shuffles: (ShuffleResult | undefined)[];
  /** ISO timestamp when the session was completed (used for streak calculation). */
  createdAt?: string;
}

// ─── Diagnostic Types ─────────────────────────────────────────────────────

export interface DiagnosticResult {
  completed: boolean;
  correct: number;
  total: number;
  catLevel: string;
  results: (boolean | undefined)[];
}

// ─── Student Types ─────────────────────────────────────────────────────────

export type TesterType = 'first_time' | 'repeat' | 'international' | 'lpn_transition';
export type ConfidenceLevel = 'terrified' | 'nervous' | 'unsure' | 'confident' | 'ready';

export interface Student {
  id: string;
  nickname: string;
  tester_type: TesterType;
  confidence: ConfidenceLevel;
  test_date: string | null;
  daily_cards: number;
  onboarded: boolean;
}

export interface StudentState {
  nickname: string;
  testerType: TesterType | null;
  confidence: ConfidenceLevel | null;
  testDays: number;
  testDate: string | null;
  dailyCards: number;
  onboarded: boolean;
  /** Avatar id from AVATAR_OPTIONS. Empty string = default letter avatar. */
  avatar: string;
}

export interface StudentActions {
  setNickname: (nickname: string) => void;
  setTesterType: (type: TesterType) => void;
  setConfidence: (level: ConfidenceLevel) => void;
  setTestDate: (date: string | null, days: number) => void;
  setDailyCards: (count: number) => void;
  setOnboarded: (onboarded: boolean) => void;
  setAvatar: (avatar: string) => void;
  loadFromStudent: (student: Student) => void;
  reset: () => void;
}

// ─── SR Store Types ───────────────────────────────────────────────────────

export interface SRPendingUpdate {
  seen: number;
  correct: number;
  wrong: number;
}

export interface SRState {
  cardProgressMap: CardProgressMap;
  cardProgressLoaded: boolean;
  srPendingUpdates: Record<string, SRPendingUpdate>;
}

export interface SRActions {
  setCardProgressMap: (map: CardProgressMap) => void;
  setCardProgressLoaded: (loaded: boolean) => void;
  recordSRAnswer: (cardId: string, wasCorrect: boolean) => void;
  clearPendingUpdates: () => void;
}

// ─── Dashboard Store Types ────────────────────────────────────────────────

export interface PLStats {
  cards: number;
  xp: number;
  sessions: number;
}

export interface DashboardState {
  diagnosticResult: DiagnosticResult;
  sessionHistory: SessionSnapshot[];
  plStats: PLStats;
  streakDays: number;
  seenCardTitles: Record<string, boolean>;
}

export interface DashboardActions {
  setDiagnosticResult: (result: DiagnosticResult) => void;
  addSession: (snapshot: SessionSnapshot) => void;
  setStats: (stats: PLStats) => void;
  setStreak: (days: number) => void;
  markCardSeen: (title: string) => void;
}

// ─── Tab Navigation ───────────────────────────────────────────────────────

export type AppTab = 'home' | 'study' | 'cat' | 'compete' | 'lounge' | 'profile';
