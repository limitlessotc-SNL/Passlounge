// src/features/ngn/MatrixCard.tsx
//
// Renders matrix-grid items: rows = clinical statements, columns = options
// (Anticipated/Unanticipated, Effective/Ineffective, etc). One radio per row.
//
// Submit gates on every row having a selection. Study-mode feedback tints
// each row green/red by per-row correctness.

import { useState } from 'react';

import type { MatrixContent, NGNAnswer, NGNCard, NGNScoreResult } from './ngn.types';

const GOLD = '#F5C518';
const GREEN = 'rgba(74,222,128,0.9)';
const RED   = 'rgba(248,113,113,0.9)';

interface Props {
  card: NGNCard;
  onAnswer: (answer: NGNAnswer) => void;
  mode: 'study' | 'test';
  scoreResult?: NGNScoreResult;
}

export function MatrixCard({ card, onAnswer, mode, scoreResult }: Props) {
  const content = card.content as MatrixContent;
  const submitted = !!scoreResult;
  const showFeedback = mode === 'study' && submitted;

  const [selections, setSelections] = useState<Array<number | null>>(
    () => content.rows.map(() => null),
  );

  function setRow(rowIdx: number, colIdx: number) {
    if (submitted) return;
    setSelections(prev => {
      const next = [...prev];
      next[rowIdx] = colIdx;
      return next;
    });
  }

  const isComplete = selections.every(s => s !== null);

  function submit() {
    if (!isComplete || submitted) return;
    onAnswer({ row_selections: selections.map(s => s as number) });
  }

  return (
    <div data-testid="matrix-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `1.6fr repeat(${content.columns.length}, 1fr)`,
        gap: 8,
        padding: '0 12px',
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: 'rgba(255,255,255,0.45)',
      }}>
        <div />
        {content.columns.map((col, i) => (
          <div key={i} style={{ textAlign: 'center' }}>{col}</div>
        ))}
      </div>

      {content.rows.map((row, rowIdx) => {
        const picked = selections[rowIdx];
        const correctCol = row.correct_col;
        const rowCorrect = showFeedback ? picked === correctCol : null;
        let rowBg = 'rgba(255,255,255,0.04)';
        let rowBorder = '1px solid rgba(255,255,255,0.06)';
        if (showFeedback) {
          rowBg = rowCorrect ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)';
          rowBorder = `1px solid ${rowCorrect ? GREEN : RED}40`;
        }

        return (
          <div
            key={rowIdx}
            style={{
              display: 'grid',
              gridTemplateColumns: `1.6fr repeat(${content.columns.length}, 1fr)`,
              gap: 8,
              alignItems: 'center',
              padding: '12px',
              borderRadius: 12,
              background: rowBg,
              border: rowBorder,
            }}
          >
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>{row.label}</div>
            {content.columns.map((_, colIdx) => {
              const isPicked = picked === colIdx;
              const isCorrect = correctCol === colIdx;
              let pillBg = 'transparent';
              let pillBorder = '1.5px solid rgba(255,255,255,0.15)';
              let pillColor = 'rgba(255,255,255,0.45)';
              if (showFeedback) {
                if (isPicked && isCorrect) {
                  pillBg = 'rgba(74,222,128,0.18)'; pillBorder = `1.5px solid ${GREEN}`; pillColor = GREEN;
                } else if (isPicked && !isCorrect) {
                  pillBg = 'rgba(248,113,113,0.18)'; pillBorder = `1.5px solid ${RED}`; pillColor = RED;
                } else if (!isPicked && isCorrect) {
                  pillBorder = `1.5px dashed ${GREEN}`; pillColor = GREEN;
                }
              } else if (isPicked) {
                pillBg = 'rgba(245,197,24,0.15)'; pillBorder = `1.5px solid ${GOLD}`; pillColor = GOLD;
              }
              return (
                <button
                  key={colIdx}
                  onClick={() => setRow(rowIdx, colIdx)}
                  disabled={submitted}
                  aria-label={`${row.label} : ${content.columns[colIdx]}`}
                  aria-pressed={isPicked}
                  style={{
                    height: 32,
                    borderRadius: 8,
                    background: pillBg,
                    border: pillBorder,
                    color: pillColor,
                    cursor: submitted ? 'default' : 'pointer',
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  {isPicked ? '●' : ''}
                </button>
              );
            })}
          </div>
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
