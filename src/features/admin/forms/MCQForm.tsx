// src/features/admin/forms/MCQForm.tsx
//
// Single-correct multiple-choice authoring form. Radio buttons select the
// correct option; min 2 options enforced (a one-option MCQ is meaningless).

import { useEffect, useState } from 'react';

import { NGNCardScreen } from '@/features/ngn/NGNCardScreen';
import type { MCQContent, NGNCard } from '@/features/ngn/ngn.types';

import {
  FormSection,
  GOLD,
  PreviewBox,
  addBtnStyle,
  iconBtnStyle,
  inputStyle,
  makePreviewCard,
} from './_shared';

interface Props {
  initialData?: NGNCard;
  onChange: (content: MCQContent) => void;
}

export function defaultMCQContent(): MCQContent {
  return { opts: ['', '', '', ''], correct: 0 };
}

export function MCQForm({ initialData, onChange }: Props) {
  const [content, setContent] = useState<MCQContent>(() =>
    initialData?.type === 'mcq'
      ? (initialData.content as MCQContent)
      : defaultMCQContent(),
  );

  useEffect(() => { onChange(content); }, [content, onChange]);

  function setOpt(i: number, v: string) {
    setContent(c => ({ ...c, opts: c.opts.map((o, j) => (j === i ? v : o)) }));
  }
  function addOpt() {
    setContent(c => ({ ...c, opts: [...c.opts, ''] }));
  }
  function removeOpt(i: number) {
    setContent(c => {
      const opts = c.opts.filter((_, j) => j !== i);
      const correct =
        c.correct === i ? 0 : c.correct > i ? c.correct - 1 : c.correct;
      return { opts, correct };
    });
  }

  const previewCard = makePreviewCard(initialData, 'mcq', content, 1, '0/1');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FormSection title="Options · pick the correct one">
        {content.opts.map((opt, i) => (
          <div
            key={i}
            style={{ display: 'flex', gap: 8, alignItems: 'center' }}
          >
            <input
              type="radio"
              name="mcq-correct"
              checked={content.correct === i}
              onChange={() =>
                setContent(c => ({ ...c, correct: i }))
              }
              aria-label={`Mark option ${i + 1} correct`}
              style={{ accentColor: GOLD, cursor: 'pointer' }}
            />
            <input
              type="text"
              value={opt}
              onChange={(e) => setOpt(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              aria-label={`Option ${i + 1} text`}
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => removeOpt(i)}
              disabled={content.opts.length <= 2}
              aria-label={`Remove option ${i + 1}`}
              style={{
                ...iconBtnStyle,
                opacity: content.opts.length <= 2 ? 0.3 : 1,
                cursor: content.opts.length <= 2 ? 'not-allowed' : 'pointer',
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" onClick={addOpt} style={addBtnStyle}>
          + Add option
        </button>
      </FormSection>

      <PreviewBox>
        <NGNCardScreen card={previewCard} mode="study" onAnswer={() => {}} />
      </PreviewBox>
    </div>
  );
}
