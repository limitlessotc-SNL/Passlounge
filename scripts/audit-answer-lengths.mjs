#!/usr/bin/env node
/**
 * Answer-length audit
 *
 * Loads every card from either a local JSON export or Supabase (anon key,
 * SELECT only) and flags cards where the correct option is more than 20%
 * longer than the longest wrong option — a strong signal students can
 * guess by length without reading the question.
 *
 * Output is written to src/data/answer_length_audit.json. The flagged
 * list is sorted by clinical-reasoning difficulty: L3 Analysis → L4
 * Complex → L5 Expert → L1 Foundation → L2 Application.
 *
 * No card content is modified. This is a read-only audit.
 *
 * Usage:
 *   node scripts/audit-answer-lengths.mjs
 *
 * Data source precedence:
 *   1. $CARDS_JSON_PATH env var (if set)
 *   2. supabase/cards_export.json (if it exists)
 *   3. Supabase anon-key SELECT (requires RLS to allow anon reads —
 *      most installs restrict to authenticated; in that case export
 *      the table from the Supabase dashboard as JSON instead).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const LENGTH_FLAG_THRESHOLD = 0.20 // correct > 20% longer than longest wrong
const DIFFICULTY_PRIORITY = [3, 4, 5, 1, 2]
const OUTPUT_PATH = resolve(ROOT, 'src', 'data', 'answer_length_audit.json')

// ─── Env file loader (no dotenv dep) ──────────────────────────────────────

function loadEnv(file) {
  const path = resolve(ROOT, file)
  if (!existsSync(path)) return {}
  const out = {}
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
  }
  return out
}

// ─── Card loading ────────────────────────────────────────────────────────

async function loadCards() {
  const override = process.env.CARDS_JSON_PATH
  if (override && existsSync(override)) {
    console.log(`Loading cards from ${override}`)
    return JSON.parse(readFileSync(override, 'utf8'))
  }

  const localExport = resolve(ROOT, 'supabase', 'cards_export.json')
  if (existsSync(localExport)) {
    console.log(`Loading cards from ${localExport}`)
    return JSON.parse(readFileSync(localExport, 'utf8'))
  }

  const env = { ...loadEnv('.env.development'), ...process.env }
  const url = env.VITE_SUPABASE_URL
  const anon = env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error(
      'No cards data source. Either:\n' +
        `  - export cards to ${localExport}\n` +
        '  - set CARDS_JSON_PATH\n' +
        '  - provide VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY',
    )
  }

  console.log(`Querying ${url} with anon key (RLS may limit reads)`)
  const supabase = createClient(url, anon)
  const { data, error } = await supabase
    .from('cards')
    .select(
      'id,title,cat,opts,correct,difficulty_level,difficulty_label,nclex_category,nclex_subcategory',
    )
    .order('id', { ascending: true })

  if (error) throw new Error(`Supabase error: ${error.message}`)
  if (!data || data.length === 0) {
    console.warn(
      '\n  ⚠  Supabase returned 0 rows. The cards RLS likely restricts SELECT\n' +
        '     to authenticated users. Export the table from the Supabase dashboard\n' +
        '     (Table Editor → cards → Export → JSON) and save as\n' +
        `     ${localExport}, then re-run.\n`,
    )
  }
  return data ?? []
}

// ─── Option text extraction ──────────────────────────────────────────────

function toOptionText(opt) {
  if (typeof opt === 'string') return opt
  if (opt == null) return ''
  if (typeof opt === 'object' && 'text' in opt) return String(opt.text)
  return String(opt)
}

function parseOpts(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return []
    }
  }
  return []
}

// ─── Analysis ────────────────────────────────────────────────────────────

function analyzeCard(card) {
  const opts = parseOpts(card.opts).map(toOptionText)
  const lengths = opts.map((o) => o.length)
  const correctIdx = Number(card.correct)
  const correctLen = lengths[correctIdx] ?? 0

  const wrongLens = lengths.filter((_, i) => i !== correctIdx)
  const longestWrong = wrongLens.length ? Math.max(...wrongLens) : 0
  const shortestWrong = wrongLens.length ? Math.min(...wrongLens) : 0
  const minLen = lengths.length ? Math.min(...lengths) : 0
  const maxLen = lengths.length ? Math.max(...lengths) : 0

  const correctVsLongestWrong =
    longestWrong > 0 ? (correctLen - longestWrong) / longestWrong : 0
  const overallSpread = maxLen > 0 ? (maxLen - minLen) / maxLen : 0
  const correctIsLongest = correctLen === maxLen && lengths.length > 1

  const letters = ['A', 'B', 'C', 'D']
  const correct_letter = letters[correctIdx] ?? null

  return {
    id: card.id,
    title: card.title,
    cat: card.cat,
    difficulty_level: card.difficulty_level ?? null,
    difficulty_label: card.difficulty_label ?? null,
    nclex_category: card.nclex_category ?? null,
    nclex_subcategory: card.nclex_subcategory ?? null,
    correct_index: correctIdx,
    correct_letter,
    len_a: lengths[0] ?? null,
    len_b: lengths[1] ?? null,
    len_c: lengths[2] ?? null,
    len_d: lengths[3] ?? null,
    correct_length: correctLen,
    longest_wrong_length: longestWrong,
    shortest_wrong_length: shortestWrong,
    overall_spread_pct: Math.round(overallSpread * 100),
    correct_vs_longest_wrong_pct: Math.round(correctVsLongestWrong * 100),
    correct_is_longest: correctIsLongest,
    flagged: correctVsLongestWrong > LENGTH_FLAG_THRESHOLD,
  }
}

function priorityRank(level) {
  const idx = DIFFICULTY_PRIORITY.indexOf(Number(level))
  return idx === -1 ? DIFFICULTY_PRIORITY.length : idx
}

function sortByPriority(a, b) {
  const ra = priorityRank(a.difficulty_level)
  const rb = priorityRank(b.difficulty_level)
  if (ra !== rb) return ra - rb
  // Within the same difficulty, worst offender first
  return b.correct_vs_longest_wrong_pct - a.correct_vs_longest_wrong_pct
}

// ─── Summary ─────────────────────────────────────────────────────────────

function buildSummary(analyzed) {
  const summary = {
    generated_at: new Date().toISOString(),
    length_flag_threshold_pct: LENGTH_FLAG_THRESHOLD * 100,
    total_cards: analyzed.length,
    flagged_count: analyzed.filter((c) => c.flagged).length,
    by_difficulty: {},
    by_category: {},
  }
  summary.flagged_pct =
    summary.total_cards > 0
      ? Math.round((summary.flagged_count / summary.total_cards) * 100)
      : 0

  for (let lvl = 1; lvl <= 5; lvl++) {
    const total = analyzed.filter((c) => c.difficulty_level === lvl).length
    const flagged = analyzed.filter(
      (c) => c.difficulty_level === lvl && c.flagged,
    ).length
    summary.by_difficulty[`L${lvl}`] = { total, flagged }
  }

  const cats = new Set(analyzed.map((c) => c.cat).filter(Boolean))
  for (const cat of cats) {
    const total = analyzed.filter((c) => c.cat === cat).length
    const flagged = analyzed.filter((c) => c.cat === cat && c.flagged).length
    summary.by_category[cat] = { total, flagged }
  }

  return summary
}

// ─── Entry ───────────────────────────────────────────────────────────────

async function main() {
  const cards = await loadCards()
  if (!Array.isArray(cards)) {
    throw new Error('Loaded data is not an array')
  }

  console.log(`Analyzing ${cards.length} cards...`)
  const analyzed = cards.map(analyzeCard)
  const flagged = analyzed.filter((c) => c.flagged).sort(sortByPriority)
  const all = [...analyzed].sort(sortByPriority)

  const summary = buildSummary(analyzed)

  const output = {
    summary,
    flagged_priority: flagged,
    all_cards: all,
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n')

  console.log(`\n✓ Wrote ${OUTPUT_PATH}`)
  console.log(
    `  ${summary.flagged_count}/${summary.total_cards} cards flagged ` +
      `(${summary.flagged_pct}% have correct option >${summary.length_flag_threshold_pct}% longer than longest wrong)`,
  )

  console.log('\n  By difficulty:')
  for (let lvl = 1; lvl <= 5; lvl++) {
    const bucket = summary.by_difficulty[`L${lvl}`]
    if (!bucket || bucket.total === 0) continue
    console.log(`    L${lvl}: ${bucket.flagged}/${bucket.total} flagged`)
  }
}

main().catch((err) => {
  console.error('Audit failed:', err.message || err)
  process.exit(1)
})
