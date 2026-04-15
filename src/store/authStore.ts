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

import type { AuthActions, AuthState, AuthUser } from '@/types'

export const useAuthStore = create<AuthState & AuthActions>()(
  devtools(
    (set) => ({
      user: null,
      token: null,
      supaStudentId: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user: AuthUser | null, token: string | null) =>
        set({
          user,
          token,
          supaStudentId: user?.id ?? null,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      setLoading: (isLoading: boolean) => set({ isLoading }),

      logout: () =>
        set({
          user: null,
          token: null,
          supaStudentId: null,
          isAuthenticated: false,
          isLoading: false,
        }),
    }),
    { name: 'authStore' },
  ),
)
