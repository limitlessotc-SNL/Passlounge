/**
 * Dev Mode Utility
 *
 * Sentinel values used by the DevSkipButton to bypass auth/onboarding.
 * Other components can use `isDevSession()` to skip Supabase calls
 * when running under the mock session.
 *
 * Owner: Senior Engineer
 */

import { useAuthStore } from '@/store/authStore'

export const DEV_USER_ID = 'dev-user-id'
export const DEV_MOCK_TOKEN = 'dev-mock-token'
export const DEV_USER_EMAIL = 'dev@passlounge.local'

/**
 * Returns true if the current auth session was created by the DevSkipButton.
 * Safe to call on render — reads from authStore synchronously.
 */
export function isDevSession(): boolean {
  const { token, supaStudentId } = useAuthStore.getState()
  return token === DEV_MOCK_TOKEN || supaStudentId === DEV_USER_ID
}
