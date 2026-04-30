// src/features/admin/admin.types.ts

/**
 * In-memory only — never persisted. The studentId binding means a sign-out
 * + sign-in as a different user invalidates the prior session even if the
 * SPA never refreshed.
 */
export interface AdminSession {
  studentId: string;
  isAdminVerified: boolean;
  expiresAt: number;
}

export interface AdminLoginAttempt {
  student_id: string;
  attempted_at: string;
  succeeded: boolean;
}

export interface RateLimitStatus {
  locked: boolean;
  remainingAttempts: number;
  /** Earliest moment the rate limit will release, when locked. */
  unlocksAt?: number;
}
