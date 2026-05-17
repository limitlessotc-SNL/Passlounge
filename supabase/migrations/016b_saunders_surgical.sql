-- =====================================================================
-- Migration 016b: Surgical cleanup of bucket 2b Saunders residuals
-- Created: 2026-05-17
--
-- Cleans up the 10 verbed-clause Saunders references that migration 016
-- intentionally skipped via Pass 4's negative lookahead. Each UPDATE
-- replaces a specific text fragment in a JSONB column with content-
-- preserving clinical rephrasing approved by content review.
--
-- Approach: text REPLACE (not regex) — each replacement is explicit and
-- verifiable. JSONB cast at the end ensures any malformed replacement
-- rolls back the transaction.
--
-- Expected outcome:
--   - All 10 residuals cleaned
--   - Final audit shows 0 Saunders in dev database
--   - Backup tables (saunders_backup_pre_016_*) remain in place for
--     rollback through step 8 (drop backups) after full verification
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. layers JSONB (5 residuals)
-- ---------------------------------------------------------------------

-- Card 850593bf — Vascular procedure monitoring
UPDATE cards
   SET layers = REPLACE(
                  layers::text,
                  'Saunders specifies monitoring every 30 minutes for 2 hours with immediate notification for loss of pulses or change in extremity color, warmth or sensation',
                  'Standard post-procedure monitoring includes assessment every 30 minutes for 2 hours with immediate notification for loss of pulses or change in extremity color, warmth, or sensation'
                )::jsonb
 WHERE id = '850593bf-ccfb-46fc-9832-5b851026246b';

-- Card 7dd08131 — Post-CABG tamponade monitoring
UPDATE cards
   SET layers = REPLACE(
                  layers::text,
                  'Saunders specifies post-CABG monitoring for cardiac tamponade: sudden cessation of drainage (clot), JVD, equalization of pressures, and pulsus paradoxus.',
                  'Post-CABG monitoring for cardiac tamponade includes recognition of sudden cessation of drainage (clot), JVD, equalization of pressures, and pulsus paradoxus.'
                )::jsonb
 WHERE id = '7dd08131-b040-43ce-ac48-62444732b11c';

-- Card 2d031b8c — Endocarditis embolic targets
UPDATE cards
   SET layers = REPLACE(
                  layers::text,
                  'common embolic targets. Saunders explicitly lists these as monitored complications',
                  'common embolic targets and are monitored complications in endocarditis'
                )::jsonb
 WHERE id = '2d031b8c-a9c3-4363-85fb-f3af9d4fbdc3';

-- Card 03af55c8 — DVT massage contraindication
UPDATE cards
   SET layers = REPLACE(
                  layers::text,
                  'Saunders explicitly states \"Do not massage the extremity.\"',
                  'Standard DVT nursing practice explicitly directs: do not massage the extremity.'
                )::jsonb
 WHERE id = '03af55c8-64d9-460e-9a75-7b6d75f917ee';

-- Card 34224489 — Pre-thyroidectomy medication regimen
UPDATE cards
   SET layers = REPLACE(
                  layers::text,
                  'Saunders specifies that antithyroid medications, beta blockers, glucocorticoids, and iodides may be administered before thyroid surgery to prevent thyroid storm',
                  'Antithyroid medications, beta blockers, glucocorticoids, and iodides may be administered before thyroid surgery to prevent thyroid storm'
                )::jsonb
 WHERE id = '34224489-53dd-4dbe-9378-3954d9db41c6';


-- ---------------------------------------------------------------------
-- 2. why_wrong JSONB (5 residuals)
-- ---------------------------------------------------------------------

-- Card f749cc26 — DKA vs hypoglycemia differentiation
UPDATE cards
   SET why_wrong = REPLACE(
                     why_wrong::text,
                     'Clinical presentation allows differentiation — Saunders explicitly lists distinct assessment findings for each. They do not present identically.',
                     'Clinical presentation allows differentiation — DKA and hypoglycemia have distinct assessment findings. They do not present identically.'
                   )::jsonb
 WHERE id = 'f749cc26-6cf3-48a1-9963-8ae57ca411e6';

-- Card 7617e26e — Iron sources teaching
UPDATE cards
   SET why_wrong = REPLACE(
                     why_wrong::text,
                     'Chicken and fish contain some iron but Saunders specifies organ meats, red meat, dark leafy greens, egg yolks, and legumes as the primary high-iron sources.',
                     'Chicken and fish contain some iron, but the primary high-iron sources are organ meats, red meat, dark leafy greens, egg yolks, and legumes.'
                   )::jsonb
 WHERE id = '7617e26e-be4a-4756-b49b-e03e767106f3';

-- Card 91ecb518 — Venous vs arterial ulcer treatment
UPDATE cards
   SET why_wrong = REPLACE(
                     why_wrong::text,
                     'risk limb loss. Saunders specifies different treatment for each ulcer type.',
                     'risk limb loss. Venous and arterial ulcers require different treatment approaches.'
                   )::jsonb
 WHERE id = '91ecb518-a78a-4ce6-b9e2-7a19eb0f0d74';

-- Card a10b341c — Cardiac tamponade sentinel finding
UPDATE cards
   SET why_wrong = REPLACE(
                     why_wrong::text,
                     'blood is accumulating in the pericardial space rather than draining. Saunders explicitly flags this.',
                     'blood is accumulating in the pericardial space rather than draining. This is a sentinel finding requiring immediate intervention.'
                   )::jsonb
 WHERE id = 'a10b341c-1f49-4292-90fd-7c209c4fde5c';

-- Card b61536ca — Acute pancreatitis NPO management
UPDATE cards
   SET why_wrong = REPLACE(
                     why_wrong::text,
                     'contraindicated during acute pancreatitis. Saunders specifies NPO with IV nutrition support.',
                     'contraindicated during acute pancreatitis. Standard management requires NPO status with IV nutrition support.'
                   )::jsonb
 WHERE id = 'b61536ca-1e91-4cbc-a281-c07b6a88e51b';


-- ---------------------------------------------------------------------
-- 3. Verification — expects 0 residuals after surgical cleanup
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

  RAISE NOTICE 'Migration 016b: residuals after surgical cleanup: % total (cards-text: %, cards-jsonb: %, ngn_cards: %).',
    v_total, v_cards_text, v_cards_jsonb, v_ngn_total;

  IF v_total = 0 THEN
    RAISE NOTICE 'Migration 016b: ZERO Saunders references remain. Dev cleanup complete.';
  ELSE
    RAISE WARNING 'Migration 016b: % residuals remain after surgical pass. Expected 0. Investigate before deploying further.', v_total;
  END IF;
END $$;

COMMIT;
