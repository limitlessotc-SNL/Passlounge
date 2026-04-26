// src/features/cat/CATScreen.tsx

import { useEffect, useState } from 'react';
import type { UseCATSessionReturn } from './useCATSession';

const GOLD = '#F5C518';

interface Props {
  session: UseCATSessionReturn;
  onExit: () => void;
}

/** Strike state keyed by [questionIndex][optionIndex]. Local to this
 *  component — not persisted; purely a test-taking aid. */
type StrikeMap = Record<number, Record<number, boolean>>;

export function CATScreen({ session, onExit }: Props) {
  const {
    currentCard, questionIndex, totalQuestions, elapsedSeconds,
    answerQuestion, changePastAnswer, viewPastQuestion,
  } = session;

  /** Tentative selection — what the student has CLICKED but not yet
   *  Submitted. null = nothing tentative. Cleared whenever the card under
   *  the viewport changes. */
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [viewIndex, setViewIndex] = useState(questionIndex);
  const [struckByQuestion, setStruckByQuestion] = useState<StrikeMap>({});

  // Snap to the current unanswered card whenever the session advances.
  useEffect(() => {
    setViewIndex(questionIndex);
  }, [currentCard?.id, questionIndex]);

  // Reset the tentative selection whenever the displayed question changes,
  // either because the session advanced or the student navigated.
  useEffect(() => {
    setSelectedIndex(null);
  }, [viewIndex, currentCard?.id]);

  const isViewingPast = viewIndex < questionIndex;
  const past = isViewingPast ? viewPastQuestion(viewIndex) : null;
  const displayCard = past?.card ?? currentCard;
  const storedSelection: number | null = past?.selectedIndex ?? null;
  // Visible highlight: tentative wins if the student is mid-pick, else fall
  // back to the answer already on file (only meaningful for past questions).
  const displayedSelection: number | null =
    selectedIndex !== null ? selectedIndex : storedSelection;
  const struckHere = struckByQuestion[viewIndex] ?? {};

  // Submit button is only useful when there's a tentative selection AND the
  // student would actually be committing something:
  //   • current question  → any tentative selection is a valid submit
  //   • past question     → tentative must differ from the stored answer
  const canSubmit =
    selectedIndex !== null &&
    (!isViewingPast || selectedIndex !== storedSelection);

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function handleSelect(index: number) {
    if (struckHere[index]) return;
    setSelectedIndex(index === selectedIndex ? null : index);
  }

  function handleStrike(index: number) {
    if (selectedIndex === index) setSelectedIndex(null);
    setStruckByQuestion(prev => {
      const qMap = { ...(prev[viewIndex] ?? {}) };
      qMap[index] = !qMap[index];
      return { ...prev, [viewIndex]: qMap };
    });
  }

  function handleSubmit() {
    if (selectedIndex === null) return;
    if (isViewingPast) {
      // Past-question correction. The reducer updates trace.selected_index;
      // displayedSelection then falls back to the stored value, so clearing
      // the tentative selection here keeps the highlight stable.
      changePastAnswer(viewIndex, selectedIndex);
      setSelectedIndex(null);
    } else {
      // Current question. answerQuestion advances the session, which causes
      // the useEffect above to reset selectedIndex on the next render.
      answerQuestion(selectedIndex);
    }
  }

  const canGoBack    = viewIndex > 0;
  const canGoForward = viewIndex < questionIndex;

  if (!displayCard) return null;

  const progressPct = (questionIndex / totalQuestions) * 100;

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      color: '#fff',
      fontFamily: "'Outfit', 'Inter', sans-serif",
    }}>
      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px 8px',
        gap: 12,
      }}>
        <button
          onClick={() => setShowExitConfirm(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.4)',
            fontSize: 22,
            cursor: 'pointer',
            padding: '4px 8px',
            lineHeight: 1,
          }}
          aria-label="Exit CAT"
        >
          ×
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => canGoBack && setViewIndex(viewIndex - 1)}
            disabled={!canGoBack}
            aria-label="Previous question"
            style={navArrowStyle(canGoBack)}
          >
            ‹
          </button>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: 500, minWidth: 60, textAlign: 'center' }}>
            {viewIndex + 1} / {totalQuestions}
          </span>
          <button
            onClick={() => canGoForward && setViewIndex(viewIndex + 1)}
            disabled={!canGoForward}
            aria-label="Next question"
            style={navArrowStyle(canGoForward)}
          >
            ›
          </button>
        </div>

        <span style={{
          fontSize: 13,
          fontVariantNumeric: 'tabular-nums',
          color: 'rgba(255,255,255,0.4)',
          fontWeight: 500,
        }}>
          {formatTime(elapsedSeconds)}
        </span>
      </div>

      <div style={{
        height: 3,
        background: 'rgba(255,255,255,0.08)',
        margin: '0 20px 4px',
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progressPct}%`,
          background: GOLD,
          borderRadius: 2,
          transition: 'width 0.3s ease',
        }} />
      </div>

      {isViewingPast && (
        <div
          role="status"
          style={{
            margin: '8px 20px 0',
            padding: '8px 12px',
            borderRadius: 10,
            background: 'rgba(245,197,24,0.10)',
            border: '1px solid rgba(245,197,24,0.35)',
            fontSize: 12,
            color: 'rgba(245,197,24,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <span>Reviewing a past question — tap a different option then Submit to change your answer.</span>
          <button
            onClick={() => setViewIndex(questionIndex)}
            style={{
              background: 'transparent',
              border: 'none',
              color: GOLD,
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'inherit',
            }}
          >
            Back to current →
          </button>
        </div>
      )}

      {/* ── Card content ───────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 20px 100px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        {displayCard.scenario && (
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14,
            padding: '16px 18px',
            fontSize: 15,
            lineHeight: 1.6,
            color: 'rgba(255,255,255,0.8)',
          }}>
            {displayCard.scenario}
          </div>
        )}

        <div style={{
          fontSize: 17,
          fontWeight: 600,
          lineHeight: 1.5,
          color: '#fff',
          padding: '0 2px',
        }}>
          {displayCard.question}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          {displayCard.opts.map((opt, i) => {
            const isSelected = displayedSelection === i;
            const isStruck   = !!struckHere[i];
            return (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                <button
                  onClick={() => handleStrike(i)}
                  aria-label={`${isStruck ? 'Unstrike' : 'Strike'} option ${String.fromCharCode(65 + i)}`}
                  style={strikeBtnStyle(isStruck)}
                >
                  ✕
                </button>
                <button
                  onClick={() => handleSelect(i)}
                  disabled={isStruck}
                  style={optionBtnStyle(isSelected, isStruck)}
                >
                  {opt}
                </button>
              </div>
            );
          })}
        </div>

        {/* Submit button — appears only when there's something to submit. */}
        {canSubmit && (
          <button
            onClick={handleSubmit}
            style={submitBtnStyle}
          >
            {isViewingPast ? 'Submit Change →' : 'Submit Answer →'}
          </button>
        )}
      </div>

      {/* ── Exit confirmation modal ────────────────────────────────────── */}
      {showExitConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          zIndex: 100,
        }}>
          <div style={{
            background: '#141414',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20,
            padding: '28px 24px',
            maxWidth: 360,
            width: '100%',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Exit CAT?</h3>
            <p style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.5,
              marginBottom: 24,
            }}>
              Your progress will be saved as an incomplete session.
              This will count toward your history but may affect your score.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowExitConfirm(false)}
                style={{
                  flex: 1,
                  padding: '13px',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Keep Going
              </button>
              <button
                onClick={onExit}
                style={{
                  flex: 1,
                  padding: '13px',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#ef4444',
                  cursor: 'pointer',
                }}
              >
                Exit &amp; Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────

function navArrowStyle(active: boolean): React.CSSProperties {
  return {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    width: 32,
    height: 32,
    color: active ? '#fff' : 'rgba(255,255,255,0.25)',
    fontSize: 18,
    lineHeight: 1,
    cursor: active ? 'pointer' : 'default',
    opacity: active ? 1 : 0.45,
    fontFamily: 'inherit',
  };
}

function strikeBtnStyle(isStruck: boolean): React.CSSProperties {
  return {
    width: 36,
    flexShrink: 0,
    borderRadius: 12,
    background: isStruck ? 'rgba(248,113,113,0.18)' : 'rgba(255,255,255,0.03)',
    border: isStruck ? '1.5px solid rgba(248,113,113,0.55)' : '1.5px solid rgba(255,255,255,0.08)',
    color: isStruck ? 'rgba(248,113,113,0.95)' : 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: 800,
    fontFamily: 'inherit',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };
}

function optionBtnStyle(
  isSelected: boolean,
  isStruck: boolean,
): React.CSSProperties {
  return {
    flex: 1,
    textAlign: 'left' as const,
    padding: '14px 18px',
    borderRadius: 14,
    fontSize: 15,
    lineHeight: 1.5,
    fontFamily: 'inherit',
    cursor: isStruck ? 'default' : 'pointer',
    transition: 'all 0.15s ease',
    background: isSelected
      ? 'rgba(245,197,24,0.15)'
      : 'rgba(255,255,255,0.04)',
    border: isSelected
      ? '1.5px solid rgba(245,197,24,0.6)'
      : '1.5px solid rgba(255,255,255,0.08)',
    color: isSelected ? GOLD : 'rgba(255,255,255,0.85)',
    textDecoration: isStruck ? 'line-through' as const : 'none' as const,
    opacity: isStruck ? 0.5 : 1,
    transform: isSelected ? 'scale(0.99)' : 'scale(1)',
  };
}

const submitBtnStyle: React.CSSProperties = {
  marginTop: 12,
  width: '100%',
  padding: '14px',
  borderRadius: 14,
  fontSize: 15,
  fontWeight: 800,
  fontFamily: "'Outfit', sans-serif",
  background: GOLD,
  border: 'none',
  color: '#053571',
  cursor: 'pointer',
  letterSpacing: '0.01em',
  boxShadow: '0 6px 20px rgba(245,197,24,0.25)',
};
