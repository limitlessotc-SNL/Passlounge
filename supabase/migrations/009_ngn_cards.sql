-- Migration 009: NGN (Next Generation NCLEX) cards
-- Created: 2026-04-24
--
-- Holds all NGN-format items (extended multiple response, bow-tie, matrix,
-- cloze, drag-drop, trend, plus legacy MCQ for completeness). The `content`
-- JSONB column stores the type-specific payload — see src/features/ngn/
-- ngn.types.ts for the exact shapes per question type.

CREATE TABLE IF NOT EXISTS ngn_cards (
  id                UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  title             TEXT         NOT NULL,
  scenario          TEXT         NOT NULL,
  question          TEXT         NOT NULL,
  type              TEXT         NOT NULL
    CHECK (type IN (
      'mcq','extended_mr_n','extended_mr_all',
      'bow_tie','matrix','cloze','drag_drop','trend'
    )),
  nclex_category    TEXT         NOT NULL,
  difficulty_level  INT          NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5),
  scoring_rule      TEXT         NOT NULL
    CHECK (scoring_rule IN ('0/1','+/-','rationale')),
  max_points        INT          NOT NULL DEFAULT 1,
  content           JSONB        NOT NULL DEFAULT '{}'::jsonb,
  rationale         TEXT         NOT NULL DEFAULT '',
  source            TEXT         NOT NULL DEFAULT '',
  created_by        UUID         REFERENCES students(id),
  created_at        TIMESTAMPTZ  DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ngn_cards_type
  ON ngn_cards(type);
CREATE INDEX IF NOT EXISTS idx_ngn_cards_category
  ON ngn_cards(nclex_category);
CREATE INDEX IF NOT EXISTS idx_ngn_cards_difficulty
  ON ngn_cards(difficulty_level);

ALTER TABLE ngn_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can read NGN cards" ON ngn_cards;
CREATE POLICY "Students can read NGN cards"
  ON ngn_cards FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can insert NGN cards" ON ngn_cards;
CREATE POLICY "Admins can insert NGN cards"
  ON ngn_cards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      WHERE id = auth.uid() AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update NGN cards" ON ngn_cards;
CREATE POLICY "Admins can update NGN cards"
  ON ngn_cards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE id = auth.uid() AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can delete NGN cards" ON ngn_cards;
CREATE POLICY "Admins can delete NGN cards"
  ON ngn_cards FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE id = auth.uid() AND is_admin = true
    )
  );
