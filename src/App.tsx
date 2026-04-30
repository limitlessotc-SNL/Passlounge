import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { Particles } from '@/components/animations/Particles'
import { DevSkipButton } from '@/components/DevSkipButton'
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt'
import { trackPageView } from '@/services/analytics'
import { AuthGuard } from '@/components/guards/AuthGuard'
import { OnboardingGuard } from '@/components/guards/OnboardingGuard'
import { PublicGuard } from '@/components/guards/PublicGuard'
import { AppLayout } from '@/components/layout/AppLayout'
import { AdminAuthScreen } from '@/features/admin/AdminAuthScreen'
import { AdminDashboard } from '@/features/admin/AdminDashboard'
import { AdminGuard } from '@/features/admin/AdminGuard'
import { AdminProgressScreen } from '@/features/admin/AdminProgressScreen'
import { DesktopOnlyGate } from '@/features/admin/DesktopOnlyGate'
import { NGNBatchScreen } from '@/features/admin/NGNBatchScreen'
import { NGNCreateScreen } from '@/features/admin/NGNCreateScreen'
import { CoachDashboard } from '@/features/coach/CoachDashboard'
import { CoachGuard } from '@/features/coach/CoachGuard'
import { CoachLoginScreen } from '@/features/coach/CoachLoginScreen'
import { ForgotScreen } from '@/features/auth/components/ForgotScreen'
import { LoginScreen } from '@/features/auth/components/LoginScreen'
import { SignupScreen } from '@/features/auth/components/SignupScreen'
import { HomeTab } from '@/features/dashboard/components/HomeTab'
import { DiagInfoScreen } from '@/features/diagnostic/components/DiagInfoScreen'
import { DiagResultsScreen } from '@/features/diagnostic/components/DiagResultsScreen'
import { CATTab } from '@/features/cat/CATTab'
import { CPRAnalysisScreen } from '@/features/cpr/components/CPRAnalysisScreen'
import { CPREntryScreen } from '@/features/cpr/components/CPREntryScreen'
import { CPRReviewScreen } from '@/features/cpr/components/CPRReviewScreen'
import { AvatarScreen } from '@/features/onboarding/components/AvatarScreen'
import { CommitmentScreen } from '@/features/onboarding/components/CommitmentScreen'
import { ConfidenceScreen } from '@/features/onboarding/components/ConfidenceScreen'
import { PlanReadyScreen } from '@/features/onboarding/components/PlanReadyScreen'
import { PlanRevealScreen } from '@/features/onboarding/components/PlanRevealScreen'
import { TestDateScreen } from '@/features/onboarding/components/TestDateScreen'
import { TesterTypeScreen } from '@/features/onboarding/components/TesterTypeScreen'
import { ProfileTab } from '@/features/profile/components/ProfileTab'
import { CardReviewScreen } from '@/features/session/components/CardReviewScreen'
import { CardScreen } from '@/features/session/components/CardScreen'
import { StudyTab } from '@/features/session/components/StudyTab'
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

/* ─── Analytics ─────────────────────────────────────────────────────── */

function PageViewTracker() {
  const location = useLocation()
  useEffect(() => {
    trackPageView(location.pathname)
  }, [location.pathname])
  return null
}

/* ─── Placeholder screens (replaced in later phases) ──────────────────── */

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
  const location = useLocation()
  // Admin routes use a full-width shell (the .app-shell mobile clamp would
  // crush admin tables) and skip the student-app decorations.
  const isAdmin = location.pathname.startsWith('/admin')
  const isCoach = location.pathname.startsWith('/coach')
  const isStaffArea = isAdmin || isCoach

  return (
    <div className={isStaffArea ? 'admin-shell' : 'app-shell'}>
      {!isStaffArea && (
        <>
          <div className="orb orb1" />
          <div className="orb orb2" />
          <Particles />
          <DevSkipButton />
        </>
      )}
      <PWAInstallPrompt />
      <PageViewTracker />
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
          <Route path="/onboarding/avatar" element={<AvatarScreen />} />
          <Route path="/onboarding/plan" element={<PlanRevealScreen />} />
          <Route path="/onboarding/ready" element={<PlanReadyScreen />} />

          {/* Session routes (full-screen, no BottomNav) */}
          <Route path="/session/mode" element={<ModeSelectScreen />} />
          <Route path="/session/play" element={<CardScreen />} />
          <Route path="/session/review" element={<ReviewScreen />} />
          <Route path="/session/review-card/:cardIdx" element={<CardReviewScreen />} />

          {/* Diagnostic routes (full-screen, no BottomNav) */}
          <Route path="/diagnostic/info" element={<DiagInfoScreen />} />
          <Route path="/diagnostic/play" element={<CardScreen />} />
          <Route path="/diagnostic/results" element={<DiagResultsScreen />} />

          {/* CPR routes (full-screen, accept ?from=onboarding) */}
          <Route path="/cpr/entry" element={<CPREntryScreen />} />
          <Route path="/cpr/review" element={<CPRReviewScreen />} />
          <Route path="/cpr/analysis" element={<CPRAnalysisScreen />} />

          {/* App routes — require completed onboarding */}
          <Route element={<OnboardingGuard />}>
            <Route element={<AppLayout />}>
              <Route index element={<HomeTab />} />
              <Route path="/study" element={<StudyTab />} />
              <Route path="/cat" element={<CATTab />} />
              <Route path="/compete" element={<CompetePlaceholder />} />
              <Route path="/lounge" element={<LoungePlaceholder />} />
              <Route path="/profile" element={<ProfileTab />} />
            </Route>
          </Route>
        </Route>

        {/* Admin routes — outside AuthGuard. AdminAuthScreen handles its
            own "must be signed in" redirect; AdminGuard wraps the rest
            and enforces is_admin + valid in-memory session. */}
        <Route element={<DesktopOnlyGate />}>
          <Route path="/admin/auth" element={<AdminAuthScreen />} />
          <Route element={<AdminGuard />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/progress" element={<AdminProgressScreen />} />
            <Route path="/admin/ngn/create" element={<NGNCreateScreen />} />
            <Route path="/admin/ngn/batch" element={<NGNBatchScreen />} />
          </Route>
        </Route>

        {/* Coach (SNL Educator) routes — entirely separate from the student
            app. /coach/login is public; everything else is wrapped by
            CoachGuard which checks the coaches table via Supabase. */}
        <Route element={<DesktopOnlyGate />}>
          <Route path="/coach/login" element={<CoachLoginScreen />} />
          <Route element={<CoachGuard />}>
            <Route path="/coach" element={<CoachDashboard />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  )
}

export default App
