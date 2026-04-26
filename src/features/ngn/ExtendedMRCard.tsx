// src/features/ngn/ExtendedMRCard.tsx
//
// Renders extended-multiple-response items. Handles both NGN sub-types:
//   • extended_mr_n   → "Select {N}". UI prevents picking more than N.
//   • extended_mr_all → "Select all that apply". No upper bound.
//
// In study mode, once an answer has been scored the parent passes scoreResult
// down and we tint each option green/red according to per-option correctness.

import { useState } from 'react';

import type {
  ExtendedMRAllContent,
  ExtendedMRNContent,
  NGNAnswer,
  NGNCard,
  NGNScoreResult,
} from './ngn.types';

const GOLD = '#F5C518';
const GREEN = 'rgba(74,222,128,0.9)';
const RED   = 'rgba(248,113,113,0.9)';

interface Props {
  card: NGNCard;
  onAnswer: (answer: NGNAnswer) => void;
  mode: 'study' | 'test';
  scoreResult?: NGNScoreResult;
}

export function ExtendedMRCard({ card, onAnswer, mode, scoreResult }: Props) {
  const isSelectN = card.type === 'extended_mr_n';
  const content = card.content as ExtendedMRNContent | ExtendedMRAllContent;
  const selectN = isSelectN ? (content as ExtendedMRNContent).select_n : null;
  const correctIndices = new Set(content.correct_indices);

  const [picked, setPicked] = useState<Set<number>>(new Set());
  const submitted = !!scoreResult;
  const showFeedback = mode === 'study' && submitted;

  function toggle(idx: number) {
    if (submitted) return;
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        if (selectN !== null && next.size >= selectN) return prev; // hard cap
        next.add(idx);
      }
      return next;
    });
  }

  function submit() {
    if (submitted) return;
    onAnswer(Array.from(picked).sort((a, b) => a - b));
  }

  const canSubmit = picked.size > 0 && !submitted;
  const instruction = isSelectN
    ? `Select ${selectN}`
    : 'Select all that apply';

  return (
    <div data-testid="extended-mr-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: 'rgba(255,255,255,0.4)',
        fontWeight: 700,
      }}>
        {instruction}{isSelectN ? ` · ${picked.size}/${selectN}` : ` · ${picked.size} selected`}
      </div>

      {content.opts.map((opt, i) => {
        const isPicked = picked.has(i);
        const isCorrect = correctIndices.has(i);
        let bg = 'rgba(255,255,255,0.04)';
        let border = '1.5px solid rgba(255,255,255,0.08)';
        let color = 'rgba(255,255,255,0.85)';
        if (showFeedback) {
          // Study mode: tint by per-option correctness regardless of pick.
          if (isPicked && isCorrect) { bg = 'rgba(74,222,128,0.12)'; border = `1.5px solid ${GREEN}`; color = GREEN; }
          else if (isPicked && !isCorrect) { bg = 'rgba(248,113,113,0.12)'; border = `1.5px solid ${RED}`; color = RED; }
          else if (!isPicked && isCorrect) { bg = 'rgba(74,222,128,0.06)'; border = `1.5px dashed ${GREEN}`; color = GREEN; }
        } else if (isPicked) {
          bg = 'rgba(245,197,24,0.15)'; border = `1.5px solid ${GOLD}`; color = GOLD;
        }

        return (
          <button
            key={i}
            onClick={() => toggle(i)}
            disabled={submitted}
            aria-pressed={isPicked}
            style={{
              textAlign: 'left',
              padding: '14px 16px',
              borderRadius: 12,
              background: bg,
              border,
              color,
              fontSize: 15,
              lineHeight: 1.5,
              cursor: submitted ? 'default' : 'pointer',
              fontFamily: "'Outfit', sans-serif",
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <span style={{
              width: 20, height: 20, flexShrink: 0,
              borderRadius: 4,
              border: `1.5px solid ${isPicked ? color : 'rgba(255,255,255,0.3)'}`,
              background: isPicked ? color : 'transparent',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#053571',
              fontWeight: 900,
              fontSize: 12,
              marginTop: 2,
            }}>{isPicked ? '✓' : ''}</span>
            <span style={{ flex: 1 }}>{opt}</span>
          </button>
        );
      })}

      {showFeedback && (
        <div style={{
          fontSize: 13,
          color: scoreResult.was_correct ? GREEN : RED,
          fontWeight: 700,
          marginTop: 4,
        }}>
          {scoreResult.points_earned} / {scoreResult.max_points} points earned
        </div>
      )}

      {!submitted && (
        <button
          onClick={submit}
          disabled={!canSubmit}
          style={{
            marginTop: 8,
            padding: '12px 14px',
            borderRadius: 12,
            background: canSubmit ? GOLD : 'rgba(255,255,255,0.06)',
            color: canSubmit ? '#053571' : 'rgba(255,255,255,0.3)',
            border: 'none',
            fontSize: 14,
            fontWeight: 800,
            fontFamily: "'Outfit', sans-serif",
            cursor: canSubmit ? 'pointer' : 'default',
          }}
        >
          Submit Answer →
        </button>
      )}
    </div>
  );
}
