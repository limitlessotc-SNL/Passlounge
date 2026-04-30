// src/features/admin/forms/_shared.tsx
//
// Tiny set of presentational primitives shared by every NGN authoring
// form. Kept here so the seven form files don't each re-invent the same
// dark-theme input styling, and so the live-preview rendering pattern
// (synthesize an NGNCard, hand it to NGNCardScreen) lives in one place.

import type { CSSProperties, ReactNode } from 'react';

import type {
  NGNCard,
  NGNContent,
  NGNQuestionType,
  NGNScoringRule,
} from '@/features/ngn/ngn.types';

export const GOLD = '#F5C518';

export const inputStyle: CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff',
  fontSize: 14,
  fontFamily: "'Outfit', sans-serif",
  outline: 'none',
};

export const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 64,
  lineHeight: 1.5,
  resize: 'vertical',
};

export const numberInputStyle: CSSProperties = {
  ...inputStyle,
  flex: 'none',
  width: 70,
  textAlign: 'center',
};

export const iconBtnStyle: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  background: 'rgba(248,113,113,0.1)',
  border: '1px solid rgba(248,113,113,0.3)',
  color: 'rgba(248,113,113,0.9)',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: "'Outfit', sans-serif",
  flexShrink: 0,
};

export const addBtnStyle: CSSProperties = {
  marginTop: 8,
  padding: '8px 14px',
  borderRadius: 8,
  background: 'rgba(245,197,24,0.08)',
  border: '1px solid rgba(245,197,24,0.3)',
  color: GOLD,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: "'Outfit', sans-serif",
  alignSelf: 'flex-start',
};

export const sectionTitleStyle: CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 1,
  color: 'rgba(255,255,255,0.45)',
  fontWeight: 700,
  marginBottom: 6,
};

export const fieldLabelStyle: CSSProperties = {
  fontSize: 12,
  color: 'rgba(255,255,255,0.55)',
  fontWeight: 600,
  marginBottom: 4,
};

// ─── Wrappers ─────────────────────────────────────────────────────────

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={sectionTitleStyle}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

export function PreviewBox({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="form-preview"
      style={{
        marginTop: 6,
        background: 'rgba(255,255,255,0.02)',
        border: '1px dashed rgba(245,197,24,0.35)',
        borderRadius: 14,
        padding: 12,
      }}
    >
      <div style={{ ...sectionTitleStyle, color: GOLD }}>Live preview · study mode</div>
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  );
}

// ─── Synthesize a preview NGNCard ────────────────────────────────────
//
// The admin authoring forms only own the type-specific `content`. To feed
// the player components, we need a full NGNCard — so we splice the live
// content into either initialData (edit mode) or a placeholder card.

const PLACEHOLDER_META = {
  id: 'preview',
  title: 'Preview',
  scenario: '',
  question: 'Question preview',
  nclex_category: 'Management of Care',
  difficulty_level: 3,
  rationale: '',
  source: '',
};

export function makePreviewCard(
  initialData: NGNCard | undefined,
  type: NGNQuestionType,
  content: NGNContent,
  max_points: number,
  scoring_rule: NGNScoringRule,
): NGNCard {
  const base = initialData ?? PLACEHOLDER_META;
  return {
    id:               base.id ?? 'preview',
    title:            base.title ?? 'Preview',
    scenario:         base.scenario ?? '',
    question:         base.question || 'Question preview',
    type,
    nclex_category:   base.nclex_category ?? 'Management of Care',
    difficulty_level: base.difficulty_level ?? 3,
    scoring_rule,
    max_points,
    content,
    rationale:        base.rationale ?? '',
    source:           base.source ?? '',
  };
}
