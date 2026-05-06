-- Migration 014: NGN case-study presentation
-- Created: 2026-05-01
--
-- Adds an optional `case_study_tabs` JSONB column to ngn_cards. When set,
-- the player renders the NCSBN-style two-pane case-study chrome (purple
-- banner + tabbed case file on the left, the existing question body on the
-- right). Scoring is unchanged — the underlying type still scores. Cards
-- without this column behave exactly as before.

ALTER TABLE ngn_cards
  ADD COLUMN IF NOT EXISTS case_study_tabs JSONB;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ngn_cards'
  AND column_name = 'case_study_tabs';
