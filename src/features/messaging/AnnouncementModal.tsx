// src/features/messaging/AnnouncementModal.tsx
//
// Modal for coaches to broadcast a cohort-wide announcement. Posts to the
// `announcements` archive table AND fans out one inbox `messages` row per
// active student so it shows up in their /inbox.

import { useEffect, useState } from 'react'

import { getCohortStudents } from '@/features/coach/coach.service'
import type { Cohort } from '@/features/coach/coach.types'
import { trackEvent } from '@/services/analytics'

import { sendAnnouncement } from './messaging.service'

const GOLD = '#F5C518'
const RED  = 'rgba(248,113,113,0.95)'

interface Props {
  coachAuthId: string
  cohorts:     Cohort[]
  onClose:     () => void
  onSent:      () => void
}

export function AnnouncementModal({ coachAuthId, cohorts, onClose, onSent }: Props) {
  const activeCohorts = cohorts.filter(c => c.is_active)
  const [cohortId, setCohortId]   = useState<string>(activeCohorts[0]?.id ?? '')
  const [title, setTitle]         = useState('')
  const [body, setBody]           = useState('')
  const [pinned, setPinned]       = useState(false)
  const [studentCount, setStudentCount] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  // Re-count active students whenever the selected cohort changes so the
  // "Will send to X students" preview is honest.
  useEffect(() => {
    if (!cohortId) { setStudentCount(0); return }
    let cancelled = false
    ;(async () => {
      try {
        const members = await getCohortStudents(cohortId)
        if (!cancelled) setStudentCount(members.filter(m => m.status === 'active').length)
      } catch {
        if (!cancelled) setStudentCount(null)
      }
    })()
    return () => { cancelled = true }
  }, [cohortId])

  async function handleSend() {
    if (!title.trim() || !body.trim() || !cohortId) return
    setSubmitting(true)
    setError(null)
    try {
      const { studentCount: sent } = await sendAnnouncement(
        coachAuthId, cohortId, title.trim(), body.trim(), pinned,
      )
      trackEvent('announcement_sent', { cohort_id: cohortId, student_count: sent })
      onSent()
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div
        data-testid="announcement-backdrop"
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 60 }}
      />
      <div
        data-testid="announcement-modal"
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(480px, 100vw)',
          background: '#0a1629',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 18,
          padding: 24,
          color: '#fff',
          fontFamily: "'Outfit', 'Inter', sans-serif",
          zIndex: 70,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.45)',
          fontWeight: 700,
        }}>
          📢 New announcement
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Broadcast to cohort</h1>

        {activeCohorts.length > 1 && (
          <Field label="Cohort">
            <select
              value={cohortId}
              onChange={(e) => setCohortId(e.target.value)}
              aria-label="Cohort"
              style={{ ...inputStyle(), cursor: 'pointer' }}
            >
              {activeCohorts.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Announcement title"
            placeholder="e.g. Schedule change for Friday"
            style={inputStyle()}
          />
        </Field>

        <Field label="Body">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            aria-label="Announcement body"
            placeholder="Tell your students…"
            style={{ ...inputStyle(), minHeight: 120, resize: 'vertical' as const }}
          />
        </Field>

        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: 'rgba(255,255,255,0.7)',
        }}>
          <input
            type="checkbox"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
            aria-label="Pin announcement"
            style={{ accentColor: GOLD }}
          />
          Pin to top
        </label>

        <div data-testid="recipient-count" style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
          {studentCount !== null
            ? `Will send to ${studentCount} student${studentCount === 1 ? '' : 's'}`
            : 'Counting recipients…'}
        </div>

        {error && (
          <div data-testid="announcement-error" style={{
            background: 'rgba(248,113,113,0.10)',
            border: '1px solid rgba(248,113,113,0.4)',
            borderRadius: 10,
            padding: '8px 10px',
            color: RED,
            fontSize: 12,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={submitting || !title.trim() || !body.trim() || !cohortId}
            data-testid="send-announcement-btn"
            style={{
              flex: 2,
              padding: '10px 14px',
              borderRadius: 12,
              background: GOLD,
              color: '#053571',
              border: 'none',
              fontSize: 13,
              fontWeight: 800,
              cursor: submitting || !title.trim() || !body.trim() ? 'default' : 'pointer',
              fontFamily: "'Outfit', sans-serif",
              opacity: submitting || !title.trim() || !body.trim() ? 0.5 : 1,
            }}
          >
            {submitting ? 'Sending…' : 'Send to all students'}
          </button>
        </div>
      </div>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: 'rgba(255,255,255,0.5)',
        fontWeight: 700,
        marginBottom: 4,
      }}>
        {label}
      </span>
      {children}
    </label>
  )
}

function inputStyle(): React.CSSProperties {
  return {
    padding: '10px 12px',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: 14,
    fontFamily: "'Outfit', sans-serif",
    outline: 'none',
  }
}
