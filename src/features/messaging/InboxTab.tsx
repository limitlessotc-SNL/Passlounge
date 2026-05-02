// src/features/messaging/InboxTab.tsx
//
// Student-facing inbox at /inbox. The student sees:
//   • Empty state if they're not in a cohort
//   • Pinned-style announcements section (collapsible)
//   • A linear conversation thread with their cohort's coach
//   • A compose box at the bottom
//
// Polls every 30s and marks all unread messages as read once on mount.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { getStudentCohort, type StudentCohortMembership } from '@/features/coach/coach.service'
import { trackEvent } from '@/services/analytics'
import { useAuthStore } from '@/store/authStore'

import {
  fetchAnnouncements,
  fetchConversationWithCoach,
  fetchStudentInbox,
  markMessagesAsRead,
  sendMessageToCoach,
} from './messaging.service'
import type { Message } from './messaging.types'
import { supabase } from '@/config/supabase'

const GOLD = '#F5C518'
const RED  = 'rgba(248,113,113,0.95)'
const POLL_MS = 30_000

export function InboxTab() {
  const studentId = useAuthStore((s) => s.supaStudentId)

  const [cohortLoaded, setCohortLoaded] = useState(false)
  const [cohort, setCohort]             = useState<StudentCohortMembership | null>(null)
  const [coachAuthId, setCoachAuthId]   = useState<string | null>(null)
  const [thread, setThread]             = useState<Message[]>([])
  const [announcements, setAnnouncements] = useState<Message[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)

  const [draft, setDraft]               = useState('')
  const [sending, setSending]           = useState(false)

  // Fire inbox_opened once on first mount.
  useEffect(() => {
    trackEvent('inbox_opened')
  }, [])

  // Resolve cohort + coach auth_id once. The coach.service.getStudentCohort
  // already gives us the cohort + coach name; we look up auth_id separately
  // because messages.recipient_id is auth.users(id), not coaches.id.
  useEffect(() => {
    if (!studentId) {
      setCohortLoaded(true)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const m = await getStudentCohort(studentId)
        if (cancelled) return
        setCohort(m)
        if (m) {
          const { data } = await supabase
            .from('coaches')
            .select('auth_id')
            .eq('id', m.cohort.coach_id)
            .maybeSingle()
          if (!cancelled) setCoachAuthId((data as { auth_id: string } | null)?.auth_id ?? null)
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setCohortLoaded(true)
      }
    })()
    return () => { cancelled = true }
  }, [studentId])

  // Load + poll inbox + announcements.
  useEffect(() => {
    if (!studentId || !coachAuthId || !cohort) return
    let cancelled = false
    const refresh = async () => {
      try {
        const [thr, ann, full] = await Promise.all([
          fetchConversationWithCoach(studentId, coachAuthId),
          fetchAnnouncements(cohort.cohort.id),
          fetchStudentInbox(studentId),
        ])
        if (cancelled) return
        setThread(thr)
        setAnnouncements(ann)
        setLoading(false)

        // Mark anything addressed to me as read.
        const unread = full
          .filter(m => m.recipient_id === studentId && m.read_at === null)
          .map(m => m.id)
        if (unread.length > 0) {
          void markMessagesAsRead(unread)
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      }
    }
    void refresh()
    const id = window.setInterval(refresh, POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [studentId, coachAuthId, cohort])

  async function handleSend() {
    if (!draft.trim() || !coachAuthId || !cohort || sending) return
    setSending(true)
    setError(null)
    try {
      await sendMessageToCoach({
        recipient_id: coachAuthId,
        body: draft.trim(),
        cohort_id: cohort.cohort.id,
      })
      trackEvent('message_sent', { recipient_type: 'coach' })
      setDraft('')
      // Optimistically reload the thread.
      const fresh = await fetchConversationWithCoach(studentId!, coachAuthId)
      setThread(fresh)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────

  if (!cohortLoaded) {
    return (
      <div data-testid="inbox-loading" style={{ padding: 24, color: 'rgba(255,255,255,0.5)' }}>
        Loading…
      </div>
    )
  }

  if (!cohort) {
    return (
      <div data-testid="inbox-empty-no-cohort" style={containerStyle()}>
        <Header />
        <div style={emptyStateStyle()}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
            Join a cohort to message your coach
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '8px 0 16px', lineHeight: 1.55 }}>
            Add your cohort code in Profile → Join a Cohort.
          </p>
          <Link
            to="/profile"
            data-testid="inbox-go-profile"
            style={{
              padding: '10px 18px',
              borderRadius: 12,
              background: GOLD,
              color: '#053571',
              fontSize: 14,
              fontWeight: 800,
              textDecoration: 'none',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            Open Profile
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="inbox-tab" style={containerStyle()}>
      <Header subtitle={`${cohort.cohort.name} · ${cohort.coachName}`} />

      {error && (
        <div data-testid="inbox-error" style={errorStyle()}>{error}</div>
      )}

      {announcements.length > 0 && (
        <Announcements items={announcements} />
      )}

      <ThreadList loading={loading} thread={thread} myId={studentId ?? ''} />

      <Composer
        draft={draft}
        onChange={setDraft}
        onSend={handleSend}
        disabled={!coachAuthId || sending}
        sending={sending}
      />
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────

function Header({ subtitle }: { subtitle?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 11,
        textTransform: 'uppercase' as const,
        letterSpacing: 2,
        color: 'rgba(255,255,255,0.45)',
        fontWeight: 700,
      }}>
        Messages
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: '4px 0 0' }}>Inbox</h1>
      {subtitle && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}

function Announcements({ items }: { items: Message[] }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <section
      data-testid="inbox-announcements"
      style={{
        background: 'rgba(245,197,24,0.06)',
        border: '1px solid rgba(245,197,24,0.3)',
        borderRadius: 14,
        marginBottom: 14,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        data-testid="announcements-toggle"
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          color: GOLD,
          fontSize: 12,
          fontWeight: 800,
          textAlign: 'left' as const,
          padding: '10px 14px',
          cursor: 'pointer',
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        📢 {items.length} announcement{items.length === 1 ? '' : 's'} · {expanded ? 'Hide' : 'Show'}
      </button>
      {expanded && (
        <div style={{ padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(a => <AnnouncementItem key={a.id} a={a} />)}
        </div>
      )}
    </section>
  )
}

function AnnouncementItem({ a }: { a: Message }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 10,
      padding: 10,
    }}>
      <div style={{ fontSize: 13, fontWeight: 800 }}>{a.subject || 'Announcement'}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: '2px 0 6px' }}>
        {a.sender_name ?? 'Coach'} · {formatTs(a.created_at)}
      </div>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.85)',
          lineHeight: 1.5,
          cursor: 'pointer',
          maxHeight: open ? 'none' : 40,
          overflow: 'hidden' as const,
          display: open ? 'block' as const : '-webkit-box',
          WebkitLineClamp: open ? undefined : 2,
          WebkitBoxOrient: 'vertical' as const,
        }}
      >
        {a.body}
      </div>
    </div>
  )
}

function ThreadList({ loading, thread, myId }: { loading: boolean; thread: Message[]; myId: string }) {
  if (loading) {
    return <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, padding: 12 }}>Loading messages…</div>
  }
  if (thread.length === 0) {
    return (
      <div data-testid="inbox-empty-thread" style={{
        padding: 16,
        background: 'rgba(255,255,255,0.03)',
        border: '1px dashed rgba(255,255,255,0.15)',
        borderRadius: 12,
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
        textAlign: 'center' as const,
        marginBottom: 12,
      }}>
        No messages yet. Say hi to your coach below.
      </div>
    )
  }
  return (
    <div data-testid="inbox-thread" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
      {thread.map(m => <MessageBubble key={m.id} m={m} mine={m.sender_id === myId} />)}
    </div>
  )
}

function MessageBubble({ m, mine }: { m: Message; mine: boolean }) {
  const unread = !mine && m.read_at === null
  return (
    <div style={{ alignSelf: mine ? 'flex-end' as const : 'flex-start' as const, maxWidth: '85%' }}>
      <div style={{
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
        marginBottom: 2,
        textAlign: mine ? 'right' as const : 'left' as const,
      }}>
        {m.sender_name ?? (mine ? 'You' : 'Coach')} · {formatTs(m.created_at)}
      </div>
      <div style={{
        background: mine ? 'rgba(245,197,24,0.10)' : 'rgba(255,255,255,0.05)',
        border: mine
          ? '1px solid rgba(245,197,24,0.4)'
          : `1px solid ${unread ? GOLD : 'rgba(255,255,255,0.08)'}`,
        borderLeft: unread ? `3px solid ${GOLD}` : undefined,
        borderRadius: 12,
        padding: '8px 12px',
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap' as const,
      }}>
        {m.body}
      </div>
    </div>
  )
}

interface ComposerProps {
  draft: string
  onChange: (v: string) => void
  onSend: () => void
  disabled: boolean
  sending: boolean
}

function Composer({ draft, onChange, onSend, disabled, sending }: ComposerProps) {
  return (
    <div
      data-testid="inbox-composer"
      style={{
        position: 'sticky' as const,
        bottom: 0,
        background: 'rgba(10,22,41,0.95)',
        padding: '10px 0',
        display: 'flex',
        gap: 8,
      }}
    >
      <textarea
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Message your coach…"
        aria-label="New message"
        disabled={disabled}
        style={{
          flex: 1,
          minHeight: 60,
          padding: '10px 12px',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#fff',
          fontSize: 14,
          fontFamily: "'Outfit', sans-serif",
          resize: 'vertical' as const,
          outline: 'none',
        }}
      />
      <button
        type="button"
        onClick={onSend}
        disabled={disabled || !draft.trim()}
        data-testid="inbox-send-btn"
        style={{
          padding: '0 16px',
          borderRadius: 12,
          background: GOLD,
          color: '#053571',
          border: 'none',
          fontSize: 14,
          fontWeight: 800,
          cursor: disabled || !draft.trim() ? 'default' : 'pointer',
          opacity: disabled || !draft.trim() ? 0.5 : 1,
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        {sending ? 'Sending…' : 'Send'}
      </button>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────

function containerStyle(): React.CSSProperties {
  return {
    padding: '20px 16px 80px',
    color: '#fff',
    fontFamily: "'Outfit', 'Inter', sans-serif",
  }
}

function emptyStateStyle(): React.CSSProperties {
  return {
    background: 'rgba(255,255,255,0.03)',
    border: '1px dashed rgba(255,255,255,0.15)',
    borderRadius: 14,
    padding: 28,
    textAlign: 'center' as const,
  }
}

function errorStyle(): React.CSSProperties {
  return {
    background: 'rgba(248,113,113,0.10)',
    border: '1px solid rgba(248,113,113,0.4)',
    color: RED,
    padding: '8px 12px',
    borderRadius: 10,
    fontSize: 12,
    marginBottom: 12,
  }
}

function formatTs(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const diffMs = Date.now() - d.getTime()
  const minute = 60_000, hour = 60 * minute, day = 24 * hour
  if (diffMs < minute) return 'just now'
  if (diffMs < hour)   return `${Math.floor(diffMs / minute)}m ago`
  if (diffMs < day)    return `${Math.floor(diffMs / hour)}h ago`
  return d.toLocaleDateString()
}
