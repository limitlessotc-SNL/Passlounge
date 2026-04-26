// src/features/ngn/NGNCardScreen.tsx
//
// The router for NGN items. Owns the scenario+question chrome and the
// "submitted" gate; delegates the answer UI to the right sub-component
// based on card.type. After a sub-component fires onAnswer(NGNAnswer)
// we score the answer through scoreNGNAnswer and surface the
// NGNScoreResult to the caller (CAT, batch review, etc).

import { useState } from 'react';

import { BowTieCard } from './BowTieCard';
import { ClozeCard } from './ClozeCard';
import { DragDropCard } from './DragDropCard';
import { ExtendedMRCard } from './ExtendedMRCard';
import { MatrixCard } from './MatrixCard';
import type {
  MCQContent,
  NGNAnswer,
  NGNCard,
  NGNScoreResult,
} from './ngn.types';
import { scoreNGNAnswer } from './ngn.scoring';
import { TrendCard } from './TrendCard';

const GOLD = '#F5C518';
const GREEN = 'rgba(74,222,128,0.9)';
const RED   = 'rgba(248,113,113,0.9)';

interface Props {
  card: NGNCard;
  onAnswer: (result: NGNScoreResult) => void;
  mode: 'study' | 'test';
}

export function NGNCardScreen({ card, onAnswer, mode }: Props) {
  const [scoreResult, setScoreResult] = useState<NGNScoreResult | null>(null);

  function handleSubAnswer(answer: NGNAnswer) {
    const result = scoreNGNAnswer(card, answer);
    setScoreResult(result);
    onAnswer(result);
  }

  return (
    <div
      data-testid="ngn-card-screen"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '16px 20px 100px',
        color: '#fff',
        fontFamily: "'Outfit', 'Inter', sans-serif",
      }}
    >
      {card.scenario && (
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14,
            padding: '16px 18px',
            fontSize: 15,
            lineHeight: 1.6,
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          {card.scenario}
        </div>
      )}

      <div style={{
        fontSize: 17,
        fontWeight: 600,
        lineHeight: 1.5,
      }}>
        {card.question}
      </div>

      <Body
        card={card}
        mode={mode}
        scoreResult={scoreResult}
        onAnswer={handleSubAnswer}
      />

      {/* Rationale — only revealed in study mode after scoring. */}
      {mode === 'study' && scoreResult && card.rationale && (
        <div style={{
          marginTop: 4,
          background: 'rgba(245,197,24,0.08)',
          border: '1px solid rgba(245,197,24,0.3)',
          borderRadius: 12,
          padding: '14px 16px',
        }}>
          <div style={{
            fontSize: 11, textTransform: 'uppercase', letterSpacing: 1,
            color: GOLD, fontWeight: 800, marginBottom: 6,
          }}>
            Rationale
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
            {card.rationale}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-component dispatch ───────────────────────────────────────────

interface BodyProps {
  card: NGNCard;
  mode: 'study' | 'test';
  scoreResult: NGNScoreResult | null;
  onAnswer: (answer: NGNAnswer) => void;
}

function Body({ card, mode, scoreResult, onAnswer }: BodyProps) {
  const result = scoreResult ?? undefined;

  switch (card.type) {
    case 'mcq':
      return <MCQBody card={card} onAnswer={onAnswer} mode={mode} scoreResult={result} />;
    case 'extended_mr_n':
    case 'extended_mr_all':
      return <ExtendedMRCard card={card} onAnswer={onAnswer} mode={mode} scoreResult={result} />;
    case 'bow_tie':
      return <BowTieCard card={card} onAnswer={onAnswer} mode={mode} scoreResult={result} />;
    case 'matrix':
      return <MatrixCard card={card} onAnswer={onAnswer} mode={mode} scoreResult={result} />;
    case 'cloze':
      return <ClozeCard card={card} onAnswer={onAnswer} mode={mode} scoreResult={result} />;
    case 'drag_drop':
      return <DragDropCard card={card} onAnswer={onAnswer} mode={mode} scoreResult={result} />;
    case 'trend':
      return <TrendCard card={card} onAnswer={onAnswer} mode={mode} scoreResult={result} />;
    default:
      return (
        <div style={{ color: RED, fontSize: 13 }}>
          Unsupported question type: {card.type}
        </div>
      );
  }
}

// ─── MCQ inline body ──────────────────────────────────────────────────
// Spec didn't carve out a dedicated MCQCard component (the NGN component
// list covers the new formats). MCQ is the legacy single-select; inlining
// it here keeps the file count down without losing any behavior.

interface MCQBodyProps {
  card: NGNCard;
  onAnswer: (answer: NGNAnswer) => void;
  mode: 'study' | 'test';
  scoreResult?: NGNScoreResult;
}

function MCQBody({ card, onAnswer, mode, scoreResult }: MCQBodyProps) {
  const content = card.content as MCQContent;
  const submitted = !!scoreResult;
  const showFeedback = mode === 'study' && submitted;

  const [picked, setPicked] = useState<number | null>(null);

  function submit() {
    if (picked === null || submitted) return;
    onAnswer(picked);
  }

  return (
    <div data-testid="mcq-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {content.opts.map((opt, i) => {
        const isPicked = picked === i;
        const isCorrect = i === content.correct;
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
            onClick={() => !submitted && setPicked(i === picked ? null : i)}
            disabled={submitted}
            aria-pressed={isPicked}
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              background: bg,
              border,
              color,
              fontSize: 15,
              lineHeight: 1.5,
              textAlign: 'left',
              cursor: submitted ? 'default' : 'pointer',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            {opt}
          </button>
        );
      })}

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
          disabled={picked === null}
          style={{
            marginTop: 8,
            padding: '12px 14px',
            borderRadius: 12,
            background: picked !== null ? GOLD : 'rgba(255,255,255,0.06)',
            color: picked !== null ? '#053571' : 'rgba(255,255,255,0.3)',
            border: 'none',
            fontSize: 14,
            fontWeight: 800,
            fontFamily: "'Outfit', sans-serif",
            cursor: picked !== null ? 'pointer' : 'default',
          }}
        >
          Submit Answer →
        </button>
      )}
    </div>
  );
}
