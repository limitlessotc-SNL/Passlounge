-- =====================================================================
-- Migration 016b_dev: Surgical cleanup of bucket 2b Saunders residuals
-- Created: 2026-05-17
-- Environment: DEV ONLY (syjaqeaoynborqxyynln)
--
-- Migration 016 ran successfully on dev. 9 residual rows remain, all
-- bucket 2b "verbed clauses" that the regex intentionally skipped via
-- Pass 4's negative lookahead. Same 9 patterns we surgically handled on
-- staging — reusing the approved rewrites from staging's 016b/016c
-- migrations, applied to dev's UUIDs.
--
-- Each REPLACE targets a specific text fragment with content-preserving
-- clinical rephrasing.
--
-- Expected outcome: cards-jsonb residual count drops from 9 to 0.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. layers JSONB (5 residuals)
-- ---------------------------------------------------------------------

-- Card 3851ebc7 — Vascular procedure monitoring (≈ staging's 850593bf)
UPDATE cards
   SET layers = REPLACE(
                  layers::text,
                  'Saunders specifies monitoring every 30 minutes for 2 hours with immediate notification for loss of pulses or change in extremity color, warmth or sensation',
                  'Standard post-procedure monitoring includes assessment every 30 minutes for 2 hours with immediate notification for loss of pulses or change in extremity color, warmth, or sensation'
                )::jsonb
 WHERE id = '3851ebc7-1abe-49f6-accf-dc52e7bbce9e';

-- Card dc1f6766 — Post-CABG tamponade monitoring (≈ staging's 7dd08131)
UPDATE cards
   SET layers = REPLACE(
                  layers::text,
                  'Saunders specifies post-CABG monitoring for cardiac tamponade: sudden cessation of drainage (clot), JVD, equalization of pressures, and pulsus paradoxus.',
                  'Post-CABG monitoring for cardiac tamponade includes recognition of sudden cessation of drainage (clot), JVD, equalization of pressures, and pulsus paradoxus.'
                )::jsonb
 WHERE id = 'dc1f6766-883b-4e7c-b838-3ba8ddd7aa3a';

-- Card 117eed98 — Endocarditis embolic targets (≈ staging's 2d031b8c)
UPDATE cards
   SET layers = REPLACE(
                  layers::text,
                  'common embolic targets. Saunders explicitly lists these as monitored complications',
                  'common embolic targets and are monitored complications in endocarditis'
                )::jsonb
 WHERE id = '117eed98-8829-4f37-afa0-d5e4cb01b2e8';

-- Card be6123c6 — DVT massage contraindication (≈ staging's 03af55c8)
UPDATE cards
   SET layers = REPLACE(
                  layers::text,
                  'Saunders explicitly states \"Do not massage the extremity.\"',
                  'Standard DVT nursing practice explicitly directs: do not massage the extremity.'
                )::jsonb
 WHERE id = 'be6123c6-720f-4287-a91a-2c296348dc17';

-- Card 981eb855 — Pre-thyroidectomy medication regimen (≈ staging's 34224489)
UPDATE cards
   SET layers = REPLACE(
                  layers::text,
                  'Saunders specifies that antithyroid medications, beta blockers, glucocorticoids, and iodides may be administered before thyroid surgery to prevent thyroid storm',
                  'Antithyroid medications, beta blockers, glucocorticoids, and iodides may be administered before thyroid surgery to prevent thyroid storm'
                )::jsonb
 WHERE id = '981eb855-a18c-48b5-9b34-ab2a2e337bb4';


-- ---------------------------------------------------------------------
-- 2. why_wrong JSONB (4 residuals)
-- ---------------------------------------------------------------------

-- Card 1136722e — DKA vs hypoglycemia differentiation (≈ staging's f749cc26)
UPDATE cards
   SET why_wrong = REPLACE(
                     why_wrong::text,
                     'Clinical presentation allows differentiation — Saunders explicitly lists distinct assessment findings for each. They do not present identically.',
                     'Clinical presentation allows differentiation — DKA and hypoglycemia have distinct assessment findings. They do not present identically.'
                   )::jsonb
 WHERE id = '1136722e-65c6-4dc0-a71a-3db8f6221ee2';

-- Card 2a67ba4e — Iron sources teaching (≈ staging's 7617e26e)
UPDATE cards
   SET why_wrong = REPLACE(
                     why_wrong::text,
                     'Chicken and fish contain some iron but Saunders specifies organ meats, red meat, dark leafy greens, egg yolks, and legumes as the primary high-iron sources.',
                     'Chicken and fish contain some iron, but the primary high-iron sources are organ meats, red meat, dark leafy greens, egg yolks, and legumes.'
                   )::jsonb
 WHERE id = '2a67ba4e-4d82-40df-9fa3-c578534fc90b';

-- Card 12edf518 — Cardiac tamponade sentinel finding (≈ staging's a10b341c)
UPDATE cards
   SET why_wrong = REPLACE(
                     why_wrong::text,
                     'blood is accumulating in the pericardial space rather than draining. Saunders explicitly flags this.',
                     'blood is accumulating in the pericardial space rather than draining. This is a sentinel finding requiring immediate intervention.'
                   )::jsonb
 WHERE id = '12edf518-9121-45b6-9e0f-62b460218334';

-- Card d527bc0c — Venous vs arterial ulcer treatment (≈ staging's 91ecb518)
UPDATE cards
   SET why_wrong = REPLACE(
                     why_wrong::text,
                     'risk limb loss. Saunders specifies different treatment for each ulcer type.',
                     'risk limb loss. Venous and arterial ulcers require different treatment approaches.'
                   )::jsonb
 WHERE id = 'd527bc0c-d165-4391-8735-0bc6c03bc047';


-- ---------------------------------------------------------------------
-- 3. Verification — expects 0 residuals
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

  RAISE NOTICE 'Migration 016b_dev: residuals after surgical cleanup: % total (cards-text: %, cards-jsonb: %, ngn_cards: %).',
    v_total, v_cards_text, v_cards_jsonb, v_ngn_total;

  IF v_total = 0 THEN
    RAISE NOTICE 'Migration 016b_dev: ZERO Saunders references remain across all tables. Dev cleanup COMPLETE.';
  ELSE
    RAISE WARNING 'Migration 016b_dev: % residuals remain after surgical pass. Surface contexts and iterate.', v_total;
  END IF;
END $$;

COMMIT;
