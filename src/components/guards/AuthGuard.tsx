/**
 * AuthGuard
 *
 * Redirects to /login if user is not authenticated.
 * Wraps protected routes.
 *
 * Owner: Senior Engineer
 */

import { Navigate, Outlet } from 'react-router-dom'

import { useAuthStore } from '@/store/authStore'

export function AuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading = useAuthStore((s) => s.isLoading)

  if (isLoading) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
