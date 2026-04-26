-- Migration 008: CAT (Computer Adaptive Test) results
-- Created: 2026-04-24
--
-- One row per completed or abandoned CAT session. question_trace JSONB
-- stores every question answered plus per-question change_history (every
-- time the student went back and picked a different option) so the admin
-- dashboard can surface "correct → wrong" regressions and "wrong → wrong"
-- indecision.

CREATE TABLE IF NOT EXISTS cat_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  cat_level NUMERIC NOT NULL,
  pass_probability INT NOT NULL CHECK (pass_probability BETWEEN 0 AND 100),
  total_questions INT NOT NULL,
  correct_count INT NOT NULL,
  wrong_count INT NOT NULL,
  duration_seconds INT NOT NULL,
  question_trace JSONB NOT NULL DEFAULT '[]'::jsonb,
  category_accuracy JSONB NOT NULL DEFAULT '{}'::jsonb,
  trend_direction TEXT CHECK (trend_direction IN ('improving','declining','stable','first')),
  previous_cat_level NUMERIC
);

CREATE INDEX IF NOT EXISTS idx_cat_results_student
  ON cat_results(student_id, taken_at DESC);

-- ─── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE cat_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can read own cat results" ON cat_results;
CREATE POLICY "Students can read own cat results"
  ON cat_results FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can insert own cat results" ON cat_results;
CREATE POLICY "Students can insert own cat results"
  ON cat_results FOR INSERT
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can update own cat results" ON cat_results;
CREATE POLICY "Students can update own cat results"
  ON cat_results FOR UPDATE
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can delete own cat results" ON cat_results;
CREATE POLICY "Students can delete own cat results"
  ON cat_results FOR DELETE
  USING (auth.uid() = student_id);
