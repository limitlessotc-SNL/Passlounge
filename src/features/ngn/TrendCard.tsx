// src/features/ngn/TrendCard.tsx
//
// Trend questions show an exhibit table at the top (vitals or labs across
// timestamps) and a Matrix-style response below. The response shape is
// identical to MatrixCard, so we delegate to a thin reuse: render the
// exhibit, then fan out to MatrixCard with a synthesized matrix card.

import type { MatrixContent, NGNAnswer, NGNCard, NGNScoreResult, TrendContent } from './ngn.types';
import { MatrixCard } from './MatrixCard';

interface Props {
  card: NGNCard;
  onAnswer: (answer: NGNAnswer) => void;
  mode: 'study' | 'test';
  scoreResult?: NGNScoreResult;
}

export function TrendCard({ card, onAnswer, mode, scoreResult }: Props) {
  const content = card.content as TrendContent;

  // Build a Matrix-shaped card to delegate the response UI.
  const matrixCard: NGNCard = {
    ...card,
    type: 'matrix',
    content: {
      columns: content.columns,
      rows: content.rows,
    } as MatrixContent,
  };

  return (
    <div data-testid="trend-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <ExhibitTable exhibit={content.exhibit} />
      <MatrixCard card={matrixCard} onAnswer={onAnswer} mode={mode} scoreResult={scoreResult} />
    </div>
  );
}

function ExhibitTable({ exhibit }: { exhibit: TrendContent['exhibit'] }) {
  return (
    <div
      role="table"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      <div role="row" style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${exhibit.headers.length}, 1fr)`,
        background: 'rgba(255,255,255,0.04)',
      }}>
        {exhibit.headers.map((h, i) => (
          <div
            key={i}
            role="columnheader"
            style={{
              padding: '8px 10px',
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase',
              letterSpacing: 1,
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {h}
          </div>
        ))}
      </div>
      {exhibit.rows.map((row, rowIdx) => (
        <div
          key={rowIdx}
          role="row"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${exhibit.headers.length}, 1fr)`,
            borderTop: rowIdx === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
          }}
        >
          {row.map((cell, colIdx) => (
            <div
              key={colIdx}
              role="cell"
              style={{
                padding: '10px',
                fontSize: 13,
                color: colIdx === 0 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.85)',
                fontWeight: colIdx === 0 ? 600 : 500,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {cell}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
