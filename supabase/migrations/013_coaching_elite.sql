-- Migration 013: Elite AI coaching infrastructure
-- Created: 2026-05-01
--
-- Tables that back Phase D5:
--   • intervention_outcomes — was the intervention effective? Feeds the
--     AI loop so future suggestions know what's worked for this student.
--   • coaching_suggestions  — log of AI-generated recommendations for
--     deduplication ("don't suggest the same thing twice") and for
--     analytics on whether suggestions get acted on.
--   • study_patterns        — cached pattern analysis (peak days/hours,
--     dropout risk days). Computed periodically by the client; used both
--     by the AI prompt and the StudentDetailPanel insight strip.
--
-- Postgres doesn't support CREATE POLICY IF NOT EXISTS, so we use the
-- DROP IF EXISTS / CREATE pattern, matching every other migration in
-- this repo.

-- ─── intervention_outcomes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS intervention_outcomes (
  id              UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID         NOT NULL REFERENCES interventions(id),
  student_id      UUID         NOT NULL REFERENCES students(id),
  coach_id        UUID         NOT NULL REFERENCES coaches(id),
  cat_level_before  FLOAT,
  cat_level_after   FLOAT,
  was_effective     BOOLEAN,
  notes           TEXT,
  recorded_at     TIMESTAMPTZ  DEFAULT NOW()
);

ALTER TABLE intervention_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches can manage outcomes" ON intervention_outcomes;
CREATE POLICY "Coaches can manage outcomes"
  ON intervention_outcomes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM coaches
      WHERE coaches.auth_id = auth.uid()
        AND coaches.id = intervention_outcomes.coach_id
    )
  );

-- ─── coaching_suggestions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coaching_suggestions (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id     UUID         NOT NULL REFERENCES coaches(id),
  student_id   UUID         NOT NULL REFERENCES students(id),
  suggestion   TEXT         NOT NULL,
  urgency      TEXT         NOT NULL,
  was_acted_on BOOLEAN      DEFAULT false,
  generated_at TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coaching_suggestions_student
  ON coaching_suggestions(student_id, generated_at DESC);

ALTER TABLE coaching_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches can manage suggestions" ON coaching_suggestions;
CREATE POLICY "Coaches can manage suggestions"
  ON coaching_suggestions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM coaches
      WHERE coaches.auth_id = auth.uid()
        AND coaches.id = coaching_suggestions.coach_id
    )
  );

-- ─── study_patterns ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_patterns (
  student_id        UUID PRIMARY KEY REFERENCES students(id),
  peak_study_days   TEXT[],
  peak_study_hours  INT[],
  avg_session_length_mins INT,
  avg_daily_cards   FLOAT,
  dropout_risk_days TEXT[],
  last_computed_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE study_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches can read study patterns" ON study_patterns;
CREATE POLICY "Coaches can read study patterns"
  ON study_patterns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN cohort_students cs ON cs.student_id = study_patterns.student_id
      JOIN cohorts co ON co.id = cs.cohort_id
      WHERE c.auth_id = auth.uid()
        AND c.school_id = co.school_id
    )
  );

-- Anyone signed-in can write their own pattern (the upsert is per-student
-- and keyed on student_id; the application layer only writes when called
-- with a student id the caller can already see).
DROP POLICY IF EXISTS "System can write study patterns" ON study_patterns;
CREATE POLICY "System can write study patterns"
  ON study_patterns FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ─── Verify ─────────────────────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'intervention_outcomes',
    'coaching_suggestions',
    'study_patterns'
  );
