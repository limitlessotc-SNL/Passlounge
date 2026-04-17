# PassLounge Supabase Setup

## Tables

5 tables:
- `students` — user profiles + onboarding state (1 row per user)
- `cards` — study + diagnostic cards (shared, read-only for users)
- `sessions` — per-session records (correct/wrong/xp/completed)
- `card_progress` — SR state per (student, card) pair
- `diagnostic_results` — one-time diagnostic scores

All tables have Row Level Security enabled — each student only sees their own data.

## Running Migrations

In your Supabase dashboard → SQL Editor, run each file in order:

1. `001_initial_schema.sql` — creates base tables
2. `002_add_card_progress.sql` — adds card_progress table
3. `003_add_student_columns.sql` — adds onboarded + daily_cards columns
4. `004_card_json_schema_and_rls.sql` — adds JSON columns + enables RLS

If you've already run 001-003 on an existing project, just run 004 to add RLS.

## Seeding Cards

The app will automatically fall back to **hardcoded cards** in `src/config/fallback-cards.ts` if the Supabase `cards` table is empty. So you can skip seeding and the app works.

To seed the database with real data, run:

```bash
# Set env vars (service_role key is in Dashboard → Settings → API)
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# Run the seed script
node supabase/seed.mjs
```

The script reads from `src/config/fallback-cards.ts` (single source of truth) and inserts all 31 cards (15 diagnostic + 16 study).

## Why fallback cards?

The app is designed to work offline / without Supabase cards table populated. If you just want to test the app flow, the hardcoded cards are sufficient. Seeding to Supabase is only needed when you want shared card progress across devices or to update cards without redeploying the React app.
