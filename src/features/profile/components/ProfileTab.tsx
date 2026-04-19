/**
 * ProfileTab
 *
 * Profile screen with nickname, settings, edit mode, and sign out button.
 * Edit mode: nickname, test date, daily commitment — saved to studentStore
 * and persisted to Supabase (students table + auth metadata).
 *
 * Owner: Junior Engineer 2
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  saveOnboardingToAuth,
  upsertStudent,
} from '@/features/onboarding/services/student.service'
import { useAuthStore } from '@/store/authStore'
import { useStudentStore } from '@/store/studentStore'
import type { ConfidenceLevel, TesterType } from '@/types'

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
  const setNickname = useStudentStore((s) => s.setNickname)
  const setDailyCards = useStudentStore((s) => s.setDailyCards)
  const setTestDate = useStudentStore((s) => s.setTestDate)

  const [isEditing, setIsEditing] = useState(false)
  const [draftNickname, setDraftNickname] = useState(nickname)
  const [draftDailyCards, setDraftDailyCards] = useState(dailyCards)
  const [draftTestDate, setDraftTestDate] = useState(testDate ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initial = (nickname || 'N').charAt(0).toUpperCase()

  const handleEdit = () => {
    setDraftNickname(nickname)
    setDraftDailyCards(dailyCards)
    setDraftTestDate(testDate ?? '')
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
      })

      // Update local stores
      setNickname(trimmedNickname)
      setDailyCards(draftDailyCards)
      setTestDate(newTestDate, newTestDays)

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
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#053571,#0a4d99)', border: '2px solid rgba(245,197,24,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: '#F5C518', flexShrink: 0 }}>
          {initial}
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
