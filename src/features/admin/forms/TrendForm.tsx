// src/features/admin/forms/TrendForm.tsx
//
// Authors a Trend item: an exhibit table (vitals/labs across timestamps)
// + a Matrix-style response (rows × columns with one correct column per row).
// The response shape mirrors MatrixForm so the inline editor here repeats
// some of MatrixForm — DRYing further would require an extracted grid
// component, and the divergent exhibit editor wouldn't share it.

import { useEffect, useState } from 'react';

import { NGNCardScreen } from '@/features/ngn/NGNCardScreen';
import type { NGNCard, TrendContent } from '@/features/ngn/ngn.types';

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
  onChange: (content: TrendContent) => void;
}

export function defaultTrendContent(): TrendContent {
  return {
    exhibit: {
      headers: ['Time', 'BP', 'HR', 'SpO2'],
      rows: [
        ['08:00', '', '', ''],
        ['09:00', '', '', ''],
        ['10:00', '', '', ''],
      ],
    },
    question_type: 'matrix',
    columns: ['Effective', 'Ineffective'],
    rows: [
      { label: '', correct_col: 0 },
      { label: '', correct_col: 0 },
      { label: '', correct_col: 0 },
    ],
  };
}

export function TrendForm({ initialData, onChange }: Props) {
  const [content, setContent] = useState<TrendContent>(() =>
    initialData?.type === 'trend'
      ? (initialData.content as TrendContent)
      : defaultTrendContent(),
  );

  useEffect(() => { onChange(content); }, [content, onChange]);

  // ─── Exhibit mutators ───
  function setHeader(i: number, v: string) {
    setContent(c => ({
      ...c,
      exhibit: {
        ...c.exhibit,
        headers: c.exhibit.headers.map((h, j) => (j === i ? v : h)),
      },
    }));
  }
  function addHeader() {
    setContent(c => ({
      ...c,
      exhibit: {
        ...c.exhibit,
        headers: [...c.exhibit.headers, `Col ${c.exhibit.headers.length + 1}`],
        rows: c.exhibit.rows.map(r => [...r, '']),
      },
    }));
  }
  function removeHeader(i: number) {
    setContent(c => {
      if (c.exhibit.headers.length <= 1) return c;
      return {
        ...c,
        exhibit: {
          ...c.exhibit,
          headers: c.exhibit.headers.filter((_, j) => j !== i),
          rows: c.exhibit.rows.map(r => r.filter((_, j) => j !== i)),
        },
      };
    });
  }
  function setExhibitCell(rowIdx: number, colIdx: number, v: string) {
    setContent(c => ({
      ...c,
      exhibit: {
        ...c.exhibit,
        rows: c.exhibit.rows.map((r, ri) =>
          ri === rowIdx ? r.map((cell, ci) => (ci === colIdx ? v : cell)) : r,
        ),
      },
    }));
  }
  function addExhibitRow() {
    setContent(c => ({
      ...c,
      exhibit: {
        ...c.exhibit,
        rows: [...c.exhibit.rows, c.exhibit.headers.map(() => '')],
      },
    }));
  }
  function removeExhibitRow(i: number) {
    setContent(c => {
      if (c.exhibit.rows.length <= 1) return c;
      return {
        ...c,
        exhibit: {
          ...c.exhibit,
          rows: c.exhibit.rows.filter((_, j) => j !== i),
        },
      };
    });
  }

  // ─── Response columns / rows ───
  function setColumn(i: number, v: string) {
    setContent(c => ({
      ...c,
      columns: c.columns.map((col, j) => (j === i ? v : col)),
    }));
  }
  function addColumn() {
    setContent(c => ({ ...c, columns: [...c.columns, `Col ${c.columns.length + 1}`] }));
  }
  function removeColumn(i: number) {
    setContent(c => {
      if (c.columns.length <= 2) return c;
      return {
        ...c,
        columns: c.columns.filter((_, j) => j !== i),
        rows: c.rows.map(r => ({
          ...r,
          correct_col:
            r.correct_col === i ? 0 :
            r.correct_col > i ? r.correct_col - 1 : r.correct_col,
        })),
      };
    });
  }
  function setRowLabel(i: number, v: string) {
    setContent(c => ({
      ...c,
      rows: c.rows.map((r, j) => (j === i ? { ...r, label: v } : r)),
    }));
  }
  function setRowCorrect(i: number, col: number) {
    setContent(c => ({
      ...c,
      rows: c.rows.map((r, j) => (j === i ? { ...r, correct_col: col } : r)),
    }));
  }
  function addRow() {
    setContent(c => ({ ...c, rows: [...c.rows, { label: '', correct_col: 0 }] }));
  }
  function removeRow(i: number) {
    setContent(c => {
      if (c.rows.length <= 1) return c;
      return { ...c, rows: c.rows.filter((_, j) => j !== i) };
    });
  }

  const max_points = content.rows.length || 1;
  const previewCard = makePreviewCard(initialData, 'trend', content, max_points, '0/1');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FormSection title="Exhibit · headers (first column is usually the time/label)">
        {content.exhibit.headers.map((h, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={h}
              onChange={(e) => setHeader(i, e.target.value)}
              placeholder={`Header ${i + 1}`}
              aria-label={`Exhibit header ${i + 1}`}
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => removeHeader(i)}
              disabled={content.exhibit.headers.length <= 1}
              aria-label={`Remove header ${i + 1}`}
              style={{
                ...iconBtnStyle,
                opacity: content.exhibit.headers.length <= 1 ? 0.3 : 1,
                cursor: content.exhibit.headers.length <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" onClick={addHeader} style={addBtnStyle}>
          + Add column
        </button>
      </FormSection>

      <FormSection title="Exhibit · data rows">
        {content.exhibit.rows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            style={{
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              padding: 8,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {row.map((cell, colIdx) => (
              <input
                key={colIdx}
                type="text"
                value={cell}
                onChange={(e) => setExhibitCell(rowIdx, colIdx, e.target.value)}
                placeholder={content.exhibit.headers[colIdx] ?? ''}
                aria-label={`Exhibit row ${rowIdx + 1} col ${colIdx + 1}`}
                style={{ ...inputStyle, flex: 1 }}
              />
            ))}
            <button
              type="button"
              onClick={() => removeExhibitRow(rowIdx)}
              disabled={content.exhibit.rows.length <= 1}
              aria-label={`Remove exhibit row ${rowIdx + 1}`}
              style={{
                ...iconBtnStyle,
                opacity: content.exhibit.rows.length <= 1 ? 0.3 : 1,
                cursor: content.exhibit.rows.length <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" onClick={addExhibitRow} style={addBtnStyle}>
          + Add exhibit row
        </button>
      </FormSection>

      <FormSection title="Response columns">
        {content.columns.map((col, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={col}
              onChange={(e) => setColumn(i, e.target.value)}
              placeholder={`Column ${i + 1}`}
              aria-label={`Response column ${i + 1}`}
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => removeColumn(i)}
              disabled={content.columns.length <= 2}
              aria-label={`Remove response column ${i + 1}`}
              style={{
                ...iconBtnStyle,
                opacity: content.columns.length <= 2 ? 0.3 : 1,
                cursor: content.columns.length <= 2 ? 'not-allowed' : 'pointer',
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" onClick={addColumn} style={addBtnStyle}>
          + Add response column
        </button>
      </FormSection>

      <FormSection title="Response rows · pick the correct column for each">
        {content.rows.map((row, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: 10,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                value={row.label}
                onChange={(e) => setRowLabel(i, e.target.value)}
                placeholder={`Row ${i + 1} label`}
                aria-label={`Response row ${i + 1} label`}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                disabled={content.rows.length <= 1}
                aria-label={`Remove response row ${i + 1}`}
                style={{
                  ...iconBtnStyle,
                  opacity: content.rows.length <= 1 ? 0.3 : 1,
                  cursor: content.rows.length <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                ×
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {content.columns.map((col, j) => (
                <label
                  key={j}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: 8,
                    background: row.correct_col === j ? 'rgba(245,197,24,0.12)' : 'rgba(255,255,255,0.04)',
                    border: row.correct_col === j ? `1.5px solid ${GOLD}` : '1.5px solid rgba(255,255,255,0.08)',
                    color: row.correct_col === j ? GOLD : 'rgba(255,255,255,0.7)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name={`trend-row-${i}`}
                    checked={row.correct_col === j}
                    onChange={() => setRowCorrect(i, j)}
                    aria-label={`Response row ${i + 1} correct: ${col}`}
                    style={{ accentColor: GOLD, cursor: 'pointer' }}
                  />
                  {col || `Col ${j + 1}`}
                </label>
              ))}
            </div>
          </div>
        ))}
        <button type="button" onClick={addRow} style={addBtnStyle}>
          + Add response row
        </button>
      </FormSection>

      <PreviewBox>
        <NGNCardScreen card={previewCard} mode="study" onAnswer={() => {}} />
      </PreviewBox>
    </div>
  );
}
