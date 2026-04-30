// src/features/admin/forms/BowTieForm.tsx
//
// 3-panel bow-tie author. Each side panel = label + opts[] + correct[] (multi),
// center = label + opts[] + correct (single). Scoring is `rationale`:
// left and right are all-or-nothing, center is 0/1, max_points sums.

import { useEffect, useState } from 'react';

import { NGNCardScreen } from '@/features/ngn/NGNCardScreen';
import type { BowTieContent, NGNCard } from '@/features/ngn/ngn.types';

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
  onChange: (content: BowTieContent) => void;
}

export function defaultBowTieContent(): BowTieContent {
  return {
    left_label:    'Actions to take',
    center_label:  'Primary condition',
    right_label:   'Parameters to monitor',
    left_opts:     ['', '', ''],
    left_correct:  [],
    center_opts:   ['', '', ''],
    center_correct: 0,
    right_opts:    ['', '', ''],
    right_correct: [],
  };
}

type SidePanel = 'left' | 'right';

export function BowTieForm({ initialData, onChange }: Props) {
  const [content, setContent] = useState<BowTieContent>(() =>
    initialData?.type === 'bow_tie'
      ? (initialData.content as BowTieContent)
      : defaultBowTieContent(),
  );

  useEffect(() => { onChange(content); }, [content, onChange]);

  const max_points =
    content.left_correct.length + 1 + content.right_correct.length || 1;

  const previewCard = makePreviewCard(initialData, 'bow_tie', content, max_points, 'rationale');

  // ─── Side panel mutators ───
  function setSideLabel(side: SidePanel, v: string) {
    setContent(c => ({ ...c, [`${side}_label`]: v }) as BowTieContent);
  }
  function setSideOpt(side: SidePanel, i: number, v: string) {
    const key = `${side}_opts` as 'left_opts' | 'right_opts';
    setContent(c => ({
      ...c,
      [key]: c[key].map((o, j) => (j === i ? v : o)),
    }) as BowTieContent);
  }
  function addSideOpt(side: SidePanel) {
    const key = `${side}_opts` as 'left_opts' | 'right_opts';
    setContent(c => ({ ...c, [key]: [...c[key], ''] }) as BowTieContent);
  }
  function removeSideOpt(side: SidePanel, i: number) {
    const optsKey = `${side}_opts` as 'left_opts' | 'right_opts';
    const correctKey = `${side}_correct` as 'left_correct' | 'right_correct';
    setContent(c => ({
      ...c,
      [optsKey]: c[optsKey].filter((_, j) => j !== i),
      [correctKey]: c[correctKey]
        .filter(ci => ci !== i)
        .map(ci => (ci > i ? ci - 1 : ci)),
    }) as BowTieContent);
  }
  function toggleSideCorrect(side: SidePanel, i: number) {
    const key = `${side}_correct` as 'left_correct' | 'right_correct';
    setContent(c => {
      const set = new Set(c[key]);
      if (set.has(i)) set.delete(i);
      else set.add(i);
      return {
        ...c,
        [key]: Array.from(set).sort((a, b) => a - b),
      } as BowTieContent;
    });
  }

  // ─── Center mutators ───
  function setCenterLabel(v: string) {
    setContent(c => ({ ...c, center_label: v }));
  }
  function setCenterOpt(i: number, v: string) {
    setContent(c => ({
      ...c,
      center_opts: c.center_opts.map((o, j) => (j === i ? v : o)),
    }));
  }
  function addCenterOpt() {
    setContent(c => ({ ...c, center_opts: [...c.center_opts, ''] }));
  }
  function removeCenterOpt(i: number) {
    setContent(c => {
      const opts = c.center_opts.filter((_, j) => j !== i);
      const center_correct =
        c.center_correct === i ? 0 :
        c.center_correct > i ? c.center_correct - 1 : c.center_correct;
      return { ...c, center_opts: opts, center_correct };
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {(['left', 'right'] as const).map(side => (
        <FormSection key={side} title={`${side === 'left' ? 'Left' : 'Right'} panel`}>
          <input
            type="text"
            value={content[`${side}_label`]}
            onChange={(e) => setSideLabel(side, e.target.value)}
            placeholder={`${side} label`}
            aria-label={`${side} panel label`}
            style={inputStyle}
          />
          {(content[`${side}_opts`] as string[]).map((opt: string, i: number) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={(content[`${side}_correct`] as number[]).includes(i)}
                onChange={() => toggleSideCorrect(side, i)}
                aria-label={`Mark ${side} option ${i + 1} correct`}
                style={{ accentColor: GOLD, cursor: 'pointer' }}
              />
              <input
                type="text"
                value={opt}
                onChange={(e) => setSideOpt(side, i, e.target.value)}
                placeholder={`${side} option ${i + 1}`}
                aria-label={`${side} option ${i + 1} text`}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => removeSideOpt(side, i)}
                disabled={(content[`${side}_opts`] as string[]).length <= 2}
                aria-label={`Remove ${side} option ${i + 1}`}
                style={{
                  ...iconBtnStyle,
                  opacity: (content[`${side}_opts`] as string[]).length <= 2 ? 0.3 : 1,
                  cursor: (content[`${side}_opts`] as string[]).length <= 2 ? 'not-allowed' : 'pointer',
                }}
              >
                ×
              </button>
            </div>
          ))}
          <button type="button" onClick={() => addSideOpt(side)} style={addBtnStyle}>
            + Add {side} option
          </button>
        </FormSection>
      ))}

      <FormSection title="Center panel · single correct">
        <input
          type="text"
          value={content.center_label}
          onChange={(e) => setCenterLabel(e.target.value)}
          placeholder="Center label"
          aria-label="Center panel label"
          style={inputStyle}
        />
        {content.center_opts.map((opt, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="radio"
              name="bowtie-center"
              checked={content.center_correct === i}
              onChange={() => setContent(c => ({ ...c, center_correct: i }))}
              aria-label={`Mark center option ${i + 1} correct`}
              style={{ accentColor: GOLD, cursor: 'pointer' }}
            />
            <input
              type="text"
              value={opt}
              onChange={(e) => setCenterOpt(i, e.target.value)}
              placeholder={`Center option ${i + 1}`}
              aria-label={`Center option ${i + 1} text`}
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => removeCenterOpt(i)}
              disabled={content.center_opts.length <= 2}
              aria-label={`Remove center option ${i + 1}`}
              style={{
                ...iconBtnStyle,
                opacity: content.center_opts.length <= 2 ? 0.3 : 1,
                cursor: content.center_opts.length <= 2 ? 'not-allowed' : 'pointer',
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" onClick={addCenterOpt} style={addBtnStyle}>
          + Add center option
        </button>
      </FormSection>

      <PreviewBox>
        <NGNCardScreen card={previewCard} mode="study" onAnswer={() => {}} />
      </PreviewBox>
    </div>
  );
}
