/**
 * PublicGuard
 *
 * Redirects authenticated users away from public pages (login, signup, forgot).
 * If authenticated + onboarded → redirect to /
 * If authenticated + NOT onboarded → redirect to /onboarding
 *
 * Owner: Senior Engineer
 */

import { Navigate } from 'react-router-dom'

import { useAuthStore } from '@/store/authStore'
import { useStudentStore } from '@/store/studentStore'

export function PublicGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading = useAuthStore((s) => s.isLoading)
  const onboarded = useStudentStore((s) => s.onboarded)

  if (isLoading) return null

  if (isAuthenticated) {
    return <Navigate to={onboarded ? '/' : '/onboarding'} replace />
  }

  return <>{children}</>
}
