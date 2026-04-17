-- Migration 004: Upgrade cards to JSON schema + add RLS policies
-- Created: 2026-04-16
--
-- The original card schema used separate columns (opt_a, opt_b, layer_1, etc).
-- The React app expects JSON columns (opts[], layers[], mnemonic[], why_wrong{}).
-- This migration adds the new JSON columns AND Row Level Security policies
-- so each student only sees their own data.

-- ─── Add JSON columns to cards ────────────────────────────────────────────
ALTER TABLE cards ADD COLUMN IF NOT EXISTS opts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS layers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS mnemonic_json JSONB DEFAULT '[]'::jsonb;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS why_wrong JSONB DEFAULT '{}'::jsonb;

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_cards_category ON cards(cat);
CREATE INDEX IF NOT EXISTS idx_cards_diagnostic ON cards(is_diagnostic);
CREATE INDEX IF NOT EXISTS idx_sessions_student ON sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_completed ON sessions(completed);
CREATE INDEX IF NOT EXISTS idx_card_progress_student ON card_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_card_progress_review ON card_progress(student_id, next_review);
CREATE INDEX IF NOT EXISTS idx_diagnostic_student ON diagnostic_results(student_id);

-- ─── Enable Row Level Security ────────────────────────────────────────────
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_results ENABLE ROW LEVEL SECURITY;

-- ─── students policies ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Students can read own profile" ON students;
CREATE POLICY "Students can read own profile"
  ON students FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Students can insert own profile" ON students;
CREATE POLICY "Students can insert own profile"
  ON students FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Students can update own profile" ON students;
CREATE POLICY "Students can update own profile"
  ON students FOR UPDATE
  USING (auth.uid() = id);

-- ─── cards policies (read-only for authenticated users) ───────────────────
DROP POLICY IF EXISTS "Authenticated users can read all cards" ON cards;
CREATE POLICY "Authenticated users can read all cards"
  ON cards FOR SELECT
  TO authenticated
  USING (true);

-- ─── sessions policies ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Students can read own sessions" ON sessions;
CREATE POLICY "Students can read own sessions"
  ON sessions FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can insert own sessions" ON sessions;
CREATE POLICY "Students can insert own sessions"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can update own sessions" ON sessions;
CREATE POLICY "Students can update own sessions"
  ON sessions FOR UPDATE
  USING (auth.uid() = student_id);

-- ─── card_progress policies ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Students can read own progress" ON card_progress;
CREATE POLICY "Students can read own progress"
  ON card_progress FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can insert own progress" ON card_progress;
CREATE POLICY "Students can insert own progress"
  ON card_progress FOR INSERT
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can update own progress" ON card_progress;
CREATE POLICY "Students can update own progress"
  ON card_progress FOR UPDATE
  USING (auth.uid() = student_id);

-- ─── diagnostic_results policies ──────────────────────────────────────────
DROP POLICY IF EXISTS "Students can read own diagnostic" ON diagnostic_results;
CREATE POLICY "Students can read own diagnostic"
  ON diagnostic_results FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can insert own diagnostic" ON diagnostic_results;
CREATE POLICY "Students can insert own diagnostic"
  ON diagnostic_results FOR INSERT
  WITH CHECK (auth.uid() = student_id);
