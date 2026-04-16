import { Navigate, Route, Routes } from 'react-router-dom'

import { Particles } from '@/components/animations/Particles'
import { AuthGuard } from '@/components/guards/AuthGuard'
import { OnboardingGuard } from '@/components/guards/OnboardingGuard'
import { PublicGuard } from '@/components/guards/PublicGuard'
import { AppLayout } from '@/components/layout/AppLayout'
import { ForgotScreen } from '@/features/auth/components/ForgotScreen'
import { LoginScreen } from '@/features/auth/components/LoginScreen'
import { SignupScreen } from '@/features/auth/components/SignupScreen'
import { DiagInfoScreen } from '@/features/diagnostic/components/DiagInfoScreen'
import { DiagResultsScreen } from '@/features/diagnostic/components/DiagResultsScreen'
import { CommitmentScreen } from '@/features/onboarding/components/CommitmentScreen'
import { ConfidenceScreen } from '@/features/onboarding/components/ConfidenceScreen'
import { PlanReadyScreen } from '@/features/onboarding/components/PlanReadyScreen'
import { PlanRevealScreen } from '@/features/onboarding/components/PlanRevealScreen'
import { TestDateScreen } from '@/features/onboarding/components/TestDateScreen'
import { TesterTypeScreen } from '@/features/onboarding/components/TesterTypeScreen'
import { ProfileTab } from '@/features/profile/components/ProfileTab'
import { CardScreen } from '@/features/session/components/CardScreen'
import { ModeSelectScreen } from '@/features/session/components/ModeSelectScreen'
import { ReviewScreen } from '@/features/session/components/ReviewScreen'

/**
 * App.tsx — Root Router
 *
 * Defines all routes for PassLounge.
 * Public routes redirect to app if authenticated.
 * App routes require auth + completed onboarding.
 * Session/diagnostic routes require auth only.
 *
 * Owner: Senior Engineer
 */

/* ─── Placeholder screens (replaced in later phases) ──────────────────── */

function HomePlaceholder() {
  return (
    <div className="placeholder-screen">
      <div className="placeholder-icon">🏠</div>
      <div className="placeholder-title">Dashboard</div>
      <div className="placeholder-sub">Your study dashboard is coming in Phase 5.</div>
    </div>
  )
}

function StudyPlaceholder() {
  return (
    <div className="placeholder-screen">
      <div className="placeholder-icon">⚡</div>
      <div className="placeholder-title">Study</div>
      <div className="placeholder-sub">Session setup and progress tracking coming in Phase 6.</div>
    </div>
  )
}

function CATPlaceholder() {
  return (
    <div className="placeholder-screen">
      <div className="placeholder-icon">🐱</div>
      <div className="placeholder-title">CAT Mode</div>
      <div className="placeholder-sub">150-question NCLEX CAT simulation<br />coming soon.</div>
    </div>
  )
}

function CompetePlaceholder() {
  return (
    <div className="placeholder-screen">
      <div className="placeholder-icon">⚔️</div>
      <div className="placeholder-title">Compete</div>
      <div className="placeholder-sub">PvP Duels, Tournaments and Leaderboard<br />being built here.</div>
    </div>
  )
}

function LoungePlaceholder() {
  return (
    <div className="placeholder-screen">
      <div className="placeholder-icon">🏆</div>
      <div className="placeholder-title">The Lounge</div>
      <div className="placeholder-sub">Victory Wall, Study Squads and TikTok share<br />being built here.</div>
    </div>
  )
}

function App() {
  return (
    <div className="app-shell">
      <div className="orb orb1" />
      <div className="orb orb2" />
      <Particles />
      <Routes>
        {/* Public auth routes — redirect to app if already signed in */}
        <Route path="/login" element={<PublicGuard><LoginScreen /></PublicGuard>} />
        <Route path="/signup" element={<PublicGuard><SignupScreen /></PublicGuard>} />
        <Route path="/forgot" element={<PublicGuard><ForgotScreen /></PublicGuard>} />

        {/* Protected routes — require authentication */}
        <Route element={<AuthGuard />}>
          {/* Onboarding flow — only accessible if NOT onboarded */}
          <Route path="/onboarding" element={<TesterTypeScreen />} />
          <Route path="/onboarding/confidence" element={<ConfidenceScreen />} />
          <Route path="/onboarding/testdate" element={<TestDateScreen />} />
          <Route path="/onboarding/commitment" element={<CommitmentScreen />} />
          <Route path="/onboarding/plan" element={<PlanRevealScreen />} />
          <Route path="/onboarding/ready" element={<PlanReadyScreen />} />

          {/* Session routes (full-screen, no BottomNav) */}
          <Route path="/session/mode" element={<ModeSelectScreen />} />
          <Route path="/session/play" element={<CardScreen />} />
          <Route path="/session/review" element={<ReviewScreen />} />

          {/* Diagnostic routes (full-screen, no BottomNav) */}
          <Route path="/diagnostic/info" element={<DiagInfoScreen />} />
          <Route path="/diagnostic/play" element={<CardScreen />} />
          <Route path="/diagnostic/results" element={<DiagResultsScreen />} />

          {/* App routes — require completed onboarding */}
          <Route element={<OnboardingGuard />}>
            <Route element={<AppLayout />}>
              <Route index element={<HomePlaceholder />} />
              <Route path="/study" element={<StudyPlaceholder />} />
              <Route path="/cat" element={<CATPlaceholder />} />
              <Route path="/compete" element={<CompetePlaceholder />} />
              <Route path="/lounge" element={<LoungePlaceholder />} />
              <Route path="/profile" element={<ProfileTab />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  )
}

export default App
