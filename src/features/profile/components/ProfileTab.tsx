/**
 * ProfileTab
 *
 * Profile screen with nickname, settings, edit mode, and sign out button.
 * Edit mode: nickname, test date, daily commitment — saved to studentStore
 * and persisted to Supabase (students table + auth metadata).
 *
 * Owner: Junior Engineer 2
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AVATAR_OPTIONS, getAvatarDisplay } from '@/config/avatars'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  getStudentCohort,
  joinCohortByCode,
  type StudentCohortMembership,
} from '@/features/coach/coach.service'
import {
  saveOnboardingToAuth,
  upsertStudent,
} from '@/features/onboarding/services/student.service'
import { useAuthStore } from '@/store/authStore'
import { useStudentStore } from '@/store/studentStore'
import type { ConfidenceLevel, TesterType } from '@/types'
import { isDevSession } from '@/utils/devMode'

const DAILY_PRESETS = [25, 35, 50] as const

function computeDaysUntil(dateStr: string): number {
  const today = new Date()
  const target = new Date(dateStr + 'T00:00:00')
  const diffMs = target.getTime() - today.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

function formatProjectedDate(dailyCards: number): string {
  const daysNeeded = Math.ceil(2000 / dailyCards)
  const projDate = new Date()
  projDate.setDate(projDate.getDate() + daysNeeded)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[projDate.getMonth()]} ${projDate.getDate()}, ${projDate.getFullYear()}`
}

export function ProfileTab() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const user = useAuthStore((s) => s.user)
  const supaStudentId = useAuthStore((s) => s.supaStudentId)
  const nickname = useStudentStore((s) => s.nickname)
  const dailyCards = useStudentStore((s) => s.dailyCards)
  const testDate = useStudentStore((s) => s.testDate)
  const testerType = useStudentStore((s) => s.testerType)
  const confidence = useStudentStore((s) => s.confidence)
  const avatar = useStudentStore((s) => s.avatar)
  const setNickname = useStudentStore((s) => s.setNickname)
  const setDailyCards = useStudentStore((s) => s.setDailyCards)
  const setTestDate = useStudentStore((s) => s.setTestDate)
  const setAvatar = useStudentStore((s) => s.setAvatar)

  const [isEditing, setIsEditing] = useState(false)
  const [draftNickname, setDraftNickname] = useState(nickname)
  const [draftDailyCards, setDraftDailyCards] = useState(dailyCards)
  const [draftTestDate, setDraftTestDate] = useState(testDate ?? '')
  const [draftAvatar, setDraftAvatar] = useState(avatar)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cohort membership panel state
  const [cohortMembership, setCohortMembership] = useState<StudentCohortMembership | null>(null)
  const [cohortLoaded, setCohortLoaded]         = useState(false)
  const [cohortCodeInput, setCohortCodeInput]   = useState('')
  const [joinSubmitting, setJoinSubmitting]     = useState(false)
  const [joinError, setJoinError]               = useState<string | null>(null)

  // Load current cohort membership on mount.
  useEffect(() => {
    if (!supaStudentId || isDevSession()) {
      setCohortLoaded(true)
      return
    }
    let cancelled = false
    getStudentCohort(supaStudentId)
      .then(m => { if (!cancelled) setCohortMembership(m) })
      .catch(() => { /* ignore — empty state handles missing data */ })
      .finally(() => { if (!cancelled) setCohortLoaded(true) })
    return () => { cancelled = true }
  }, [supaStudentId])

  async function handleJoinCohort() {
    if (!supaStudentId || !cohortCodeInput.trim()) return
    setJoinSubmitting(true)
    setJoinError(null)
    try {
      const cohort = await joinCohortByCode(cohortCodeInput.trim(), supaStudentId)
      // Re-fetch to get coach name + cohort row from authoritative source.
      const fresh = await getStudentCohort(supaStudentId)
      setCohortMembership(fresh ?? { cohort, coachName: 'Coach' })
      setCohortCodeInput('')
    } catch (e) {
      const msg = (e as Error).message
      setJoinError(/Invalid code|not found/i.test(msg) ? 'Invalid code' : msg)
    } finally {
      setJoinSubmitting(false)
    }
  }

  // Hidden /admin/auth trigger: 7 taps within 2s of each other on the
  // avatar circle. Refs (not state) so taps never re-render. Timer is
  // cleared on unmount and after a successful navigation. The trigger is
  // intentionally undiscoverable — no aria-label, role, cursor hint, or
  // tooltip pointing at admin.
  const tapCountRef   = useRef(0)
  const lastTapAtRef  = useRef(0)
  const resetTimerRef = useRef<number | null>(null)
  const [trigFlash, setTrigFlash] = useState(false)

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current)
        resetTimerRef.current = null
      }
    }
  }, [])

  const handleSecretTap = () => {
    const now = Date.now()
    if (now - lastTapAtRef.current > 2000) {
      tapCountRef.current = 0
    }
    tapCountRef.current += 1
    lastTapAtRef.current = now

    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current)
    resetTimerRef.current = window.setTimeout(() => {
      tapCountRef.current = 0
      lastTapAtRef.current = 0
      resetTimerRef.current = null
    }, 2000)

    if (tapCountRef.current >= 7) {
      tapCountRef.current = 0
      lastTapAtRef.current = 0
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current)
        resetTimerRef.current = null
      }
      setTrigFlash(true)
      window.setTimeout(() => {
        setTrigFlash(false)
        navigate('/admin/auth')
      }, 180)
    }
  }

  const avatarDisplay = getAvatarDisplay(avatar, nickname)
  const draftAvatarDisplay = getAvatarDisplay(draftAvatar, draftNickname)

  const handleEdit = () => {
    setDraftNickname(nickname)
    setDraftDailyCards(dailyCards)
    setDraftTestDate(testDate ?? '')
    setDraftAvatar(avatar)
    setError(null)
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setError(null)
  }

  const handleSave = async () => {
    if (!supaStudentId) {
      setError('Not signed in.')
      return
    }

    const trimmedNickname = draftNickname.trim() || 'Nurse'
    const newTestDate = draftTestDate || null
    const newTestDays = newTestDate ? Math.max(computeDaysUntil(newTestDate), 0) : 0

    setSaving(true)
    setError(null)

    // Dev sessions have no real auth token — skip Supabase, update locally only
    if (isDevSession()) {
      setNickname(trimmedNickname)
      setDailyCards(draftDailyCards)
      setTestDate(newTestDate, newTestDays)
      setAvatar(draftAvatar)
      setIsEditing(false)
      setSaving(false)
      return
    }

    try {
      // Persist to Supabase students table
      await upsertStudent({
        id: supaStudentId,
        nickname: trimmedNickname,
        tester_type: (testerType ?? 'first_time') as TesterType,
        confidence: (confidence ?? 'unsure') as ConfidenceLevel,
        test_date: newTestDate,
        daily_cards: draftDailyCards,
        onboarded: true,
      })

      // Update auth metadata (so session restore has the latest values)
      await saveOnboardingToAuth({
        nickname: trimmedNickname,
        onboarded: true,
        tester_type: testerType ?? 'first_time',
        confidence: confidence ?? 'unsure',
        daily_cards: draftDailyCards,
        avatar: draftAvatar,
      })

      // Update local stores
      setNickname(trimmedNickname)
      setDailyCards(draftDailyCards)
      setTestDate(newTestDate, newTestDays)
      setAvatar(draftAvatar)

      setIsEditing(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div style={{ paddingTop: 20 }}>
      <div className="anim" style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 20 }}>
        Profile
      </div>

      {/* Avatar + name + email */}
      <div className="anim" style={{ animationDelay: '0.05s', display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, marginBottom: 20 }}>
        <div
          data-testid="profile-avatar"
          onClick={handleSecretTap}
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'linear-gradient(135deg,#053571,#0a4d99)',
            border: trigFlash ? '2px solid rgba(245,197,24,1)' : '2px solid rgba(245,197,24,0.4)',
            boxShadow: trigFlash ? '0 0 14px rgba(245,197,24,0.7)' : 'none',
            transition: 'box-shadow 140ms ease, border-color 140ms ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 26,
            fontWeight: 900,
            color: '#F5C518',
            flexShrink: 0,
          }}
        >
          {avatarDisplay}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Nurse {nickname || 'Nurse'}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{user?.email ?? ''}</div>
        </div>
      </div>

      {/* Settings card — VIEW MODE */}
      {!isEditing && (
        <div className="anim" style={{ animationDelay: '0.1s', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 2 }}>Nickname</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Nurse {nickname || 'Nurse'}</div>
          </div>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 2 }}>Daily Commitment</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#F5C518' }}>{dailyCards} cards/day</div>
          </div>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 2 }}>Test Date</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{testDate || 'Not set'}</div>
          </div>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 2 }}>Projected Test-Ready</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{formatProjectedDate(dailyCards)}</div>
          </div>
        </div>
      )}

      {/* Edit button — VIEW MODE */}
      {!isEditing && (
        <div className="anim" style={{ animationDelay: '0.12s', marginBottom: 20 }}>
          <button className="btn-ghost" onClick={handleEdit}>
            Edit Profile
          </button>
        </div>
      )}

      {/* Settings card — EDIT MODE */}
      {isEditing && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(245,197,24,0.2)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
          {/* Avatar preview + picker */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>
              Avatar
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div
                aria-label="Avatar preview"
                style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#053571,#0a4d99)', border: '2px solid rgba(245,197,24,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#F5C518', flexShrink: 0 }}
              >
                {draftAvatarDisplay}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                Tap an option below to change.
              </div>
            </div>
            <div
              role="radiogroup"
              aria-label="Choose an avatar"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}
            >
              {AVATAR_OPTIONS.map((opt) => {
                const selected = draftAvatar === opt.id
                const content = opt.emoji ?? (draftNickname || 'N').charAt(0).toUpperCase()
                return (
                  <button
                    key={opt.id || 'default'}
                    role="radio"
                    aria-checked={selected}
                    aria-label={opt.label}
                    type="button"
                    onClick={() => setDraftAvatar(opt.id)}
                    style={{
                      aspectRatio: '1 / 1',
                      borderRadius: 12,
                      background: selected ? 'rgba(245,197,24,0.12)' : 'rgba(255,255,255,0.04)',
                      border: selected ? '2px solid rgba(245,197,24,0.8)' : '1.5px solid rgba(255,255,255,0.08)',
                      color: opt.emoji ? '#fff' : '#F5C518',
                      fontSize: 22,
                      fontWeight: 800,
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {content}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Nickname */}
          <label style={{ display: 'block', marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 }}>
              Nickname
            </div>
            <input
              className="pl-input"
              type="text"
              maxLength={20}
              value={draftNickname}
              onChange={(e) => setDraftNickname(e.target.value)}
              placeholder="Nurse Keisha"
            />
          </label>

          {/* Daily commitment presets + custom */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 }}>
              Daily Commitment
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {DAILY_PRESETS.map((n) => (
                <button
                  key={n}
                  className={`q-count-btn${draftDailyCards === n ? ' selected' : ''}`}
                  onClick={() => setDraftDailyCards(n)}
                  type="button"
                >
                  {n}
                </button>
              ))}
              <input
                className="pl-input"
                type="number"
                min={1}
                max={200}
                value={draftDailyCards}
                onChange={(e) => setDraftDailyCards(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ width: 80, marginBottom: 0 }}
                aria-label="Custom daily commitment"
              />
            </div>
          </div>

          {/* Test date */}
          <label style={{ display: 'block', marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 }}>
              Test Date (optional)
            </div>
            <input
              className="pl-input"
              type="date"
              value={draftTestDate}
              onChange={(e) => setDraftTestDate(e.target.value)}
              aria-label="Test date"
            />
          </label>

          {error && (
            <p className="err-msg" style={{ marginBottom: 10 }}>{error}</p>
          )}

          {/* Save / Cancel */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-ghost"
              onClick={handleCancel}
              disabled={saving}
              style={{ marginBottom: 0, flex: 1 }}
              type="button"
            >
              Cancel
            </button>
            <button
              className="btn-gold"
              onClick={() => void handleSave()}
              disabled={saving}
              style={{ marginBottom: 0, flex: 2 }}
              type="button"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* CPR re-upload — repeat testers only, view mode only */}
      {!isEditing && testerType === 'repeat' && (
        <div className="anim" style={{ animationDelay: '0.13s', marginBottom: 12 }}>
          <button
            className="btn-ghost"
            onClick={() => navigate('/cpr/entry')}
            type="button"
            style={{ marginBottom: 0 }}
          >
            Update CPR Report
          </button>
        </div>
      )}

      {/* Cohort membership */}
      {!isEditing && cohortLoaded && (
        <div
          data-testid="cohort-section"
          className="anim"
          style={{
            animationDelay: '0.14s',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '14px 16px',
            marginBottom: 12,
          }}
        >
          <div style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase' as const,
            letterSpacing: 1,
            marginBottom: 8,
            fontWeight: 700,
          }}>
            Cohort
          </div>
          {cohortMembership ? (
            <div data-testid="cohort-membership" style={{ fontSize: 14, color: '#fff' }}>
              You are in:{' '}
              <strong style={{ color: '#F5C518' }}>{cohortMembership.cohort.name}</strong>
              {' — '}
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                {cohortMembership.coachName}
              </span>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>
                Have a cohort code from your educator? Enter it to join.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="pl-input"
                  value={cohortCodeInput}
                  onChange={(e) => setCohortCodeInput(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="ABC123"
                  maxLength={6}
                  aria-label="Cohort code"
                  style={{
                    flex: 1,
                    marginBottom: 0,
                    fontFamily: 'monospace',
                    letterSpacing: 3,
                    textTransform: 'uppercase' as const,
                  }}
                />
                <button
                  type="button"
                  className="btn-gold"
                  onClick={() => void handleJoinCohort()}
                  disabled={joinSubmitting || cohortCodeInput.trim().length < 4}
                  data-testid="join-cohort-btn"
                  style={{ marginBottom: 0, paddingLeft: 18, paddingRight: 18 }}
                >
                  {joinSubmitting ? 'Joining…' : 'Join'}
                </button>
              </div>
              {joinError && (
                <div
                  data-testid="cohort-join-error"
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: 'rgba(248,113,113,0.95)',
                  }}
                >
                  {joinError}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Coming soon */}
      <div className="anim" style={{ animationDelay: '0.15s', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '14px 16px', marginBottom: 12, textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
        Badges, XP history &amp; weakness map<br />
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>Coming soon</span>
      </div>

      {/* Sign out */}
      <div className="anim" style={{ animationDelay: '0.2s' }}>
        <button
          onClick={() => void handleSignOut()}
          style={{ width: '100%', padding: 14, background: 'rgba(220,38,38,0.08)', border: '1.5px solid rgba(220,38,38,0.25)', borderRadius: 14, color: 'rgba(248,113,113,0.8)', fontSize: 14, fontWeight: 700, fontFamily: "'Outfit',sans-serif", cursor: 'pointer' }}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
