/**
 * Auth Store
 *
 * Zustand store for authentication state.
 * State: user, token, supaStudentId, isAuthenticated, isLoading
 *
 * Owner: Junior Engineer 1
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import { identifyUser, resetUser } from '@/services/analytics'
import type { AuthActions, AuthState, AuthUser } from '@/types'

export const useAuthStore = create<AuthState & AuthActions>()(
  devtools(
    (set) => ({
      user: null,
      token: null,
      supaStudentId: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user: AuthUser | null, token: string | null) => {
        set({
          user,
          token,
          supaStudentId: user?.id ?? null,
          isAuthenticated: !!user,
          isLoading: false,
        })
        // Identify in PostHog so all subsequent events are attached to this
        // user. Fires on both fresh login and session restore.
        if (user) {
          identifyUser(user.id, { email: user.email })
        } else {
          // Clearing the user via setUser(null, null) is treated as a logout.
          resetUser()
        }
      },

      setLoading: (isLoading: boolean) => set({ isLoading }),

      logout: () => {
        set({
          user: null,
          token: null,
          supaStudentId: null,
          isAuthenticated: false,
          isLoading: false,
        })
        resetUser()
      },
    }),
    { name: 'authStore' },
  ),
)
