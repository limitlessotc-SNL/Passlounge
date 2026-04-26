// src/features/ngn/DragDropCard.tsx
//
// Click-to-assign assignment card. Native drag-and-drop is unreliable on
// mobile and inaccessible by default; we use the same pattern Trello-on-
// touch does — click an item to select, click a zone to drop it. Re-clicking
// an assigned item moves it. Re-clicking a zone with the same item removes it.

import { useMemo, useState } from 'react';

import type { DragDropContent, NGNAnswer, NGNCard, NGNScoreResult } from './ngn.types';

const GOLD = '#F5C518';
const GREEN = 'rgba(74,222,128,0.9)';
const RED   = 'rgba(248,113,113,0.9)';

interface Props {
  card: NGNCard;
  onAnswer: (answer: NGNAnswer) => void;
  mode: 'study' | 'test';
  scoreResult?: NGNScoreResult;
}

export function DragDropCard({ card, onAnswer, mode, scoreResult }: Props) {
  const content = card.content as DragDropContent;
  const submitted = !!scoreResult;
  const showFeedback = mode === 'study' && submitted;

  /** itemIndex (string) → zone name. Items not yet assigned are absent. */
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [activeItem, setActiveItem] = useState<string | null>(null);

  function handleItemClick(itemId: string) {
    if (submitted) return;
    setActiveItem(prev => (prev === itemId ? null : itemId));
  }

  function handleZoneClick(zone: string) {
    if (submitted || activeItem === null) return;
    // Honor max-per-zone if set.
    if (content.max_per_zone) {
      const occupants = Object.entries(mapping).filter(([, z]) => z === zone).length;
      const wasInZone = mapping[activeItem] === zone;
      if (!wasInZone && occupants >= content.max_per_zone) return;
    }
    setMapping(prev => ({ ...prev, [activeItem]: zone }));
    setActiveItem(null);
  }

  function clearItem(itemId: string) {
    if (submitted) return;
    setMapping(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }

  const allAssigned = content.items.every((_, i) => mapping[String(i)] !== undefined);

  function submit() {
    if (!allAssigned || submitted) return;
    onAnswer({ mapping });
  }

  const itemsByZone = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const z of content.zones) map[z] = [];
    for (const [id, zone] of Object.entries(mapping)) {
      if (!map[zone]) map[zone] = [];
      map[zone].push(id);
    }
    return map;
  }, [content.zones, mapping]);

  return (
    <div data-testid="drag-drop-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {!submitted && activeItem !== null && (
        <div style={{
          padding: '8px 12px',
          background: 'rgba(245,197,24,0.10)',
          border: '1px solid rgba(245,197,24,0.35)',
          borderRadius: 10,
          fontSize: 12,
          color: GOLD,
          fontWeight: 700,
        }}>
          Tap a zone to place "{content.items[Number(activeItem)]}", or tap the item again to cancel.
        </div>
      )}

      {/* Items pool */}
      <div>
        <div style={{
          fontSize: 11, textTransform: 'uppercase', letterSpacing: 1,
          color: 'rgba(255,255,255,0.45)', fontWeight: 700, marginBottom: 6,
        }}>Items</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {content.items.map((item, i) => {
            const id = String(i);
            const isActive = activeItem === id;
            const assignedZone = mapping[id];
            const isAssigned = assignedZone !== undefined;
            const isCorrect = showFeedback && assignedZone === content.correct_mapping[id];
            const isWrong = showFeedback && isAssigned && !isCorrect;
            let bg = 'rgba(255,255,255,0.04)';
            let border = '1.5px solid rgba(255,255,255,0.1)';
            let color = 'rgba(255,255,255,0.85)';
            if (showFeedback) {
              if (isCorrect) { bg = 'rgba(74,222,128,0.14)'; border = `1.5px solid ${GREEN}`; color = GREEN; }
              else if (isWrong) { bg = 'rgba(248,113,113,0.14)'; border = `1.5px solid ${RED}`; color = RED; }
            } else if (isActive) {
              bg = 'rgba(245,197,24,0.18)'; border = `2px solid ${GOLD}`; color = GOLD;
            } else if (isAssigned) {
              bg = 'rgba(245,197,24,0.06)'; border = `1.5px solid rgba(245,197,24,0.4)`; color = 'rgba(245,197,24,0.8)';
            }
            return (
              <button
                key={id}
                onClick={() => handleItemClick(id)}
                disabled={submitted}
                aria-label={`Item ${item}${isAssigned ? ` (in ${assignedZone})` : ''}`}
                aria-pressed={isActive}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: bg,
                  border,
                  color,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "'Outfit', sans-serif",
                  cursor: submitted ? 'default' : 'pointer',
                }}
              >
                {item}
                {isAssigned && !showFeedback && (
                  <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>· {assignedZone}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Zones */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(content.zones.length, 3)}, 1fr)`,
        gap: 10,
      }}>
        {content.zones.map((zone) => {
          const occupants = itemsByZone[zone] ?? [];
          return (
            <button
              key={zone}
              onClick={() => handleZoneClick(zone)}
              disabled={submitted || activeItem === null}
              aria-label={`Zone ${zone}`}
              style={{
                minHeight: 90,
                padding: 12,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.03)',
                border: activeItem !== null && !submitted
                  ? `2px dashed ${GOLD}`
                  : '1.5px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.85)',
                cursor: submitted || activeItem === null ? 'default' : 'pointer',
                fontFamily: "'Outfit', sans-serif",
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <span style={{
                fontSize: 11, textTransform: 'uppercase', letterSpacing: 1,
                color: 'rgba(255,255,255,0.5)', fontWeight: 700,
              }}>{zone}</span>
              {occupants.length === 0 && (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Empty</span>
              )}
              {occupants.map(id => (
                <span
                  key={id}
                  onClick={(e) => { e.stopPropagation(); clearItem(id); }}
                  style={{
                    fontSize: 12, fontWeight: 600,
                    color: showFeedback
                      ? (mapping[id] === content.correct_mapping[id] ? GREEN : RED)
                      : 'rgba(245,197,24,0.95)',
                  }}
                >
                  • {content.items[Number(id)]}
                </span>
              ))}
            </button>
          );
        })}
      </div>

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
          disabled={!allAssigned}
          style={{
            padding: '12px 14px',
            borderRadius: 12,
            background: allAssigned ? GOLD : 'rgba(255,255,255,0.06)',
            color: allAssigned ? '#053571' : 'rgba(255,255,255,0.3)',
            border: 'none',
            fontSize: 14,
            fontWeight: 800,
            fontFamily: "'Outfit', sans-serif",
            cursor: allAssigned ? 'pointer' : 'default',
          }}
        >
          Submit Answer →
        </button>
      )}
    </div>
  );
}
