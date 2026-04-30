// src/features/admin/forms/ClozeForm.tsx
//
// Authors a fill-in-the-blank cloze: a template string with {0}, {1}, {2}…
// placeholders and a parallel array of dropdowns. The form auto-detects
// placeholder count from the template and adds/removes dropdowns to match.

import { useEffect, useMemo, useState } from 'react';

import { NGNCardScreen } from '@/features/ngn/NGNCardScreen';
import type { ClozeContent, ClozeDropdown, NGNCard } from '@/features/ngn/ngn.types';

import {
  FormSection,
  GOLD,
  PreviewBox,
  addBtnStyle,
  iconBtnStyle,
  inputStyle,
  makePreviewCard,
  textareaStyle,
} from './_shared';

interface Props {
  initialData?: NGNCard;
  onChange: (content: ClozeContent) => void;
}

export function defaultClozeContent(): ClozeContent {
  return {
    template: 'The patient is showing signs of {0} and the priority intervention is {1}.',
    dropdowns: [
      { opts: ['', '', ''], correct: 0 },
      { opts: ['', '', ''], correct: 0 },
    ],
  };
}

const PLACEHOLDER_RE = /\{(\d+)\}/g;

function countPlaceholders(template: string): number {
  PLACEHOLDER_RE.lastIndex = 0;
  const indices = new Set<number>();
  let m: RegExpExecArray | null;
  while ((m = PLACEHOLDER_RE.exec(template)) !== null) {
    indices.add(Number(m[1]));
  }
  return indices.size;
}

export function ClozeForm({ initialData, onChange }: Props) {
  const [content, setContent] = useState<ClozeContent>(() =>
    initialData?.type === 'cloze'
      ? (initialData.content as ClozeContent)
      : defaultClozeContent(),
  );

  useEffect(() => { onChange(content); }, [content, onChange]);

  const expectedDropdowns = useMemo(
    () => Math.max(1, countPlaceholders(content.template)),
    [content.template],
  );

  // Keep dropdown array length in sync with the placeholder count.
  useEffect(() => {
    setContent(c => {
      if (c.dropdowns.length === expectedDropdowns) return c;
      const dropdowns: ClozeDropdown[] = [];
      for (let i = 0; i < expectedDropdowns; i++) {
        dropdowns.push(c.dropdowns[i] ?? { opts: ['', '', ''], correct: 0 });
      }
      return { ...c, dropdowns };
    });
  }, [expectedDropdowns]);

  function setTemplate(v: string) {
    setContent(c => ({ ...c, template: v }));
  }
  function setDropdownOpt(ddIdx: number, optIdx: number, v: string) {
    setContent(c => ({
      ...c,
      dropdowns: c.dropdowns.map((dd, j) =>
        j === ddIdx
          ? { ...dd, opts: dd.opts.map((o, k) => (k === optIdx ? v : o)) }
          : dd,
      ),
    }));
  }
  function addDropdownOpt(ddIdx: number) {
    setContent(c => ({
      ...c,
      dropdowns: c.dropdowns.map((dd, j) =>
        j === ddIdx ? { ...dd, opts: [...dd.opts, ''] } : dd,
      ),
    }));
  }
  function removeDropdownOpt(ddIdx: number, optIdx: number) {
    setContent(c => ({
      ...c,
      dropdowns: c.dropdowns.map((dd, j) => {
        if (j !== ddIdx) return dd;
        const opts = dd.opts.filter((_, k) => k !== optIdx);
        const correct =
          dd.correct === optIdx ? 0 :
          dd.correct > optIdx ? dd.correct - 1 : dd.correct;
        return { opts, correct };
      }),
    }));
  }
  function setDropdownCorrect(ddIdx: number, optIdx: number) {
    setContent(c => ({
      ...c,
      dropdowns: c.dropdowns.map((dd, j) =>
        j === ddIdx ? { ...dd, correct: optIdx } : dd,
      ),
    }));
  }

  const max_points = content.dropdowns.length || 1;
  const previewCard = makePreviewCard(initialData, 'cloze', content, max_points, '0/1');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FormSection title="Template · use {0}, {1}, {2}… for blanks">
        <textarea
          value={content.template}
          onChange={(e) => setTemplate(e.target.value)}
          aria-label="Cloze template"
          placeholder="The patient is showing signs of {0} and the priority intervention is {1}."
          style={textareaStyle}
        />
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
          Detected {expectedDropdowns} dropdown{expectedDropdowns === 1 ? '' : 's'}.
        </div>
      </FormSection>

      {content.dropdowns.map((dd, ddIdx) => (
        <FormSection key={ddIdx} title={`Dropdown {${ddIdx}} · pick the correct option`}>
          {dd.opts.map((opt, optIdx) => (
            <div key={optIdx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="radio"
                name={`cloze-dd-${ddIdx}`}
                checked={dd.correct === optIdx}
                onChange={() => setDropdownCorrect(ddIdx, optIdx)}
                aria-label={`Mark dropdown ${ddIdx + 1} option ${optIdx + 1} correct`}
                style={{ accentColor: GOLD, cursor: 'pointer' }}
              />
              <input
                type="text"
                value={opt}
                onChange={(e) => setDropdownOpt(ddIdx, optIdx, e.target.value)}
                placeholder={`Option ${optIdx + 1}`}
                aria-label={`Dropdown ${ddIdx + 1} option ${optIdx + 1} text`}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => removeDropdownOpt(ddIdx, optIdx)}
                disabled={dd.opts.length <= 2}
                aria-label={`Remove dropdown ${ddIdx + 1} option ${optIdx + 1}`}
                style={{
                  ...iconBtnStyle,
                  opacity: dd.opts.length <= 2 ? 0.3 : 1,
                  cursor: dd.opts.length <= 2 ? 'not-allowed' : 'pointer',
                }}
              >
                ×
              </button>
            </div>
          ))}
          <button type="button" onClick={() => addDropdownOpt(ddIdx)} style={addBtnStyle}>
            + Add option
          </button>
        </FormSection>
      ))}

      <PreviewBox>
        <NGNCardScreen card={previewCard} mode="study" onAnswer={() => {}} />
      </PreviewBox>
    </div>
  );
}
