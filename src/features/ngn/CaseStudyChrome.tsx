// src/features/ngn/CaseStudyChrome.tsx
//
// NCSBN-style case-study presentation wrapper. Renders a purple banner +
// tabbed case file panel. Layout:
//
//   • <768px (phones): tabs + body stack vertically above the question.
//   • ≥768px (tablet+): two-pane side-by-side, case file left, question
//     body right — matches the NCSBN exam UI.
//
// Scoring is unchanged — this component only owns presentation. The caller
// renders its own question body via `children`.

import { useEffect, useState } from 'react';

import type { CaseStudyTab, NGNQuestionType } from './ngn.types';

const NCSBN_PURPLE = '#5b3691';

const TYPE_LABEL: Record<NGNQuestionType, string> = {
  mcq:               'Multiple Choice',
  extended_mr_n:     'Extended Multiple Response · Select N',
  extended_mr_all:   'Extended Multiple Response',
  bow_tie:           'Bow-Tie',
  matrix:            'Matrix Multiple Choice',
  cloze:             'Cloze (Drop-Down)',
  drag_drop:         'Drag and Drop',
  trend:             'Trend',
};

interface Props {
  type:     NGNQuestionType;
  tabs:     CaseStudyTab[];
  /** Brief sentence above the question stem (still useful in case-study mode). */
  scenario?: string;
  /** Question stem rendered in the right pane on tablet+ / above the body on phone. */
  question:  string;
  /** Existing answer body (ExtendedMRCard, MatrixCard, etc.). */
  children:  React.ReactNode;
}

/**
 * Tracks `window.innerWidth` so we can flip the layout at the 768px
 * breakpoint without a CSS solution. Avoids needing a media-query
 * stylesheet for one component; the hook re-runs only on resize events.
 */
function useIsTabletPlus(): boolean {
  const [isTabletPlus, setIsTabletPlus] = useState(() =>
    typeof window === 'undefined' ? false : window.innerWidth >= 768,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setIsTabletPlus(window.innerWidth >= 768);
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isTabletPlus;
}

export function CaseStudyChrome({ type, tabs, scenario, question, children }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const isTabletPlus = useIsTabletPlus();
  const safeTabs = tabs.length > 0 ? tabs : [{ label: 'Case', body: '' }];
  const active = safeTabs[Math.min(activeIdx, safeTabs.length - 1)];

  return (
    <div
      data-testid="case-study-chrome"
      style={{
        marginBottom: 16,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        overflow: 'hidden',
        fontFamily: "'Outfit', 'Inter', sans-serif",
      }}
    >
      {/* Purple banner */}
      <div
        data-testid="case-study-banner"
        style={{
          background: NCSBN_PURPLE,
          color: '#fff',
          padding: '10px 16px',
          fontSize: 16,
          fontWeight: 800,
          letterSpacing: 0.5,
        }}
      >
        {TYPE_LABEL[type] ?? 'Case Study'}
      </div>

      <div
        data-testid="case-study-body"
        style={{
          display: 'grid',
          gridTemplateColumns: isTabletPlus ? '1fr 1fr' : '1fr',
          gap: 0,
        }}
      >
        {/* Left pane — tabbed case file */}
        <div
          data-testid="case-study-left"
          style={{
            borderRight: isTabletPlus ? '1px solid rgba(255,255,255,0.08)' : 'none',
            borderBottom: isTabletPlus ? 'none' : '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.02)',
            padding: 12,
          }}
        >
          <div
            role="tablist"
            aria-label="Case study tabs"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4,
              marginBottom: 10,
            }}
          >
            {safeTabs.map((t, i) => (
              <button
                key={`${t.label}-${i}`}
                type="button"
                role="tab"
                aria-selected={activeIdx === i}
                data-testid={`case-study-tab-${i}`}
                onClick={() => setActiveIdx(i)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px 8px 0 0',
                  background: activeIdx === i
                    ? 'rgba(91,54,145,0.25)'
                    : 'rgba(255,255,255,0.04)',
                  border: activeIdx === i
                    ? `1.5px solid ${NCSBN_PURPLE}`
                    : '1px solid rgba(255,255,255,0.08)',
                  borderBottom: activeIdx === i ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  color: activeIdx === i ? '#fff' : 'rgba(255,255,255,0.65)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'Outfit', sans-serif",
                  whiteSpace: 'nowrap' as const,
                }}
              >
                {t.label || `Tab ${i + 1}`}
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            aria-labelledby={`case-study-tab-${activeIdx}`}
            data-testid="case-study-tab-body"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 10,
              padding: 14,
              fontSize: 13.5,
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.85)',
              whiteSpace: 'pre-wrap' as const,
              minHeight: 120,
            }}
          >
            {active.body || (
              <span style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                (No content for this tab.)
              </span>
            )}
          </div>
        </div>

        {/* Right pane — question + body */}
        <div
          data-testid="case-study-right"
          style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          {scenario && (
            <div style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.5,
              fontStyle: 'italic' as const,
            }}>
              {scenario}
            </div>
          )}
          <div style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.5,
          }}>
            {question}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
