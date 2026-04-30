// src/features/admin/forms/ExtendedMRForm.tsx
//
// Authors both extended-multiple-response variants:
//   • extended_mr_n   → "Select N", scored 0/1 per correct selection.
//   • extended_mr_all → "Select all that apply", scored +/- with floor 0.
//
// The variant is controlled by a top-of-form toggle. Switching variants
// only adds/removes select_n; opts and correct_indices survive the toggle.

import { useEffect, useMemo, useState } from 'react';

import { NGNCardScreen } from '@/features/ngn/NGNCardScreen';
import type {
  ExtendedMRAllContent,
  ExtendedMRNContent,
  NGNCard,
  NGNQuestionType,
} from '@/features/ngn/ngn.types';

import {
  FormSection,
  GOLD,
  PreviewBox,
  addBtnStyle,
  iconBtnStyle,
  inputStyle,
  makePreviewCard,
  numberInputStyle,
} from './_shared';

type Variant = 'extended_mr_n' | 'extended_mr_all';
type Content = ExtendedMRNContent | ExtendedMRAllContent;

interface Props {
  initialData?: NGNCard;
  onChange: (content: Content, variant: Variant) => void;
}

export function defaultExtendedMRContent(variant: Variant): Content {
  if (variant === 'extended_mr_n') {
    return { opts: ['', '', '', '', ''], correct_indices: [], select_n: 3 };
  }
  return { opts: ['', '', '', '', ''], correct_indices: [] };
}

function isSelectN(c: Content): c is ExtendedMRNContent {
  return (c as ExtendedMRNContent).select_n !== undefined;
}

export function ExtendedMRForm({ initialData, onChange }: Props) {
  const initialVariant: Variant =
    initialData?.type === 'extended_mr_n' || initialData?.type === 'extended_mr_all'
      ? (initialData.type as Variant)
      : 'extended_mr_n';

  const [variant, setVariant] = useState<Variant>(initialVariant);
  const [content, setContent] = useState<Content>(() => {
    if (
      initialData &&
      (initialData.type === 'extended_mr_n' || initialData.type === 'extended_mr_all')
    ) {
      return initialData.content as Content;
    }
    return defaultExtendedMRContent(initialVariant);
  });

  useEffect(() => { onChange(content, variant); }, [content, variant, onChange]);

  function changeVariant(next: Variant) {
    if (next === variant) return;
    setVariant(next);
    setContent(prev => {
      if (next === 'extended_mr_n') {
        // Adopt N = current correct count, min 1.
        const select_n = Math.max(1, prev.correct_indices.length || 3);
        return {
          opts: prev.opts,
          correct_indices: prev.correct_indices,
          select_n,
        };
      }
      // Drop select_n.
      return { opts: prev.opts, correct_indices: prev.correct_indices };
    });
  }

  function setOpt(i: number, v: string) {
    setContent(c => ({ ...c, opts: c.opts.map((o, j) => (j === i ? v : o)) } as Content));
  }
  function addOpt() {
    setContent(c => ({ ...c, opts: [...c.opts, ''] } as Content));
  }
  function removeOpt(i: number) {
    setContent(c => {
      const opts = c.opts.filter((_, j) => j !== i);
      const correct_indices = c.correct_indices
        .filter(ci => ci !== i)
        .map(ci => (ci > i ? ci - 1 : ci));
      return { ...c, opts, correct_indices } as Content;
    });
  }
  function toggleCorrect(i: number) {
    setContent(c => {
      const set = new Set(c.correct_indices);
      if (set.has(i)) set.delete(i);
      else set.add(i);
      const correct_indices = Array.from(set).sort((a, b) => a - b);
      return { ...c, correct_indices } as Content;
    });
  }
  function setSelectN(n: number) {
    setContent(c => {
      if (!isSelectN(c)) return c;
      return { ...c, select_n: Math.max(1, n) };
    });
  }

  const max_points = useMemo(() => {
    if (isSelectN(content)) return content.select_n;
    return content.correct_indices.length || 1;
  }, [content]);

  const previewCard = makePreviewCard(
    initialData,
    variant as NGNQuestionType,
    content,
    max_points,
    variant === 'extended_mr_all' ? '+/-' : '0/1',
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FormSection title="Variant">
        <div style={{ display: 'flex', gap: 8 }}>
          <VariantBtn
            label="Select N"
            active={variant === 'extended_mr_n'}
            onClick={() => changeVariant('extended_mr_n')}
          />
          <VariantBtn
            label="Select all that apply"
            active={variant === 'extended_mr_all'}
            onClick={() => changeVariant('extended_mr_all')}
          />
        </div>
      </FormSection>

      {isSelectN(content) && (
        <FormSection title="N (number to select)">
          <input
            type="number"
            min={1}
            max={Math.max(1, content.opts.length)}
            value={content.select_n}
            onChange={(e) => setSelectN(Number(e.target.value))}
            aria-label="Select N count"
            style={numberInputStyle}
          />
        </FormSection>
      )}

      <FormSection title="Options · check the correct ones">
        {content.opts.map((opt, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={content.correct_indices.includes(i)}
              onChange={() => toggleCorrect(i)}
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

function VariantBtn({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: 10,
        background: active ? 'rgba(245,197,24,0.15)' : 'rgba(255,255,255,0.04)',
        border: active ? `1.5px solid ${GOLD}` : '1.5px solid rgba(255,255,255,0.1)',
        color: active ? GOLD : 'rgba(255,255,255,0.75)',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      {label}
    </button>
  );
}
