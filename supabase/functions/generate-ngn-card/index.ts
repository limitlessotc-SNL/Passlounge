// supabase/functions/generate-ngn-card/index.ts
//
// Server-side proxy for NGN card generation. Called by the admin client
// via supabase.functions.invoke('generate-ngn-card', { body: {...} }).
//
// Why this lives here and not in the browser:
//   - ANTHROPIC_API_KEY is a Supabase secret, never bundled into client JS.
//   - Authorization (is_admin = true) is enforced server-side, behind the
//     same RLS that protects ngn_cards inserts.
//
// Deploy:
//   supabase functions deploy generate-ngn-card --no-verify-jwt
//   (--no-verify-jwt because we manually verify the JWT below; we want
//    a 401 with our own message body rather than the default rejection.)
//
// Set the secret:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Deno runtime — file uses ESM imports from deno.land + esm.sh.

// @ts-expect-error Deno-only import; resolved at runtime, not by tsc.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-expect-error Deno-only import; resolved at runtime, not by tsc.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

// @ts-expect-error Deno is a runtime global, not part of the Node typings tsc uses here.
const ANTHROPIC_API_KEY            = Deno.env.get('ANTHROPIC_API_KEY')
// @ts-expect-error Deno is a runtime global.
const SUPABASE_URL                 = Deno.env.get('SUPABASE_URL')
// @ts-expect-error Deno is a runtime global.
const SUPABASE_SERVICE_ROLE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514'
const ANTHROPIC_URL   = 'https://api.anthropic.com/v1/messages'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  type:           string
  category:       string
  difficulty:     number
  hint?:          string
  existingCards?: Array<{ title: string; scenario: string }>
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }
  if (!ANTHROPIC_API_KEY)         return json({ error: 'Missing ANTHROPIC_API_KEY secret' }, 500)
  if (!SUPABASE_URL)              return json({ error: 'Missing SUPABASE_URL' }, 500)
  if (!SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, 500)

  // ── Auth: verify the JWT and check students.is_admin ───────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Missing bearer token' }, 401)
  }
  const jwt = authHeader.slice('Bearer '.length)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt)
  if (userErr || !userData?.user) {
    return json({ error: 'Invalid token' }, 401)
  }

  const { data: student, error: stuErr } = await supabase
    .from('students')
    .select('is_admin')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (stuErr) return json({ error: 'Authorization lookup failed' }, 500)
  if (!student?.is_admin) return json({ error: 'Not authorized' }, 403)

  // ── Body ────────────────────────────────────────────────────────
  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  if (!body.type || !body.category || typeof body.difficulty !== 'number') {
    return json({ error: 'type, category, and difficulty are required' }, 400)
  }

  // ── Build the NGN item-writing prompt ───────────────────────────
  const systemPrompt = buildSystemPrompt(body)

  // ── Call Anthropic ──────────────────────────────────────────────
  let anthropicResp: Response
  try {
    anthropicResp = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type':       'application/json',
        'x-api-key':          ANTHROPIC_API_KEY,
        'anthropic-version':  '2023-06-01',
      },
      body: JSON.stringify({
        model:      ANTHROPIC_MODEL,
        max_tokens: 4000,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: 'Generate one NGN item now. Return only the JSON object.' }],
      }),
    })
  } catch (err) {
    return json({ error: `Upstream call failed: ${(err as Error).message}` }, 502)
  }

  if (!anthropicResp.ok) {
    const errText = await anthropicResp.text()
    return json({ error: `Anthropic ${anthropicResp.status}: ${errText.slice(0, 500)}` }, 502)
  }

  const completion = await anthropicResp.json()
  const text =
    completion?.content?.[0]?.text ??
    completion?.content?.text ??
    ''
  if (!text || typeof text !== 'string') {
    return json({ error: 'Empty completion from upstream' }, 502)
  }

  // Strip markdown fences if the model wrapped its output.
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  let card: unknown
  try {
    card = JSON.parse(cleaned)
  } catch {
    return json({
      error: 'Generated content was not valid JSON',
      raw_excerpt: cleaned.slice(0, 400),
    }, 502)
  }

  return json({ card }, 200)
})

// ─── Helpers ─────────────────────────────────────────────────────

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function buildSystemPrompt(body: RequestBody): string {
  const existing = (body.existingCards ?? [])
    .slice(0, 60)
    .map(c => `  - "${c.title}" (scenario: ${c.scenario.slice(0, 120)}…)`)
    .join('\n')

  return `You are an expert NCLEX item writer following Moran 2023 and the
NCSBN Next-Generation NCLEX (NGN) standards.

QUALITY RULES (non-negotiable):
- Answer choices state WHAT, never WHY. No causal connectors ("since",
  "because", "indicating", "causing"). Use plain action language.
- No em dashes used as causal connectors.
- No "per Saunders" / "as specified in Saunders" / textbook citations
  visible in any field.
- Options for a single choice set must be similar in length. The correct
  answer must NOT be obviously longer or more detailed.
- Scenarios must be realistic and specific: include age, gender, vital
  signs, key labs or findings as relevant.
- Vary clinical settings (med-surg, ICU, peds, OB, mental health, ED,
  community), patient demographics, and complication angle.

REQUESTED ITEM:
- type:             ${body.type}
- nclex_category:   ${body.category}
- difficulty_level: ${body.difficulty} (1 = Foundation, 5 = Expert)
${body.hint ? `- clinical hint:    ${body.hint}` : ''}

NGN SCHEMAS (use the one matching the requested type):

  mcq                → content: { opts: string[4], correct: number }
  extended_mr_n      → content: { opts: string[5..7], correct_indices: number[], select_n: number }
  extended_mr_all    → content: { opts: string[5..7], correct_indices: number[] }
  bow_tie            → content: {
                          left_label: string, center_label: string, right_label: string,
                          left_opts: string[], left_correct: number[],
                          center_opts: string[], center_correct: number,
                          right_opts: string[], right_correct: number[]
                       }
  matrix             → content: { columns: string[2..3], rows: [{ label: string, correct_col: number }, ...] }
  cloze              → content: {
                          template: string with {0},{1},{2} placeholders,
                          dropdowns: [{ opts: string[], correct: number }, ...]
                       }
  drag_drop          → content: {
                          items: string[], zones: string[],
                          correct_mapping: Record<string, string> // item index → zone name
                       }
  trend              → content: {
                          exhibit: { headers: string[], rows: string[][] },
                          question_type: 'matrix',
                          columns: string[], rows: [{ label, correct_col }, ...]
                       }

SCORING RULE (output as scoring_rule):
  - mcq, extended_mr_n, matrix, cloze, drag_drop, trend → '0/1'
  - extended_mr_all                                     → '+/-'
  - bow_tie                                             → 'rationale'

DUPLICATE AVOIDANCE:
The following cards already exist. Do NOT create a card on the same
condition + question type combination, the same primary diagnosis, or
the same clinical setting as any of these:
${existing || '  (no existing cards yet)'}

OUTPUT:
Return ONLY a single JSON object matching this schema (no markdown, no
preamble, no explanation):
{
  "title":            string,
  "scenario":         string,
  "question":         string,
  "type":             "${body.type}",
  "nclex_category":   "${body.category}",
  "difficulty_level": ${body.difficulty},
  "scoring_rule":     "0/1" | "+/-" | "rationale",
  "max_points":       number,
  "content":          object matching the schema for the type above,
  "rationale":        string,
  "source":           "Saunders 8th Ed."
}

max_points must equal the maximum points the scoring rule can yield for
this content (e.g., select_n for extended_mr_n; correct_indices.length
for extended_mr_all; rows.length for matrix/trend; dropdowns.length for
cloze; correct_mapping size for drag_drop; left_correct.length + 1 +
right_correct.length for bow_tie; 1 for mcq).`
}
