/**
 * AuthProvider
 *
 * Listens to Supabase auth state changes and restores session on page load.
 * Populates authStore and studentStore from the persisted session.
 * Must wrap the entire app inside main.tsx.
 *
 * Owner: Junior Engineer 1
 */

import { useEffect } from 'react'

import { supabase } from '@/config/supabase'
import { loadUserData } from '@/features/data/services/dataLoader.service'
import { useAuthStore } from '@/store/authStore'
import { useStudentStore } from '@/store/studentStore'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser)
  const setLoading = useAuthStore((s) => s.setLoading)
  const logout = useAuthStore((s) => s.logout)
  const setNickname = useStudentStore((s) => s.setNickname)
  const setOnboarded = useStudentStore((s) => s.setOnboarded)
  const setDailyCards = useStudentStore((s) => s.setDailyCards)

  useEffect(() => {
    let mounted = true

    async function restoreSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!mounted) return

        if (session?.user) {
          setUser(
            { id: session.user.id, email: session.user.email ?? '' },
            session.access_token,
          )

          const meta = session.user.user_metadata
          if (meta) {
            if (meta.nickname) setNickname(meta.nickname as string)
            if (meta.onboarded) setOnboarded(true)
            if (meta.daily_cards) setDailyCards(meta.daily_cards as number)
          }

          // Load all user data from Supabase (sessions, diagnostic, progress)
          void loadUserData(session.user.id)
        } else {
          setLoading(false)
        }
      } catch {
        if (mounted) setLoading(false)
      }
    }

    void restoreSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return

        if (session?.user) {
          setUser(
            { id: session.user.id, email: session.user.email ?? '' },
            session.access_token,
          )
          // Fresh sign-ins also trigger a data load
          if (event === 'SIGNED_IN') {
            void loadUserData(session.user.id)
          }
        } else {
          logout()
        }
      },
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [setUser, setLoading, logout, setNickname, setOnboarded, setDailyCards])

  return <>{children}</>
}
