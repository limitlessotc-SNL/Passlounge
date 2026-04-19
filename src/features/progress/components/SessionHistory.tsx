/**
 * SessionHistory
 *
 * List of past sessions with scores, dates, and review buttons.
 * Matches the original HTML session-history-list.
 *
 * Owner: Junior Engineer 5
 */

import type { SessionSnapshot } from '@/types'

interface SessionHistoryProps {
  sessions: SessionSnapshot[];
  onReview?: (sessionIdx: number) => void;
}

export function SessionHistory({ sessions, onReview }: SessionHistoryProps) {
  if (sessions.length === 0) {
    return (
      <>
        <div className="setup-section-lbl">Session History</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '20px 0' }}>
          No sessions yet. Start studying!
        </div>
      </>
    )
  }

  // Display newest first while preserving original indices for callback
  const indexed = sessions.map((sess, idx) => ({ sess, idx }))
  const reversed = [...indexed].reverse()

  return (
    <>
      <div className="setup-section-lbl">Session History</div>
      {reversed.map(({ sess, idx }) => {
        const modeLabel = sess.mode === 'test' ? 'Test' : 'Study'
        const modeClass = sess.mode === 'test' ? 'badge-test-sm' : 'badge-study-sm'

        return (
          <div key={sess.id} className="sess-hist-card">
            <div className="sess-hist-hdr">
              <span className="sess-hist-title">{sess.name}</span>
              <span className={`sess-hist-badge ${modeClass}`}>{modeLabel}</span>
            </div>
            <div className="sess-hist-meta">{sess.date} · {sess.categories}</div>
            <div className="sess-hist-stats">
              <span className="sh-stat g">{sess.correct} correct</span>
              <span className="sh-stat r">{sess.wrong} missed</span>
              <span className="sh-stat">{sess.pct}%</span>
            </div>
            <button
              className="sess-rev-btn"
              onClick={() => onReview?.(idx)}
              disabled={!onReview}
            >
              Review Session →
            </button>
          </div>
        )
      })}
    </>
  )
}
