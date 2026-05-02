// src/features/messaging/CoachInbox.tsx
//
// Slide-in panel rendered from the CoachDashboard. Two-column on desktop:
// conversation list on the left, selected thread + composer on the right.
// On narrower viewports the right pane stacks below.
//
// The panel takes a `focusStudentId` prop so it can be opened pre-focused
// on a specific student (e.g. from StudentDetailPanel's "Message" button).

import { useEffect, useMemo, useState } from 'react'

import type { Cohort } from '@/features/coach/coach.types'
import { trackEvent } from '@/services/analytics'

import { AnnouncementModal } from './AnnouncementModal'
import {
  fetchCoachInbox,
  markMessagesAsRead,
  sendMessageToStudent,
} from './messaging.service'
import type { Conversation, Message } from './messaging.types'

const GOLD = '#F5C518'
const RED  = 'rgba(248,113,113,0.95)'
const POLL_MS = 30_000

interface Props {
  coachAuthId:    string
  cohorts:        Cohort[]
  focusStudentId?: string | null
  onClose:        () => void
}

export function CoachInbox({ coachAuthId, cohorts, focusStudentId, onClose }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId]       = useState<string | null>(focusStudentId ?? null)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [draft, setDraft]                 = useState('')
  const [sending, setSending]             = useState(false)
  const [announceOpen, setAnnounceOpen]   = useState(false)

  // inbox_opened on first mount.
  useEffect(() => {
    trackEvent('coach_inbox_opened')
  }, [])

  // Initial + polled fetch.
  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      try {
        const fresh = await fetchCoachInbox(coachAuthId)
        if (cancelled) return
        setConversations(fresh)
        setLoading(false)
        // If we opened with a focusStudentId that doesn't have a conversation
        // row yet, leave selectedId as-is — the empty thread state handles it.
        if (selectedId === null && fresh.length > 0) {
          setSelectedId(fresh[0].other_party_id)
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      }
    }
    void refresh()
    const id = window.setInterval(refresh, POLL_MS)
    return () => { cancelled = true; window.clearInterval(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachAuthId])

  const selected = useMemo(
    () => conversations.find(c => c.other_party_id === selectedId) ?? null,
    [conversations, selectedId],
  )

  // Mark unread inbound messages as read whenever we focus a conversation.
  useEffect(() => {
    if (!selected) return
    const unread = selected.messages
      .filter(m => m.recipient_id === coachAuthId && m.read_at === null)
      .map(m => m.id)
    if (unread.length > 0) {
      void markMessagesAsRead(unread)
    }
  }, [selectedId, selected, coachAuthId])

  async function handleSend() {
    if (!draft.trim() || !selectedId || sending) return
    setSending(true)
    setError(null)
    try {
      await sendMessageToStudent({
        recipient_id: selectedId,
        body: draft.trim(),
      })
      trackEvent('message_sent', { recipient_type: 'student' })
      setDraft('')
      const fresh = await fetchCoachInbox(coachAuthId)
      setConversations(fresh)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  function handleAnnouncementSent() {
    // Refresh after announcement so any cohort-wide echo shows up.
    void fetchCoachInbox(coachAuthId).then(setConversations)
  }

  return (
    <>
      <div
        data-testid="coach-inbox-backdrop"
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40 }}
      />
      <aside
        data-testid="coach-inbox"
        style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          width: 'min(900px, 100vw)',
          background: '#0a1629',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          color: '#fff',
          fontFamily: "'Outfit', 'Inter', sans-serif",
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Messages</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              data-testid="open-announcement-btn"
              onClick={() => setAnnounceOpen(true)}
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                background: 'rgba(245,197,24,0.10)',
                border: `1px solid ${GOLD}`,
                color: GOLD,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              📢 Announcement
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close inbox"
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              Close
            </button>
          </div>
        </div>

        {error && (
          <div data-testid="coach-inbox-error" style={{
            margin: '10px 20px 0',
            background: 'rgba(248,113,113,0.10)',
            border: '1px solid rgba(248,113,113,0.4)',
            color: RED,
            fontSize: 12,
            padding: '8px 12px',
            borderRadius: 10,
          }}>
            {error}
          </div>
        )}

        {/* Body */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 280px) 1fr',
          minHeight: 0,
        }}>
          {/* Conversation list */}
          <div
            data-testid="coach-conversation-list"
            style={{
              borderRight: '1px solid rgba(255,255,255,0.08)',
              overflowY: 'auto',
            }}
          >
            {loading ? (
              <div style={{ padding: 16, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                Loading…
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: 16, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                No conversations yet.
              </div>
            ) : (
              conversations.map(c => (
                <ConversationRow
                  key={c.other_party_id}
                  conv={c}
                  active={selectedId === c.other_party_id}
                  onClick={() => setSelectedId(c.other_party_id)}
                />
              ))
            )}
          </div>

          {/* Active thread + composer */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            minHeight: 0,
          }}>
            {!selected ? (
              <div data-testid="coach-thread-empty" style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.4)',
                fontSize: 13,
                padding: 16,
              }}>
                Select a conversation to read.
              </div>
            ) : (
              <>
                <div style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  fontSize: 14,
                  fontWeight: 800,
                }}>
                  {selected.other_party_name}
                </div>
                <div
                  data-testid="coach-thread"
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {selected.messages.map(m => (
                    <MessageBubble key={m.id} m={m} mine={m.sender_id === coachAuthId} />
                  ))}
                </div>
                <div style={{
                  padding: 12,
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  gap: 8,
                }}>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Reply to student…"
                    aria-label="Coach reply"
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
                    onClick={handleSend}
                    disabled={sending || !draft.trim()}
                    data-testid="coach-send-btn"
                    style={{
                      padding: '0 16px',
                      borderRadius: 12,
                      background: GOLD,
                      color: '#053571',
                      border: 'none',
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: sending || !draft.trim() ? 'default' : 'pointer',
                      opacity: sending || !draft.trim() ? 0.5 : 1,
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {announceOpen && (
        <AnnouncementModal
          coachAuthId={coachAuthId}
          cohorts={cohorts}
          onClose={() => setAnnounceOpen(false)}
          onSent={handleAnnouncementSent}
        />
      )}
    </>
  )
}

// ─── Sub-components ────────────────────────────────────────────────

function ConversationRow({
  conv, active, onClick,
}: { conv: Conversation; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`conv-row-${conv.other_party_id}`}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left' as const,
        padding: '12px 14px',
        background: active ? 'rgba(245,197,24,0.08)' : 'transparent',
        border: 'none',
        borderLeft: active ? `3px solid ${GOLD}` : '3px solid transparent',
        color: '#fff',
        cursor: 'pointer',
        fontFamily: "'Outfit', sans-serif",
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>{conv.other_party_name}</span>
        {conv.unread_count > 0 && (
          <span
            data-testid="conv-unread-badge"
            style={{
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              borderRadius: 9,
              background: 'rgba(248,113,113,0.85)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {conv.unread_count > 9 ? '9+' : conv.unread_count}
          </span>
        )}
      </div>
      <div style={{
        fontSize: 12,
        color: 'rgba(255,255,255,0.55)',
        marginTop: 2,
        overflow: 'hidden' as const,
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
      }}>
        {conv.last_message_body}
      </div>
    </button>
  )
}

function MessageBubble({ m, mine }: { m: Message; mine: boolean }) {
  return (
    <div style={{ alignSelf: mine ? 'flex-end' as const : 'flex-start' as const, maxWidth: '80%' }}>
      <div style={{
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
        marginBottom: 2,
        textAlign: mine ? 'right' as const : 'left' as const,
      }}>
        {m.sender_name ?? (mine ? 'You' : 'Student')} · {formatTs(m.created_at)}
      </div>
      <div style={{
        background: mine ? 'rgba(245,197,24,0.10)' : 'rgba(255,255,255,0.05)',
        border: mine
          ? '1px solid rgba(245,197,24,0.4)'
          : '1px solid rgba(255,255,255,0.08)',
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
