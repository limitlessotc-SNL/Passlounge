/**
 * Supabase Seed Script
 *
 * Seeds all 31 cards (15 diagnostic + 16 study) into the Supabase cards table.
 * Reads from src/config/fallback-cards.ts — single source of truth.
 *
 * Usage:
 *   1. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment
 *      (service role key is required to bypass RLS for seeding)
 *   2. Run: node supabase/seed.mjs
 *
 * Owner: Senior Engineer
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Read env vars ─────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  console.error('✖ SUPABASE_URL not set')
  process.exit(1)
}
if (!SERVICE_ROLE_KEY) {
  console.error('✖ SUPABASE_SERVICE_ROLE_KEY not set (required to bypass RLS)')
  console.error('  Get it from: Supabase Dashboard → Project Settings → API → service_role key')
  process.exit(1)
}

// ─── Load fallback cards (compile the .ts file to extract the data) ───────
// Simple approach: read the file as text, extract the arrays.
// For a cleaner setup you'd compile via tsc, but this works for a seed script.

const fallbackPath = join(__dirname, '..', 'src', 'config', 'fallback-cards.ts')
const sourceText = readFileSync(fallbackPath, 'utf-8')

// Import via dynamic eval — strip TypeScript type annotations and export keywords
const jsCode = sourceText
  .replace(/import type .*?\n/g, '')
  .replace(/export const DIAGNOSTIC_CARDS: StudyCard\[\]/g, 'const DIAGNOSTIC_CARDS')
  .replace(/export const STUDY_CARDS: StudyCard\[\]/g, 'const STUDY_CARDS')

const evalFn = new Function(`${jsCode}; return { DIAGNOSTIC_CARDS, STUDY_CARDS }`)
const { DIAGNOSTIC_CARDS, STUDY_CARDS } = evalFn()

console.log(`Loaded ${DIAGNOSTIC_CARDS.length} diagnostic + ${STUDY_CARDS.length} study cards`)

// ─── Supabase client with service role (bypasses RLS) ──────────────────────

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── Seed function ─────────────────────────────────────────────────────────

async function seedCards() {
  // Clear existing cards
  console.log('Deleting existing cards...')
  const { error: delErr } = await supabase
    .from('cards')
    .delete()
    .gte('created_at', '1970-01-01')  // delete all

  if (delErr) {
    console.error('✖ Delete failed:', delErr.message)
    return
  }

  const rows = [
    ...DIAGNOSTIC_CARDS.map((c) => mapCard(c, true)),
    ...STUDY_CARDS.map((c) => mapCard(c, false)),
  ]

  console.log(`Inserting ${rows.length} cards...`)
  const { data, error } = await supabase.from('cards').insert(rows).select('id,title')

  if (error) {
    console.error('✖ Insert failed:', error.message)
    return
  }

  console.log(`✓ Seeded ${data.length} cards successfully`)
}

function mapCard(c, isDiagnostic) {
  return {
    title: c.title,
    cat: c.cat,
    bloom: c.bloom,
    xp: c.xp,
    type: c.type,
    scenario: c.scenario,
    question: c.question,
    opts: c.opts,
    correct: c.correct,
    layers: c.layers,
    lens: c.lens,
    pearl: c.pearl,
    mnemonic_json: c.mnemonic,
    why_wrong: c.why_wrong,
    difficulty_level: c.difficulty_level ?? 2,
    difficulty_label: c.difficulty_label ?? 'Application',
    nclex_category: c.nclex_category ?? c.cat,
    is_diagnostic: isDiagnostic,
  }
}

seedCards()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('✖ Seed script failed:', err)
    process.exit(1)
  })
