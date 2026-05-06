// supabase/functions/coaching-suggestion/index.ts
//
// Server-side proxy for AI coaching recommendations. Called by the coach
// dashboard via supabase.functions.invoke('coaching-suggestion', {body}).
//
// Why this lives here, not in the browser:
//   - ANTHROPIC_API_KEY is a Supabase secret; never bundled into client JS.
//   - Authorization (caller must be in `coaches` table) is enforced
//     server-side, behind RLS — the client cannot fake a coach session.
//
// Deploy:
//   supabase functions deploy coaching-suggestion --no-verify-jwt
//   (--no-verify-jwt because we manually verify the JWT below; we want a
//    401 with our own message body rather than the default rejection.)
//
// Set the secret (already set on dev/staging/prod from Phase B):
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
  student_id:           string
  student_metrics:      Record<string, unknown>
  recent_interventions: Array<Record<string, unknown>>
  intervention_outcomes: Array<Record<string, unknown>>
  previous_suggestions: string[]
  study_pattern:        Record<string, unknown> | null
  cohort_name:          string
  days_to_test:         number | null
  cohort_health:        Record<string, unknown>
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST')    return json({ error: 'Method not allowed' }, 405)
  if (!ANTHROPIC_API_KEY)         return json({ error: 'Missing ANTHROPIC_API_KEY secret' }, 500)
  if (!SUPABASE_URL)              return json({ error: 'Missing SUPABASE_URL' }, 500)
  if (!SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, 500)

  // ── Auth: verify the JWT and check coaches membership ─────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Missing bearer token' }, 401)
  }
  const jwt = authHeader.slice('Bearer '.length)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt)
  if (userErr || !userData?.user) return json({ error: 'Invalid token' }, 401)

  const { data: coach, error: coachErr } = await supabase
    .from('coaches')
    .select('id, is_active')
    .eq('auth_id', userData.user.id)
    .maybeSingle()
  if (coachErr) return json({ error: 'Authorization lookup failed' }, 500)
  if (!coach || !coach.is_active) return json({ error: 'Not authorized' }, 403)

  // ── Body ─────────────────────────────────────────────────────────────
  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  if (!body.student_id || !body.student_metrics) {
    return json({ error: 'student_id and student_metrics are required' }, 400)
  }

  const systemPrompt = buildSystemPrompt()
  const userPrompt   = buildUserPrompt(body)

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
        max_tokens: 2000,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: userPrompt }],
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

  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  let suggestion: unknown
  try {
    suggestion = JSON.parse(cleaned)
  } catch {
    return json({
      error: 'Generated content was not valid JSON',
      raw_excerpt: cleaned.slice(0, 400),
    }, 502)
  }

  return json({ suggestion }, 200)
})

// ─── Helpers ─────────────────────────────────────────────────────────

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function buildSystemPrompt(): string {
  return `You are an expert NCLEX nursing board exam coach with 15 years of
experience helping students pass their boards. You work with nursing school
faculty to identify at-risk students early and intervene before it is too
late.

Your recommendations must be:
- Specific and data-driven (reference actual numbers)
- Warm and human (not robotic or clinical)
- Actionable within the next 7 days
- Aware of what has already been tried

RULES:
1. Always reference specific metrics in recommendations ("Pharmacology at
   48%" not "weak in pharmacology").
2. Suggested messages must sound like a real coach wrote them — warm,
   direct, encouraging.
3. Never repeat a suggestion if previous ones provided.
4. If a previous intervention worked, build on it.
5. If a previous intervention did not work, try a different approach.
6. As test date approaches, increase urgency and decrease the scope of
   recommendations (14 days out = daily focus, not weekly).
7. Study pattern insight: if student studies well at certain times,
   recommend scheduling hard content then.
8. Countdown alert: trigger specific language when 30, 14, 7 days remain.

MILESTONE DETECTION — set celebration: true if any of:
- CAT level crossed 3.0 for first time
- Pass probability crossed 70% for first time
- Previously weak category (below 60%) now above 70%
- Student active 7+ consecutive days
- Student completed first CAT session
- Student improved 2+ CAT levels in one session

OUTPUT — return ONLY a single JSON object matching this schema (no
markdown, no preamble, no explanation):
{
  "recommendation":          string,
  "urgency":                 "high" | "medium" | "low",
  "suggested_message":       string,
  "milestone":               string | undefined,
  "celebration":             boolean | undefined,
  "focus_categories":        string[],
  "weekly_actions":          string[],
  "study_pattern_insight":   string | undefined,
  "countdown_alert":         string | undefined,
  "intervention_approach":   string | undefined
}`
}

function buildUserPrompt(body: RequestBody): string {
  const m = body.student_metrics
  const interventions = (body.recent_interventions ?? []).slice(0, 10)
  const outcomes      = (body.intervention_outcomes ?? []).slice(0, 10)
  const previous      = (body.previous_suggestions ?? []).slice(-5)

  const interventionLines = interventions.length === 0
    ? '  (none)'
    : interventions.map((i, idx) => {
        const oc = outcomes.find(o => o.intervention_id === i.id)
        const result =
          oc?.was_effective === true  ? ' (worked)' :
          oc?.was_effective === false ? ' (did NOT work)' : ''
        return `  ${idx + 1}. ${i.type}: ${(i.notes as string ?? '').slice(0, 200)}${result}`
      }).join('\n')

  const previousLines = previous.length === 0
    ? '  (none)'
    : previous.map((p, idx) => `  ${idx + 1}. ${p.slice(0, 200)}`).join('\n')

  const sp = body.study_pattern
  const studyPatternBlock = sp
    ? `STUDY PATTERN:
- Peak days:  ${(sp.peak_study_days  as string[]  ?? []).join(', ') || '(unknown)'}
- Peak hours: ${(sp.peak_study_hours as number[] ?? []).map(h => `${h}:00`).join(', ') || '(unknown)'}
- Avg session length: ${sp.avg_session_length_mins ?? 'unknown'} min
- Avg daily cards:    ${sp.avg_daily_cards ?? 'unknown'}
- Dropout-risk days:  ${(sp.dropout_risk_days as string[] ?? []).join(', ') || '(none)'}`
    : 'STUDY PATTERN: not enough data yet.'

  const ch = body.cohort_health
  const cohortHealthBlock = `COHORT HEALTH (${body.cohort_name}):
- Avg pass probability:        ${ch.avg_pass_probability}%
- Cohort weakest category:     ${ch.weakest_category ?? '(n/a)'} (${ch.weakest_category_avg_accuracy != null ? Math.round(Number(ch.weakest_category_avg_accuracy) * 100) + '%' : 'n/a'})
- Inactive 7+ days:            ${ch.students_not_active_7_days} of ${ch.total_students}
- Below passing line:          ${ch.students_below_passing} of ${ch.total_students}`

  return `Generate a coaching recommendation for this student.

STUDENT (${m.name ?? 'Student'}):
- CAT level:               ${m.cat_level ?? 'no CAT yet'}
- Previous CAT level:      ${m.cat_level_previous ?? 'n/a'}
- CAT velocity:            ${m.cat_velocity != null ? `${(m.cat_velocity as number).toFixed(2)} levels/wk` : 'unknown'}
- Pass probability:        ${m.pass_probability ?? 'n/a'}%
- Projected on test date:  ${m.projected_pass_probability ?? 'n/a'}%
- Readiness score (0-100): ${m.readiness_score}
- Risk level:              ${m.risk_level}
- Trend direction:         ${m.trend_direction}
- Days to test:            ${body.days_to_test ?? 'no test date set'}
- Active days last 14:     ${m.active_days_last_14}
- Days since last active:  ${m.days_since_active ?? 'n/a'}
- Current streak:          ${m.current_streak} days
- Total cards studied:     ${m.total_cards_studied}
- Total CAT sessions:      ${m.total_cat_sessions}
- SR compliance (0-1):     ${m.sr_compliance}
- NGN accuracy (0-1):      ${m.ngn_accuracy ?? 'n/a'}
- Risk flags:              ${(m.risk_flags as string[] ?? []).join(' | ') || '(none)'}

CATEGORY ACCURACY:
${(m.category_accuracy as Array<{ category: string; correct: number; total: number; accuracy: number }> ?? [])
  .map(c => `- ${c.category}: ${Math.round(c.accuracy * 100)}% (${c.correct}/${c.total})`)
  .join('\n') || '  (no category data yet)'}

RECENT INTERVENTIONS (and outcomes if recorded):
${interventionLines}

PREVIOUS COACHING SUGGESTIONS (do NOT repeat these):
${previousLines}

${studyPatternBlock}

${cohortHealthBlock}

Generate the JSON object now.`
}
