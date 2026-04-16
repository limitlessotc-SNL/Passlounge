import { Navigate, Route, Routes } from 'react-router-dom'

import { Particles } from '@/components/animations/Particles'
import { AuthGuard } from '@/components/guards/AuthGuard'
import { AppLayout } from '@/components/layout/AppLayout'
import { ForgotScreen } from '@/features/auth/components/ForgotScreen'
import { LoginScreen } from '@/features/auth/components/LoginScreen'
import { SignupScreen } from '@/features/auth/components/SignupScreen'
import { CommitmentScreen } from '@/features/onboarding/components/CommitmentScreen'
import { ConfidenceScreen } from '@/features/onboarding/components/ConfidenceScreen'
import { PlanReadyScreen } from '@/features/onboarding/components/PlanReadyScreen'
import { PlanRevealScreen } from '@/features/onboarding/components/PlanRevealScreen'
import { TestDateScreen } from '@/features/onboarding/components/TestDateScreen'
import { TesterTypeScreen } from '@/features/onboarding/components/TesterTypeScreen'
import { CardScreen } from '@/features/session/components/CardScreen'
import { ModeSelectScreen } from '@/features/session/components/ModeSelectScreen'
import { ReviewScreen } from '@/features/session/components/ReviewScreen'

/**
 * App.tsx — Root Router
 *
 * Defines all routes for PassLounge.
 * Auth routes, onboarding routes, and protected app routes.
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

function ProfilePlaceholder() {
  return (
    <div className="placeholder-screen">
      <div className="placeholder-icon">👤</div>
      <div className="placeholder-title">Profile</div>
      <div className="placeholder-sub">Your profile and settings coming in Phase 6.</div>
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
        {/* Public auth routes */}
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/signup" element={<SignupScreen />} />
        <Route path="/forgot" element={<ForgotScreen />} />

        {/* Protected routes */}
        <Route element={<AuthGuard />}>
          {/* Onboarding flow (5 steps + plan ready) */}
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

          {/* App routes with BottomNav */}
          <Route element={<AppLayout />}>
            <Route index element={<HomePlaceholder />} />
            <Route path="/study" element={<StudyPlaceholder />} />
            <Route path="/cat" element={<CATPlaceholder />} />
            <Route path="/compete" element={<CompetePlaceholder />} />
            <Route path="/lounge" element={<LoungePlaceholder />} />
            <Route path="/profile" element={<ProfilePlaceholder />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  )
}

export default App
