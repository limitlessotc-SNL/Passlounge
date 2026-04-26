// src/features/ngn/ClozeCard.tsx
//
// Renders fill-in-the-blank items where the prompt is a template string with
// {0}, {1}, {2} placeholders, each backed by a dropdown of options. The
// student selects one option per dropdown.

import { Fragment, useState } from 'react';

import type { ClozeContent, NGNAnswer, NGNCard, NGNScoreResult } from './ngn.types';

const GOLD = '#F5C518';
const GREEN = 'rgba(74,222,128,0.9)';
const RED   = 'rgba(248,113,113,0.9)';

interface Props {
  card: NGNCard;
  onAnswer: (answer: NGNAnswer) => void;
  mode: 'study' | 'test';
  scoreResult?: NGNScoreResult;
}

const PLACEHOLDER = /\{(\d+)\}/g;

export function ClozeCard({ card, onAnswer, mode, scoreResult }: Props) {
  const content = card.content as ClozeContent;
  const submitted = !!scoreResult;
  const showFeedback = mode === 'study' && submitted;

  const [selections, setSelections] = useState<Array<number | null>>(
    () => content.dropdowns.map(() => null),
  );

  function setDropdown(idx: number, optIdx: number | null) {
    if (submitted) return;
    setSelections(prev => {
      const next = [...prev];
      next[idx] = optIdx;
      return next;
    });
  }

  const isComplete = selections.every(s => s !== null);

  function submit() {
    if (!isComplete || submitted) return;
    onAnswer({ selections: selections.map(s => s as number) });
  }

  // Walk the template, splicing in <select> at each {N}.
  const segments: React.ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  PLACEHOLDER.lastIndex = 0;
  while ((m = PLACEHOLDER.exec(content.template)) !== null) {
    if (m.index > lastIndex) {
      segments.push(content.template.slice(lastIndex, m.index));
    }
    const dropIdx = Number(m[1]);
    const dropdown = content.dropdowns[dropIdx];
    if (dropdown) {
      const picked = selections[dropIdx];
      const isCorrect = picked === dropdown.correct;
      let color = GOLD;
      let border = `1.5px solid ${GOLD}`;
      let bg = 'rgba(245,197,24,0.08)';
      if (showFeedback) {
        if (isCorrect) {
          color = GREEN; border = `1.5px solid ${GREEN}`; bg = 'rgba(74,222,128,0.10)';
        } else {
          color = RED; border = `1.5px solid ${RED}`; bg = 'rgba(248,113,113,0.10)';
        }
      } else if (picked === null) {
        color = 'rgba(255,255,255,0.55)'; border = '1.5px dashed rgba(255,255,255,0.25)'; bg = 'transparent';
      }

      segments.push(
        <select
          key={`dd-${dropIdx}`}
          aria-label={`Dropdown ${dropIdx + 1}`}
          value={picked === null ? '' : String(picked)}
          onChange={(e) => setDropdown(dropIdx, e.target.value === '' ? null : Number(e.target.value))}
          disabled={submitted}
          style={{
            display: 'inline-block',
            margin: '0 4px',
            padding: '4px 8px',
            borderRadius: 8,
            background: bg,
            border,
            color,
            fontWeight: 700,
            fontFamily: "'Outfit', sans-serif",
            fontSize: 14,
          }}
        >
          <option value="" disabled>Select…</option>
          {dropdown.opts.map((opt, i) => (
            <option key={i} value={i}>{opt}</option>
          ))}
        </select>,
      );
    }
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < content.template.length) {
    segments.push(content.template.slice(lastIndex));
  }

  return (
    <div data-testid="cloze-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 14,
        padding: '16px 18px',
        fontSize: 15,
        lineHeight: 1.8,
        color: 'rgba(255,255,255,0.85)',
      }}>
        {segments.map((s, i) => <Fragment key={i}>{s}</Fragment>)}
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
            marginTop: 8,
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
