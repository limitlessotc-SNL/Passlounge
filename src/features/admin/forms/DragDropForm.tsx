// src/features/admin/forms/DragDropForm.tsx
//
// Authors a drag-drop assignment item: items[] + zones[] + a per-item
// correct_mapping (item index → zone name). Removing a zone scrubs any
// mappings pointing at it; removing an item drops its mapping entry.

import { useEffect, useState } from 'react';

import { NGNCardScreen } from '@/features/ngn/NGNCardScreen';
import type { DragDropContent, NGNCard } from '@/features/ngn/ngn.types';

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

interface Props {
  initialData?: NGNCard;
  onChange: (content: DragDropContent) => void;
}

export function defaultDragDropContent(): DragDropContent {
  return {
    items: ['', '', ''],
    zones: ['Zone A', 'Zone B'],
    correct_mapping: {},
  };
}

export function DragDropForm({ initialData, onChange }: Props) {
  const [content, setContent] = useState<DragDropContent>(() =>
    initialData?.type === 'drag_drop'
      ? (initialData.content as DragDropContent)
      : defaultDragDropContent(),
  );

  useEffect(() => { onChange(content); }, [content, onChange]);

  // ─── Item mutators ───
  function setItem(i: number, v: string) {
    setContent(c => ({ ...c, items: c.items.map((it, j) => (j === i ? v : it)) }));
  }
  function addItem() {
    setContent(c => ({ ...c, items: [...c.items, ''] }));
  }
  function removeItem(i: number) {
    setContent(c => {
      const items = c.items.filter((_, j) => j !== i);
      // Re-key correct_mapping: drop entry for i, shift higher indices down.
      const correct_mapping: Record<string, string> = {};
      for (const [idStr, zone] of Object.entries(c.correct_mapping)) {
        const id = Number(idStr);
        if (id === i) continue;
        correct_mapping[String(id > i ? id - 1 : id)] = zone;
      }
      return { ...c, items, correct_mapping };
    });
  }

  // ─── Zone mutators ───
  function setZone(i: number, v: string) {
    setContent(c => {
      const oldZone = c.zones[i];
      const zones = c.zones.map((z, j) => (j === i ? v : z));
      // Update any correct_mapping entries that pointed at the old zone name.
      const correct_mapping: Record<string, string> = {};
      for (const [idStr, zone] of Object.entries(c.correct_mapping)) {
        correct_mapping[idStr] = zone === oldZone ? v : zone;
      }
      return { ...c, zones, correct_mapping };
    });
  }
  function addZone() {
    setContent(c => ({
      ...c,
      zones: [...c.zones, `Zone ${String.fromCharCode(65 + c.zones.length)}`],
    }));
  }
  function removeZone(i: number) {
    setContent(c => {
      if (c.zones.length <= 2) return c;
      const removed = c.zones[i];
      const zones = c.zones.filter((_, j) => j !== i);
      // Drop any correct_mapping entries pointing at the removed zone.
      const correct_mapping: Record<string, string> = {};
      for (const [idStr, zone] of Object.entries(c.correct_mapping)) {
        if (zone !== removed) correct_mapping[idStr] = zone;
      }
      return { ...c, zones, correct_mapping };
    });
  }

  // ─── Mapping mutators ───
  function setMapping(itemIdx: number, zone: string) {
    setContent(c => ({
      ...c,
      correct_mapping: { ...c.correct_mapping, [String(itemIdx)]: zone },
    }));
  }

  function setMaxPerZone(n: number) {
    setContent(c => {
      if (n <= 0) {
        const next = { ...c };
        delete next.max_per_zone;
        return next;
      }
      return { ...c, max_per_zone: n };
    });
  }

  const max_points = content.items.length || 1;
  const previewCard = makePreviewCard(initialData, 'drag_drop', content, max_points, '0/1');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FormSection title="Items">
        {content.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={item}
              onChange={(e) => setItem(i, e.target.value)}
              placeholder={`Item ${i + 1}`}
              aria-label={`Item ${i + 1} text`}
              style={inputStyle}
            />
            <select
              value={content.correct_mapping[String(i)] ?? ''}
              onChange={(e) => setMapping(i, e.target.value)}
              aria-label={`Correct zone for item ${i + 1}`}
              style={{
                ...inputStyle,
                flex: 'none',
                width: 140,
                cursor: 'pointer',
              }}
            >
              <option value="" disabled>Correct zone…</option>
              {content.zones.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeItem(i)}
              disabled={content.items.length <= 1}
              aria-label={`Remove item ${i + 1}`}
              style={{
                ...iconBtnStyle,
                opacity: content.items.length <= 1 ? 0.3 : 1,
                cursor: content.items.length <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" onClick={addItem} style={addBtnStyle}>
          + Add item
        </button>
      </FormSection>

      <FormSection title="Zones">
        {content.zones.map((zone, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={zone}
              onChange={(e) => setZone(i, e.target.value)}
              placeholder={`Zone ${i + 1}`}
              aria-label={`Zone ${i + 1} text`}
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => removeZone(i)}
              disabled={content.zones.length <= 2}
              aria-label={`Remove zone ${i + 1}`}
              style={{
                ...iconBtnStyle,
                opacity: content.zones.length <= 2 ? 0.3 : 1,
                cursor: content.zones.length <= 2 ? 'not-allowed' : 'pointer',
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" onClick={addZone} style={addBtnStyle}>
          + Add zone
        </button>
      </FormSection>

      <FormSection title="Max items per zone (0 = unlimited)">
        <input
          type="number"
          min={0}
          value={content.max_per_zone ?? 0}
          onChange={(e) => setMaxPerZone(Number(e.target.value))}
          aria-label="Max items per zone"
          style={numberInputStyle}
        />
      </FormSection>

      <div style={{
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
        marginTop: -4,
      }}>
        {Object.keys(content.correct_mapping).length} / {content.items.length}
        {' '}items have a correct zone assigned.{' '}
        <span style={{ color: GOLD }}>
          Items without an assignment can never score.
        </span>
      </div>

      <PreviewBox>
        <NGNCardScreen card={previewCard} mode="study" onAnswer={() => {}} />
      </PreviewBox>
    </div>
  );
}
