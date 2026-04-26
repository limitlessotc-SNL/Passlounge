// src/features/ngn/BowTieCard.tsx
//
// 3-panel layout: Actions to Take (left, multi-select up to left_correct.length)
// + Primary Condition (center, single select) + Parameters to Monitor (right,
// multi-select up to right_correct.length).
//
// Scoring is delegated to scoreNGNAnswer — left/right are all-or-nothing,
// center is 0/1.

import { useState } from 'react';

import type {
  BowTieAnswer,
  BowTieContent,
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

type PanelSide = 'left' | 'right';

export function BowTieCard({ card, onAnswer, mode, scoreResult }: Props) {
  const content = card.content as BowTieContent;
  const submitted = !!scoreResult;
  const showFeedback = mode === 'study' && submitted;

  const [left, setLeft] = useState<Set<number>>(new Set());
  const [center, setCenter] = useState<number | null>(null);
  const [right, setRight] = useState<Set<number>>(new Set());

  function toggleSide(side: PanelSide, idx: number) {
    if (submitted) return;
    const cap = side === 'left' ? content.left_correct.length : content.right_correct.length;
    const setter = side === 'left' ? setLeft : setRight;
    setter(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else if (next.size < cap) next.add(idx);
      return next;
    });
  }

  const isComplete =
    left.size === content.left_correct.length &&
    center !== null &&
    right.size === content.right_correct.length;

  function submit() {
    if (!isComplete || submitted) return;
    const answer: BowTieAnswer = {
      left: Array.from(left).sort((a, b) => a - b),
      center: center as number,
      right: Array.from(right).sort((a, b) => a - b),
    };
    onAnswer(answer);
  }

  return (
    <div data-testid="bow-tie-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        alignItems: 'flex-start',
      }}>
        <Panel
          label={content.left_label}
          opts={content.left_opts}
          picked={left}
          correct={new Set(content.left_correct)}
          isMulti
          submitted={submitted}
          showFeedback={showFeedback}
          onToggle={(i) => toggleSide('left', i)}
          panelCorrect={showFeedback ? scoreResult?.breakdown?.left === content.left_correct.length : null}
        />
        <Panel
          label={content.center_label}
          opts={content.center_opts}
          picked={center === null ? new Set() : new Set([center])}
          correct={new Set([content.center_correct])}
          isMulti={false}
          submitted={submitted}
          showFeedback={showFeedback}
          onToggle={(i) => !submitted && setCenter(prev => (prev === i ? null : i))}
          panelCorrect={showFeedback ? scoreResult?.breakdown?.center === 1 : null}
        />
        <Panel
          label={content.right_label}
          opts={content.right_opts}
          picked={right}
          correct={new Set(content.right_correct)}
          isMulti
          submitted={submitted}
          showFeedback={showFeedback}
          onToggle={(i) => toggleSide('right', i)}
          panelCorrect={showFeedback ? scoreResult?.breakdown?.right === content.right_correct.length : null}
        />
      </div>

      {showFeedback && (
        <div style={{
          fontSize: 13,
          color: scoreResult.was_correct ? GREEN : RED,
          fontWeight: 700,
        }}>
          {scoreResult.points_earned} / {scoreResult.max_points} points earned
        </div>
      )}

      {!submitted && (
        <button
          onClick={submit}
          disabled={!isComplete}
          style={{
            padding: '12px 14px',
            borderRadius: 12,
            background: isComplete ? GOLD : 'rgba(255,255,255,0.06)',
            color: isComplete ? '#053571' : 'rgba(255,255,255,0.3)',
            border: 'none',
            fontSize: 14,
            fontWeight: 800,
            fontFamily: "'Outfit', sans-serif",
            cursor: isComplete ? 'pointer' : 'default',
          }}
        >
          Submit Answer →
        </button>
      )}
    </div>
  );
}

interface PanelProps {
  label: string;
  opts: string[];
  picked: Set<number>;
  correct: Set<number>;
  isMulti: boolean;
  submitted: boolean;
  showFeedback: boolean;
  onToggle: (idx: number) => void;
  /** True if this whole panel scored full points; false if 0; null while not submitted. */
  panelCorrect: boolean | null;
}

function Panel({ label, opts, picked, correct, isMulti, submitted, showFeedback, onToggle, panelCorrect }: PanelProps) {
  const headerBorder =
    showFeedback ? (panelCorrect ? GREEN : RED) : 'rgba(255,255,255,0.15)';
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1.5px solid ${headerBorder}`,
        borderRadius: 14,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: showFeedback ? (panelCorrect ? GREEN : RED) : 'rgba(255,255,255,0.5)',
        fontWeight: 700,
        textAlign: 'center',
      }}>
        {label}
      </div>
      {opts.map((opt, i) => {
        const isPicked = picked.has(i);
        const isCorrect = correct.has(i);
        let bg = 'rgba(255,255,255,0.04)';
        let border = '1.5px solid rgba(255,255,255,0.08)';
        let color = 'rgba(255,255,255,0.85)';
        if (showFeedback) {
          if (isPicked && isCorrect) { bg = 'rgba(74,222,128,0.12)'; border = `1.5px solid ${GREEN}`; color = GREEN; }
          else if (isPicked && !isCorrect) { bg = 'rgba(248,113,113,0.12)'; border = `1.5px solid ${RED}`; color = RED; }
          else if (!isPicked && isCorrect) { border = `1.5px dashed ${GREEN}`; color = GREEN; }
        } else if (isPicked) {
          bg = 'rgba(245,197,24,0.15)'; border = `1.5px solid ${GOLD}`; color = GOLD;
        }
        return (
          <button
            key={i}
            onClick={() => onToggle(i)}
            disabled={submitted}
            aria-label={`${label} : ${opt}`}
            aria-pressed={isPicked}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: bg,
              border,
              color,
              fontSize: 13,
              lineHeight: 1.4,
              textAlign: 'left',
              cursor: submitted ? 'default' : 'pointer',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            {isMulti && isPicked ? '✓ ' : ''}{opt}
          </button>
        );
      })}
    </div>
  );
}
