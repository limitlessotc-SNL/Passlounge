# Deploy `coaching-suggestion` Edge Function

The `coaching-suggestion` function lives at
[`supabase/functions/coaching-suggestion/index.ts`](../../supabase/functions/coaching-suggestion/index.ts).

It does its own JWT verification and `coaches` table check, so it is
deployed with `--no-verify-jwt` (matches the pattern set by
`generate-ngn-card`).

## Prerequisites

- Supabase CLI installed (Scoop install was used for this project — see
  Phase B's setup notes if you need it)
- Logged in: `supabase login`
- `ANTHROPIC_API_KEY` is **already set** as a secret on all three projects
  from Phase B. No new secrets are required.

## Deploy commands (PowerShell)

```powershell
$env:Path = "$HOME\scoop\shims;$env:Path"

# Dev
supabase functions deploy coaching-suggestion `
  --no-verify-jwt `
  --project-ref syjaqeaoynborqxyynln

# Staging
supabase functions deploy coaching-suggestion `
  --no-verify-jwt `
  --project-ref ctqkxlpjtqadjbwvvivv

# Production
supabase functions deploy coaching-suggestion `
  --no-verify-jwt `
  --project-ref oqinkogrloprvophvuui
```

## Verify

After each deploy, the dashboard's Functions list should show
`coaching-suggestion` with status "Active". You can hit the function from
the UI by opening any student's detail panel — RED-risk students auto-fetch
on mount; AMBER/GREEN expose an "✨ Get AI Recommendation" button.

If the call returns a 4xx/5xx, check the function logs in the Supabase
dashboard. Common causes:

| Status | Likely cause |
| ------ | ------------ |
| 401    | JWT missing or invalid (signed-out coach session) |
| 403    | Caller's `auth.uid()` is not in the `coaches` table or `is_active = false` |
| 500    | `ANTHROPIC_API_KEY` not set on this project |
| 502    | Anthropic upstream issue — check function logs for the raw response |
