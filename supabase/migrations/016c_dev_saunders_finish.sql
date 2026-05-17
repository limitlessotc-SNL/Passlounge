-- =====================================================================
-- Migration 016c_dev: Finish surgical Saunders cleanup on dev
-- Created: 2026-05-17
-- Environment: DEV ONLY (syjaqeaoynborqxyynln)
--
-- Migration 016b_dev cleaned 7 of 9 known surgical residuals. The
-- remaining 2 are second Saunders mentions in cards that had multiple
-- verbed-clause references in their why_wrong JSONB.
--
-- Both rewrites approved on staging (staging's 016c handled the same
-- second-mention pattern). Reusing the staging-approved rewrites
-- applied to dev's UUIDs.
--
-- Expected outcome: cards-jsonb residual count drops from 2 to 0.
-- =====================================================================

BEGIN;

-- Card 2a67ba4e — Iron sources (second mention, different distractor)
-- Staging equivalent: 7617e26e
UPDATE cards
   SET why_wrong = REPLACE(
                     why_wrong::text,
                     'low iron content even if fortified. Saunders specifies organ meats, red meat, dark leafy greens, and legumes as primary high-iron sources.',
                     'low iron content even if fortified. The primary high-iron sources are organ meats, red meat, dark leafy greens, and legumes.'
                   )::jsonb
 WHERE id = '2a67ba4e-4d82-40df-9fa3-c578534fc90b';

-- Card d527bc0c — Arterial insufficiency positioning (second mention)
-- Staging equivalent: 91ecb518
UPDATE cards
   SET why_wrong = REPLACE(
                     why_wrong::text,
                     'worsening ischemia. Saunders specifies dependent positioning for arterial insufficiency.',
                     'worsening ischemia. Dependent positioning is indicated for arterial insufficiency.'
                   )::jsonb
 WHERE id = 'd527bc0c-d165-4391-8735-0bc6c03bc047';


-- ---------------------------------------------------------------------
-- Verification — expects 0 residuals across all tables
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

  RAISE NOTICE 'Migration 016c_dev: residuals after finish cleanup: % total (cards-text: %, cards-jsonb: %, ngn_cards: %).',
    v_total, v_cards_text, v_cards_jsonb, v_ngn_total;

  IF v_total = 0 THEN
    RAISE NOTICE 'Migration 016c_dev: ZERO Saunders references remain across all tables. Dev cleanup COMPLETE.';
  ELSE
    RAISE WARNING 'Migration 016c_dev: % residuals remain after finish pass. Surface contexts and iterate.', v_total;
  END IF;
END $$;

COMMIT;
