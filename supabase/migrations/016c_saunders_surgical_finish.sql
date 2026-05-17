-- =====================================================================
-- Migration 016c: Finish surgical Saunders cleanup
-- Created: 2026-05-17
--
-- Migration 016b cleaned 7 of 10 known surgical residuals. The remaining
-- 3 are second Saunders mentions in cards that had multiple verbed-clause
-- references in their why_wrong JSONB (one per distractor option).
--
-- Each REPLACE targets a specific text fragment that the prior surgical
-- pass didn't see because last night's residual listing showed only
-- POSITION's first match per card.
--
-- Expected outcome: cards-jsonb residual count drops from 3 to 0.
-- If non-zero after this runs, iterate again on any remaining contexts.
-- =====================================================================

BEGIN;

-- Card 7617e26e — Iron sources (second mention, different distractor)
UPDATE cards
   SET why_wrong = REPLACE(
                     why_wrong::text,
                     'low iron content even if fortified. Saunders specifies organ meats, red meat, dark leafy greens, and legumes as primary high-iron sources.',
                     'low iron content even if fortified. The primary high-iron sources are organ meats, red meat, dark leafy greens, and legumes.'
                   )::jsonb
 WHERE id = '7617e26e-be4a-4756-b49b-e03e767106f3';

-- Card 91ecb518 — Arterial insufficiency positioning (second mention)
UPDATE cards
   SET why_wrong = REPLACE(
                     why_wrong::text,
                     'worsening ischemia. Saunders specifies dependent positioning for arterial insufficiency.',
                     'worsening ischemia. Dependent positioning is indicated for arterial insufficiency.'
                   )::jsonb
 WHERE id = '91ecb518-a78a-4ce6-b9e2-7a19eb0f0d74';

-- Card b61536ca — Acute pancreatitis NPO (second mention)
UPDATE cards
   SET why_wrong = REPLACE(
                     why_wrong::text,
                     'worsens the autodigestion. Saunders specifies withholding all oral food and fluid.',
                     'worsens the autodigestion. Standard management requires withholding all oral food and fluid.'
                   )::jsonb
 WHERE id = 'b61536ca-1e91-4cbc-a281-c07b6a88e51b';


-- ---------------------------------------------------------------------
-- Verification — expects 0 residuals
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_cards_text   INTEGER;
  v_cards_jsonb  INTEGER;
  v_ngn_total    INTEGER;
  v_total        INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_cards_text FROM cards WHERE
       scenario     ILIKE '%saunders%'
    OR question     ILIKE '%saunders%'
    OR layer_1      ILIKE '%saunders%'
    OR layer_2      ILIKE '%saunders%'
    OR layer_3      ILIKE '%saunders%'
    OR layer_4      ILIKE '%saunders%'
    OR pearl        ILIKE '%saunders%'
    OR source       ILIKE '%saunders%'
    OR why_wrong_a  ILIKE '%saunders%'
    OR why_wrong_b  ILIKE '%saunders%'
    OR why_wrong_c  ILIKE '%saunders%'
    OR why_wrong_d  ILIKE '%saunders%';

  SELECT COUNT(*) INTO v_cards_jsonb FROM cards WHERE
       opts::text          ILIKE '%saunders%'
    OR layers::text        ILIKE '%saunders%'
    OR why_wrong::text     ILIKE '%saunders%'
    OR mnemonic_json::text ILIKE '%saunders%';

  SELECT COUNT(*) INTO v_ngn_total FROM ngn_cards WHERE
       scenario      ILIKE '%saunders%'
    OR question      ILIKE '%saunders%'
    OR rationale     ILIKE '%saunders%'
    OR source        ILIKE '%saunders%'
    OR content::text ILIKE '%saunders%';

  v_total := v_cards_text + v_cards_jsonb + v_ngn_total;

  RAISE NOTICE 'Migration 016c: residuals after finish cleanup: % total (cards-text: %, cards-jsonb: %, ngn_cards: %).',
    v_total, v_cards_text, v_cards_jsonb, v_ngn_total;

  IF v_total = 0 THEN
    RAISE NOTICE 'Migration 016c: ZERO Saunders references remain across all tables. Dev cleanup COMPLETE.';
  ELSE
    RAISE WARNING 'Migration 016c: % residuals remain after finish pass. Surface contexts and iterate.', v_total;
  END IF;
END $$;

COMMIT;
