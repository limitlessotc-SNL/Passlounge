// src/features/dev/DevCardPreviewScreen.tsx
//
// Dev-only single-card preview at /dev/card/:id. Fetches an ngn_cards row
// by UUID and hands it to the production NGNCardScreen renderer so we
// spot-check the same component that ships. Mounted only when
// import.meta.env.DEV is true (route excluded from prod bundles).

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { supabase } from '@/config/supabase'
import { NGNCardScreen } from '@/features/ngn/NGNCardScreen'
import type { NGNCard, NGNScoreResult } from '@/features/ngn/ngn.types'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; card: NGNCard }

function mapRow(row: Record<string, unknown>): NGNCard {
  const content: NGNCard['content'] =
    typeof row.content === 'string'
      ? (safeParse(row.content) as NGNCard['content'])
      : ((row.content as NGNCard['content']) ?? ({} as NGNCard['content']))

  const tabsRaw = typeof row.case_study_tabs === 'string'
    ? safeParse(row.case_study_tabs)
    : row.case_study_tabs

  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? ''),
    scenario: String(row.scenario ?? ''),
    question: String(row.question ?? ''),
    type: (row.type ?? 'mcq') as NGNCard['type'],
    nclex_category: String(row.nclex_category ?? ''),
    difficulty_level: Number(row.difficulty_level ?? 3),
    scoring_rule: (row.scoring_rule ?? '0/1') as NGNCard['scoring_rule'],
    max_points: Number(row.max_points ?? 1),
    content,
    rationale: String(row.rationale ?? ''),
    source: String(row.source ?? ''),
    created_by: row.created_by ? String(row.created_by) : undefined,
    created_at: row.created_at ? String(row.created_at) : undefined,
    case_study_tabs: Array.isArray(tabsRaw) ? (tabsRaw as NGNCard['case_study_tabs']) : undefined,
  }
}

function safeParse<T = unknown>(s: string): T {
  try { return JSON.parse(s) as T } catch { return {} as T }
}

function difficultyLabel(level: number): string {
  switch (level) {
    case 1: return 'Foundation'
    case 2: return 'Application'
    case 3: return 'Analysis'
    case 4: return 'Complex'
    case 5: return 'Expert'
    default: return `L${level}`
  }
}

function envFromSupabaseUrl(url: string | undefined): { label: string; host: string } {
  if (!url) return { label: 'unknown', host: '—' }
  let host = url
  try { host = new URL(url).host } catch { /* keep raw */ }
  const lower = host.toLowerCase()
  let label: string
  if (lower.includes('staging') || lower.includes('stg')) label = 'staging'
  else if (lower.includes('prod')) label = 'prod'
  else if (lower.includes('localhost') || lower.includes('127.0.0.1')) label = 'local'
  else label = 'dev'
  return { label, host }
}

export function DevCardPreviewScreen() {
  const { id = '' } = useParams<{ id: string }>()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    ;(async () => {
      const { data, error } = await supabase
        .from('ngn_cards')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        setState({ status: 'error', message: error.message })
        return
      }
      if (!data) {
        setState({ status: 'error', message: 'No card found with that id.' })
        return
      }
      setState({ status: 'ready', card: mapRow(data as Record<string, unknown>) })
    })()
    return () => { cancelled = true }
  }, [id])

  const env = envFromSupabaseUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined)

  function handleAnswer(_r: NGNScoreResult) {
    /* preview-only — no persistence */
  }

  async function copyId(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore — clipboard may be blocked */
    }
  }

  const envColor =
    env.label === 'prod' ? '#f87171' :
    env.label === 'staging' ? '#fbbf24' :
    '#4ade80'

  return (
    <div
      data-testid="dev-card-preview"
      style={{
        minHeight: '100vh',
        background: '#0a1629',
        color: '#fff',
        fontFamily: "'Outfit', 'Inter', sans-serif",
      }}
    >
      {/* ─── Dev info bar ─── */}
      <div
        data-testid="dev-card-info-bar"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(10,22,41,0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(8px)',
          padding: '10px 16px',
          fontSize: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.16)',
              color: '#cbd5e1',
              fontWeight: 700,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              fontSize: 10,
            }}
          >
            Dev Preview
          </span>
          <span style={{ color: envColor, fontWeight: 700 }}>
            env: {env.label}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.55)' }}>{env.host}</span>
        </div>

        {state.status === 'ready' && (
          <div
            style={{
              marginTop: 6,
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              alignItems: 'center',
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            <span><b>title:</b> {state.card.title || '(no title)'}</span>
            <span><b>type:</b> {state.card.type}</span>
            <span><b>category:</b> {state.card.nclex_category || '—'}</span>
            <span><b>difficulty:</b> {difficultyLabel(state.card.difficulty_level)} (L{state.card.difficulty_level})</span>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
              {state.card.id}
            </span>
            <button
              type="button"
              onClick={() => copyId(state.card.id ?? id)}
              style={{
                padding: '4px 10px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.25)',
                background: 'rgba(255,255,255,0.06)',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {copied ? 'Copied ✓' : 'Copy UUID'}
            </button>
          </div>
        )}
      </div>

      {/* ─── Body ─── */}
      {state.status === 'loading' && (
        <div
          data-testid="dev-card-loading"
          style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}
        >
          Loading card {id}…
        </div>
      )}

      {state.status === 'error' && (
        <div
          data-testid="dev-card-error"
          style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}
        >
          <div style={{ fontSize: 18, fontWeight: 800, color: '#f87171', marginBottom: 10 }}>
            Card preview failed
          </div>
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.3)',
              color: 'rgba(255,255,255,0.85)',
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            <div><b>Requested id:</b> <span style={{ fontFamily: 'monospace' }}>{id || '(empty)'}</span></div>
            <div style={{ marginTop: 6 }}><b>Error:</b> {state.message}</div>
          </div>
        </div>
      )}

      {state.status === 'ready' && (
        <NGNCardScreen card={state.card} mode="study" onAnswer={handleAnswer} />
      )}
    </div>
  )
}
