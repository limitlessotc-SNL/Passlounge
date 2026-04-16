/**
 * OnboardingGuard
 *
 * Redirects to /onboarding if authenticated but not onboarded.
 * Wraps app routes that require completed onboarding.
 *
 * Owner: Senior Engineer
 */

import { Navigate, Outlet } from 'react-router-dom'

import { useStudentStore } from '@/store/studentStore'

export function OnboardingGuard() {
  const onboarded = useStudentStore((s) => s.onboarded)

  if (!onboarded) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
