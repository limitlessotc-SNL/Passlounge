// src/features/admin/forms/MatrixForm.tsx
//
// Authors a matrix-grid item: columns + rows, each row has a single correct
// column. Adding/removing columns shifts row.correct_col indices to keep
// them valid.

import { useEffect, useState } from 'react';

import { NGNCardScreen } from '@/features/ngn/NGNCardScreen';
import type { MatrixContent, NGNCard } from '@/features/ngn/ngn.types';

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
  onChange: (content: MatrixContent) => void;
}

export function defaultMatrixContent(): MatrixContent {
  return {
    columns: ['Anticipated', 'Unanticipated'],
    rows: [
      { label: '', correct_col: 0 },
      { label: '', correct_col: 0 },
      { label: '', correct_col: 0 },
    ],
  };
}

export function MatrixForm({ initialData, onChange }: Props) {
  const [content, setContent] = useState<MatrixContent>(() =>
    initialData?.type === 'matrix'
      ? (initialData.content as MatrixContent)
      : defaultMatrixContent(),
  );

  useEffect(() => { onChange(content); }, [content, onChange]);

  // ─── Column mutators ───
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
      const columns = c.columns.filter((_, j) => j !== i);
      const rows = c.rows.map(r => ({
        ...r,
        correct_col:
          r.correct_col === i ? 0 :
          r.correct_col > i ? r.correct_col - 1 : r.correct_col,
      }));
      return { columns, rows };
    });
  }

  // ─── Row mutators ───
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
    setContent(c => ({
      ...c,
      rows: [...c.rows, { label: '', correct_col: 0 }],
    }));
  }
  function removeRow(i: number) {
    setContent(c => {
      if (c.rows.length <= 1) return c;
      return { ...c, rows: c.rows.filter((_, j) => j !== i) };
    });
  }

  const max_points = content.rows.length || 1;
  const previewCard = makePreviewCard(initialData, 'matrix', content, max_points, '0/1');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FormSection title="Columns">
        {content.columns.map((col, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={col}
              onChange={(e) => setColumn(i, e.target.value)}
              placeholder={`Column ${i + 1}`}
              aria-label={`Column ${i + 1} text`}
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => removeColumn(i)}
              disabled={content.columns.length <= 2}
              aria-label={`Remove column ${i + 1}`}
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
          + Add column
        </button>
      </FormSection>

      <FormSection title="Rows · pick the correct column for each">
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
                aria-label={`Row ${i + 1} label`}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                disabled={content.rows.length <= 1}
                aria-label={`Remove row ${i + 1}`}
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
                    name={`matrix-row-${i}`}
                    checked={row.correct_col === j}
                    onChange={() => setRowCorrect(i, j)}
                    aria-label={`Row ${i + 1} correct: ${col}`}
                    style={{ accentColor: GOLD, cursor: 'pointer' }}
                  />
                  {col || `Col ${j + 1}`}
                </label>
              ))}
            </div>
          </div>
        ))}
        <button type="button" onClick={addRow} style={addBtnStyle}>
          + Add row
        </button>
      </FormSection>

      <PreviewBox>
        <NGNCardScreen card={previewCard} mode="study" onAnswer={() => {}} />
      </PreviewBox>
    </div>
  );
}
