/**
 * DevSkipButton
 *
 * Development-only button that bypasses auth/onboarding and jumps
 * straight to the dashboard with mock data pre-loaded.
 *
 * Only rendered when import.meta.env.DEV is true (Vite dev mode).
 * Never included in production builds.
 *
 * Owner: Senior Engineer
 */

import { useNavigate } from 'react-router-dom'

import { DIAGNOSTIC_CARDS } from '@/config/fallback-cards'
import { useAuthStore } from '@/store/authStore'
import { useDashboardStore } from '@/store/dashboardStore'
import { useStudentStore } from '@/store/studentStore'

interface DevSkipButtonProps {
  /** Override for tests — if false, button never renders. */
  enabled?: boolean;
}

export function DevSkipButton({ enabled = import.meta.env.DEV }: DevSkipButtonProps) {
  const navigate = useNavigate()

  if (!enabled) return null

  const handleSkip = () => {
    // Mock authenticated user
    useAuthStore.getState().setUser(
      { id: 'dev-user-id', email: 'dev@passlounge.local' },
      'dev-mock-token',
    )
    useAuthStore.getState().setLoading(false)

    // Mock onboarded student profile
    useStudentStore.setState({
      nickname: 'Dev',
      testerType: 'first_time',
      confidence: 'confident',
      testDays: 60,
      testDate: null,
      dailyCards: 35,
      onboarded: true,
    })

    // Mock diagnostic results (10/15 = 67%, CAT level 2.5)
    const mockResults: (boolean | undefined)[] = DIAGNOSTIC_CARDS.map((_, i) => i < 10)
    useDashboardStore.setState({
      diagnosticResult: {
        completed: true,
        correct: 10,
        total: 15,
        catLevel: '2.5',
        results: mockResults,
      },
      plStats: { cards: 45, xp: 950, sessions: 3 },
      streakDays: 4,
    })

    navigate('/')
  }

  return (
    <button
      className="dev-btn"
      onClick={handleSkip}
      title="Dev: skip to dashboard with mock data"
    >
      DEV
    </button>
  )
}
