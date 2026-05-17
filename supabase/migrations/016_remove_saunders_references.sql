-- =====================================================================
-- Migration 016: Remove "Saunders" references from card content (v2)
-- Created: 2026-05-10
--
-- Replaces "Saunders" citations across the cards and ngn_cards tables.
-- This is v2 — the v1 pattern stopped too early (left "52 p.1871:"
-- dangling after "Saunders Ch."), missed the bucket-5 "Saunders:"
-- attribution shape, and would have stomped bucket-2b verbed clauses
-- with broken grammar. v2 was designed against real dev data after
-- classifying 227 affected rows into 5 buckets.
--
-- BUCKET COVERAGE
--   Bucket 1  "Per Saunders Ch.  41 p.1347: ..."   → Pass 1 (regex)
--   Bucket 1  "per Saunders Box 58-6: '...'"       → Pass 2 (regex)
--   Bucket 3  "Per Saunders Comprehensive Review"  → Pass 4 fallback
--   Bucket 4  "...per Saunders, the patient..."    → Pass 4 (regex)
--   Bucket 5  "Saunders: 'quoted teaching'"        → Pass 3 (strip)
--   Bucket 5  "Saunders respiratory criteria:"     → Pass 3 (strip)
--   Bucket 2a "Saunders notes: 'foo'"              → Pass 3 (strip)
--   Bucket 2b "Saunders explicitly lists X for Y"  → INTENTIONALLY
--             SKIPPED. Pass 4's negative lookahead excludes attribution
--             verbs so these ~13 rows stay intact. They need a
--             clinical-content rewrite, not a citation strip, and will
--             be handled in a follow-up migration (016b) with row-by-
--             row surgical UPDATEs after content review.
--
-- DESIGN NOTES
--
-- 1. Four sequential REGEXP_REPLACE passes, nested. Order is critical:
--    Pass 1 → Pass 2 → Pass 3 → Pass 4 must fire in sequence because
--    Pass 3's pattern (Saunders <words>:) overlaps Pass 2's pattern
--    (Saunders Ch X:); Pass 1+2 must clean their cases first.
--
-- 2. Pass 1: \yPer\s+Saunders\s+<locator>\s*<number>[<pageref>]?\s*:?\s*
--    Locator = Ch.|Chapter|Box|Table|Fig.|Figure|Section. Number is
--    \d or -. Optional page ref. Optional trailing colon+space.
--    Replacement adds a comma so the next clause continues sensibly:
--    "Per Saunders Ch. 41, hold the drug" → "Per standard nursing
--    references, hold the drug".
--
-- 3. Pass 2: same locator pattern without the "Per" prefix. Catches
--    mid-sentence citations like "...as specified in Saunders Ch. 41,
--    the nurse..."
--
-- 4. Pass 3: \ySaunders(\s+\w+){0,4}\s*:\s* with empty replacement.
--    Strips "Saunders:" / "Saunders notes:" / "Saunders <noun phrase>:"
--    attribution prefixes ahead of quoted teachings. The {0,4} word
--    cap protects against the disaster case where a colon many words
--    away gets picked up greedily.
--
-- 5. Pass 4: \ySaunders\y with negative lookahead (?!\s+(verbs)) to
--    catch any bare residual reference while preserving bucket-2b
--    verbed clauses for surgical follow-up. Replacement is lowercase
--    "standard nursing references" since these match mid-sentence.
--
-- 6. JSONB columns are rewritten via column::text → regex → ::jsonb.
--    The stop-set [^,.;"] in the locator patterns prevents crossing
--    JSON string boundaries. Pass 3 and Pass 4 don't operate inside
--    quoted JSON strings the same way, but the patterns are scoped
--    enough that they don't break JSON syntax (verified by dry-run).
--    A bad regex producing invalid JSON throws at ::jsonb and rolls
--    back the whole transaction.
--
-- 7. Source field gets a two-step treatment: first a full replacement
--    for values starting with "Saunders" (the common "Saunders 8th
--    ed." pattern), then the same 4-pass regex for any residual
--    mid-text Saunders that didn't start the field.
--
-- ACCEPTABLE ARTIFACTS (will not be fixed by this migration)
--   - Double spaces: pre-existing in source data, not introduced by
--     the regex. Skipped because a global \s{2,}→' ' collapse risks
--     touching intentional formatting in mnemonics.
--   - Lowercase mid-sentence starts: when Pass 3 strips "Saunders:"
--     from "...acid. Saunders: metabolic imbalances...", the
--     "metabolic" stays lowercase. Regex can't capitalize after a
--     period without a more elaborate pattern.
--   - "Per" capitalized mid-sentence: Pass 1 replaces with the fixed
--     string "Per standard nursing references," — if the original
--     was lowercase "per", the replacement still capitalizes "Per".
--
-- EXPECTED VERIFICATION RESULT
--   After this migration commits, the audit should show ~13
--   residual Saunders references — these are bucket 2b rows
--   intentionally left for surgical handling in 016b. If the
--   residual count is significantly different (0, or much greater
--   than 13), investigate before deploying further.
--
-- BACKUP TABLES (persistent — survive after COMMIT)
--   saunders_backup_pre_016_cards  — all affected cards rows
--   saunders_backup_pre_016_ngn    — all affected ngn_cards rows
--   Drop these once you've verified the migration on each env:
--     DROP TABLE saunders_backup_pre_016_cards;
--     DROP TABLE saunders_backup_pre_016_ngn;
--
--   RLS: both backup tables get ENABLE ROW LEVEL SECURITY immediately
--   after creation. We do NOT add any policies, which leaves access
--   restricted to the service role / postgres user — anon and
--   authenticated keys cannot read them. This matches Supabase's
--   default expectation for tables that aren't meant for client access.
--   `CREATE TABLE AS` doesn't inherit RLS from the source table, so
--   without the ALTER the Supabase dashboard flags a warning.
--
-- ROLLBACK
--   If the migration committed but the result is wrong, restore from
--   the backup tables:
--     UPDATE cards c
--        SET source = b.source, scenario = b.scenario,
--            question = b.question, layer_1 = b.layer_1,
--            layer_2 = b.layer_2, layer_3 = b.layer_3,
--            layer_4 = b.layer_4, pearl = b.pearl,
--            why_wrong_a = b.why_wrong_a, why_wrong_b = b.why_wrong_b,
--            why_wrong_c = b.why_wrong_c, why_wrong_d = b.why_wrong_d,
--            opts = b.opts, layers = b.layers,
--            why_wrong = b.why_wrong, mnemonic_json = b.mnemonic_json
--       FROM saunders_backup_pre_016_cards b
--      WHERE c.id = b.id;
--     -- analogous UPDATE for ngn_cards
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Backup tables (persistent)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS saunders_backup_pre_016_cards;
CREATE TABLE saunders_backup_pre_016_cards AS
SELECT *
FROM cards
WHERE source        ILIKE '%saunders%'
   OR scenario      ILIKE '%saunders%'
   OR question      ILIKE '%saunders%'
   OR layer_1       ILIKE '%saunders%'
   OR layer_2       ILIKE '%saunders%'
   OR layer_3       ILIKE '%saunders%'
   OR layer_4       ILIKE '%saunders%'
   OR pearl         ILIKE '%saunders%'
   OR why_wrong_a   ILIKE '%saunders%'
   OR why_wrong_b   ILIKE '%saunders%'
   OR why_wrong_c   ILIKE '%saunders%'
   OR why_wrong_d   ILIKE '%saunders%'
   OR opts::text          ILIKE '%saunders%'
   OR layers::text        ILIKE '%saunders%'
   OR why_wrong::text     ILIKE '%saunders%'
   OR mnemonic_json::text ILIKE '%saunders%';

-- RLS without policies → service role only; anon/authenticated keys
-- cannot read this rollback table.
ALTER TABLE saunders_backup_pre_016_cards ENABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS saunders_backup_pre_016_ngn;
CREATE TABLE saunders_backup_pre_016_ngn AS
SELECT *
FROM ngn_cards
WHERE source        ILIKE '%saunders%'
   OR scenario      ILIKE '%saunders%'
   OR question      ILIKE '%saunders%'
   OR rationale     ILIKE '%saunders%'
   OR content::text ILIKE '%saunders%';

-- RLS without policies → service role only; anon/authenticated keys
-- cannot read this rollback table.
ALTER TABLE saunders_backup_pre_016_ngn ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------
-- 2. Source field — full replacement for values starting with Saunders
-- ---------------------------------------------------------------------
UPDATE cards
   SET source = 'Standard NCLEX-RN nursing reference'
 WHERE source ILIKE 'Saunders%';

UPDATE ngn_cards
   SET source = 'Standard NCLEX-RN nursing reference'
 WHERE source ILIKE 'Saunders%';


-- ---------------------------------------------------------------------
-- 3. Cards table — prose fields (4-pass REGEXP_REPLACE)
--
-- Pass 1: Per Saunders + locator + number → "Per standard nursing references, "
-- Pass 2: Saunders + locator + number     → "Standard nursing references "
-- Pass 3: Saunders [<=4 words] :          → ""  (strip attribution)
-- Pass 4: bare Saunders (not + verb)      → "standard nursing references"
-- ---------------------------------------------------------------------

UPDATE cards
   SET scenario = REGEXP_REPLACE(
                   REGEXP_REPLACE(
                    REGEXP_REPLACE(
                     REGEXP_REPLACE(scenario,
                      '\yPer\s+Saunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                      'Per standard nursing references, ', 'gi'),
                     '\ySaunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                     'Standard nursing references ', 'gi'),
                    '\ySaunders(\s+\w+){0,4}\s*:\s*', '', 'gi'),
                   '\ySaunders\y(?!\s+(states|notes|lists|teaches|describes|defines|explains|specifies|identifies|recommends|emphasizes|details|outlines|presents|reviews|categorizes|explicitly|asserts|cautions|warns|instructs|highlights|stresses|advises|mentions))',
                   'standard nursing references', 'gi')
 WHERE scenario ILIKE '%saunders%';

UPDATE cards
   SET question = REGEXP_REPLACE(
                   REGEXP_REPLACE(
                    REGEXP_REPLACE(
                     REGEXP_REPLACE(question,
                      '\yPer\s+Saunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                      'Per standard nursing references, ', 'gi'),
                     '\ySaunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                     'Standard nursing references ', 'gi'),
                    '\ySaunders(\s+\w+){0,4}\s*:\s*', '', 'gi'),
                   '\ySaunders\y(?!\s+(states|notes|lists|teaches|describes|defines|explains|specifies|identifies|recommends|emphasizes|details|outlines|presents|reviews|categorizes|explicitly|asserts|cautions|warns|instructs|highlights|stresses|advises|mentions))',
                   'standard nursing references', 'gi')
 WHERE question ILIKE '%saunders%';

UPDATE cards
   SET layer_1 = REGEXP_REPLACE(
                  REGEXP_REPLACE(
                   REGEXP_REPLACE(
                    REGEXP_REPLACE(layer_1,
                     '\yPer\s+Saunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                     'Per standard nursing references, ', 'gi'),
                    '\ySaunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                    'Standard nursing references ', 'gi'),
                   '\ySaunders(\s+\w+){0,4}\s*:\s*', '', 'gi'),
                  '\ySaunders\y(?!\s+(states|notes|lists|teaches|describes|defines|explains|specifies|identifies|recommends|emphasizes|details|outlines|presents|reviews|categorizes|explicitly|asserts|cautions|warns|instructs|highlights|stresses|advises|mentions))',
                  'standard nursing references', 'gi')
 WHERE layer_1 ILIKE '%saunders%';

UPDATE cards
   SET layer_2 = REGEXP_REPLACE(
                  REGEXP_REPLACE(
                   REGEXP_REPLACE(
                    REGEXP_REPLACE(layer_2,
                     '\yPer\s+Saunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                     'Per standard nursing references, ', 'gi'),
                    '\ySaunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                    'Standard nursing references ', 'gi'),
                   '\ySaunders(\s+\w+){0,4}\s*:\s*', '', 'gi'),
                  '\ySaunders\y(?!\s+(states|notes|lists|teaches|describes|defines|explains|specifies|identifies|recommends|emphasizes|details|outlines|presents|reviews|categorizes|explicitly|asserts|cautions|warns|instructs|highlights|stresses|advises|mentions))',
                  'standard nursing references', 'gi')
 WHERE layer_2 ILIKE '%saunders%';

UPDATE cards
   SET layer_3 = REGEXP_REPLACE(
                  REGEXP_REPLACE(
                   REGEXP_REPLACE(
                    REGEXP_REPLACE(layer_3,
                     '\yPer\s+Saunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                     'Per standard nursing references, ', 'gi'),
                    '\ySaunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                    'Standard nursing references ', 'gi'),
                   '\ySaunders(\s+\w+){0,4}\s*:\s*', '', 'gi'),
                  '\ySaunders\y(?!\s+(states|notes|lists|teaches|describes|defines|explains|specifies|identifies|recommends|emphasizes|details|outlines|presents|reviews|categorizes|explicitly|asserts|cautions|warns|instructs|highlights|stresses|advises|mentions))',
                  'standard nursing references', 'gi')
 WHERE layer_3 ILIKE '%saunders%';

UPDATE cards
   SET layer_4 = REGEXP_REPLACE(
                  REGEXP_REPLACE(
                   REGEXP_REPLACE(
                    REGEXP_REPLACE(layer_4,
                     '\yPer\s+Saunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                     'Per standard nursing references, ', 'gi'),
                    '\ySaunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                    'Standard nursing references ', 'gi'),
                   '\ySaunders(\s+\w+){0,4}\s*:\s*', '', 'gi'),
                  '\ySaunders\y(?!\s+(states|notes|lists|teaches|describes|defines|explains|specifies|identifies|recommends|emphasizes|details|outlines|presents|reviews|categorizes|explicitly|asserts|cautions|warns|instructs|highlights|stresses|advises|mentions))',
                  'standard nursing references', 'gi')
 WHERE layer_4 ILIKE '%saunders%';

UPDATE cards
   SET pearl = REGEXP_REPLACE(
                REGEXP_REPLACE(
                 REGEXP_REPLACE(
                  REGEXP_REPLACE(pearl,
                   '\yPer\s+Saunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                   'Per standard nursing references, ', 'gi'),
                  '\ySaunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                  'Standard nursing references ', 'gi'),
                 '\ySaunders(\s+\w+){0,4}\s*:\s*', '', 'gi'),
                '\ySaunders\y(?!\s+(states|notes|lists|teaches|describes|defines|explains|specifies|identifies|recommends|emphasizes|details|outlines|presents|reviews|categorizes|explicitly|asserts|cautions|warns|instructs|highlights|stresses|advises|mentions))',
                'standard nursing references', 'gi')
 WHERE pearl ILIKE '%saunders%';

UPDATE cards
   SET why_wrong_a = REGEXP_REPLACE(
                      REGEXP_REPLACE(
                       REGEXP_REPLACE(
                        REGEXP_REPLACE(why_wrong_a,
                         '\yPer\s+Saunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                         'Per standard nursing references, ', 'gi'),
                        '\ySaunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                        'Standard nursing references ', 'gi'),
                       '\ySaunders(\s+\w+){0,4}\s*:\s*', '', 'gi'),
                      '\ySaunders\y(?!\s+(states|notes|lists|teaches|describes|defines|explains|specifies|identifies|recommends|emphasizes|details|outlines|presents|reviews|categorizes|explicitly|asserts|cautions|warns|instructs|highlights|stresses|advises|mentions))',
                      'standard nursing references', 'gi')
 WHERE why_wrong_a ILIKE '%saunders%';

UPDATE cards
   SET why_wrong_b = REGEXP_REPLACE(
                      REGEXP_REPLACE(
                       REGEXP_REPLACE(
                        REGEXP_REPLACE(why_wrong_b,
                         '\yPer\s+Saunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                         'Per standard nursing references, ', 'gi'),
                        '\ySaunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                        'Standard nursing references ', 'gi'),
                       '\ySaunders(\s+\w+){0,4}\s*:\s*', '', 'gi'),
                      '\ySaunders\y(?!\s+(states|notes|lists|teaches|describes|defines|explains|specifies|identifies|recommends|emphasizes|details|outlines|presents|reviews|categorizes|explicitly|asserts|cautions|warns|instructs|highlights|stresses|advises|mentions))',
                      'standard nursing references', 'gi')
 WHERE why_wrong_b ILIKE '%saunders%';

UPDATE cards
   SET why_wrong_c = REGEXP_REPLACE(
                      REGEXP_REPLACE(
                       REGEXP_REPLACE(
                        REGEXP_REPLACE(why_wrong_c,
                         '\yPer\s+Saunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                         'Per standard nursing references, ', 'gi'),
                        '\ySaunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                        'Standard nursing references ', 'gi'),
                       '\ySaunders(\s+\w+){0,4}\s*:\s*', '', 'gi'),
                      '\ySaunders\y(?!\s+(states|notes|lists|teaches|describes|defines|explains|specifies|identifies|recommends|emphasizes|details|outlines|presents|reviews|categorizes|explicitly|asserts|cautions|warns|instructs|highlights|stresses|advises|mentions))',
                      'standard nursing references', 'gi')
 WHERE why_wrong_c ILIKE '%saunders%';

UPDATE cards
   SET why_wrong_d = REGEXP_REPLACE(
                      REGEXP_REPLACE(
                       REGEXP_REPLACE(
                        REGEXP_REPLACE(why_wrong_d,
                         '\yPer\s+Saunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                         'Per standard nursing references, ', 'gi'),
                        '\ySaunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                        'Standard nursing references ', 'gi'),
                       '\ySaunders(\s+\w+){0,4}\s*:\s*', '', 'gi'),
                      '\ySaunders\y(?!\s+(states|notes|lists|teaches|describes|defines|explains|specifies|identifies|recommends|emphasizes|details|outlines|presents|reviews|categorizes|explicitly|asserts|cautions|warns|instructs|highlights|stresses|advises|mentions))',
                      'standard nursing references', 'gi')
 WHERE why_wrong_d ILIKE '%saunders%';


-- Source field — residual regex pass for values that didn't start
-- with "Saunders" (e.g., "Adapted from Saunders Ch. 41...")
UPDATE cards
   SET source = REGEXP_REPLACE(
                 REGEXP_REPLACE(
                  REGEXP_REPLACE(
                   REGEXP_REPLACE(source,
                    '\yPer\s+Saunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                    'Per standard nursing references, ', 'gi'),
                   '\ySaunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                   'Standard nursing references ', 'gi'),
                  '\ySaunders(\s+\w+){0,4}\s*:\s*', '', 'gi'),
                 '\ySaunders\y(?!\s+(states|notes|lists|teaches|describes|defines|explains|specifies|identifies|recommends|emphasizes|details|outlines|presents|reviews|categorizes|explicitly|asserts|cautions|warns|instructs|highlights|stresses|advises|mentions))',
                 'standard nursing references', 'gi')
 WHERE source ILIKE '%saunders%';


-- ---------------------------------------------------------------------
-- 4. Cards table — JSONB fields (cast → regex → cast back)
-- ---------------------------------------------------------------------

UPDATE cards
   SET opts = REGEXP_REPLACE(
               REGEXP_REPLACE(
                REGEXP_REPLACE(
                 REGEXP_REPLACE(opts::text,
                  '\yPer\s+Saunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                  'Per standard nursing references, ', 'gi'),
                 '\ySaunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                 'Standard nursing references ', 'gi'),
                '\ySaunders(\s+\w+){0,4}\s*:\s*', '', 'gi'),
               '\ySaunders\y(?!\s+(states|notes|lists|teaches|describes|defines|explains|specifies|identifies|recommends|emphasizes|details|outlines|presents|reviews|categorizes|explicitly|asserts|cautions|warns|instructs|highlights|stresses|advises|mentions))',
               'standard nursing references', 'gi')::jsonb
 WHERE opts::text ILIKE '%saunders%';

UPDATE cards
   SET layers = REGEXP_REPLACE(
                 REGEXP_REPLACE(
                  REGEXP_REPLACE(
                   REGEXP_REPLACE(layers::text,
                    '\yPer\s+Saunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                    'Per standard nursing references, ', 'gi'),
                   '\ySaunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                   'Standard nursing references ', 'gi'),
                  '\ySaunders(\s+\w+){0,4}\s*:\s*', '', 'gi'),
                 '\ySaunders\y(?!\s+(states|notes|lists|teaches|describes|defines|explains|specifies|identifies|recommends|emphasizes|details|outlines|presents|reviews|categorizes|explicitly|asserts|cautions|warns|instructs|highlights|stresses|advises|mentions))',
                 'standard nursing references', 'gi')::jsonb
 WHERE layers::text ILIKE '%saunders%';

UPDATE cards
   SET why_wrong = REGEXP_REPLACE(
                    REGEXP_REPLACE(
                     REGEXP_REPLACE(
                      REGEXP_REPLACE(why_wrong::text,
                       '\yPer\s+Saunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                       'Per standard nursing references, ', 'gi'),
                      '\ySaunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                      'Standard nursing references ', 'gi'),
                     '\ySaunders(\s+\w+){0,4}\s*:\s*', '', 'gi'),
                    '\ySaunders\y(?!\s+(states|notes|lists|teaches|describes|defines|explains|specifies|identifies|recommends|emphasizes|details|outlines|presents|reviews|categorizes|explicitly|asserts|cautions|warns|instructs|highlights|stresses|advises|mentions))',
                    'standard nursing references', 'gi')::jsonb
 WHERE why_wrong::text ILIKE '%saunders%';

UPDATE cards
   SET mnemonic_json = REGEXP_REPLACE(
                        REGEXP_REPLACE(
                         REGEXP_REPLACE(
                          REGEXP_REPLACE(mnemonic_json::text,
                           '\yPer\s+Saunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                           'Per standard nursing references, ', 'gi'),
                          '\ySaunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                          'Standard nursing references ', 'gi'),
                         '\ySaunders(\s+\w+){0,4}\s*:\s*', '', 'gi'),
                        '\ySaunders\y(?!\s+(states|notes|lists|teaches|describes|defines|explains|specifies|identifies|recommends|emphasizes|details|outlines|presents|reviews|categorizes|explicitly|asserts|cautions|warns|instructs|highlights|stresses|advises|mentions))',
                        'standard nursing references', 'gi')::jsonb
 WHERE mnemonic_json::text ILIKE '%saunders%';


-- ---------------------------------------------------------------------
-- 5. ngn_cards — prose + JSONB (expected no-ops; ngn_cards already clean)
-- ---------------------------------------------------------------------

UPDATE ngn_cards
   SET scenario = REGEXP_REPLACE(
                   REGEXP_REPLACE(
                    REGEXP_REPLACE(
                     REGEXP_REPLACE(scenario,
                      '\yPer\s+Saunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                      'Per standard nursing references, ', 'gi'),
                     '\ySaunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                     'Standard nursing references ', 'gi'),
                    '\ySaunders(\s+\w+){0,4}\s*:\s*', '', 'gi'),
                   '\ySaunders\y(?!\s+(states|notes|lists|teaches|describes|defines|explains|specifies|identifies|recommends|emphasizes|details|outlines|presents|reviews|categorizes|explicitly|asserts|cautions|warns|instructs|highlights|stresses|advises|mentions))',
                   'standard nursing references', 'gi'),
       updated_at = NOW()
 WHERE scenario ILIKE '%saunders%';

UPDATE ngn_cards
   SET question = REGEXP_REPLACE(
                   REGEXP_REPLACE(
                    REGEXP_REPLACE(
                     REGEXP_REPLACE(question,
                      '\yPer\s+Saunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                      'Per standard nursing references, ', 'gi'),
                     '\ySaunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                     'Standard nursing references ', 'gi'),
                    '\ySaunders(\s+\w+){0,4}\s*:\s*', '', 'gi'),
                   '\ySaunders\y(?!\s+(states|notes|lists|teaches|describes|defines|explains|specifies|identifies|recommends|emphasizes|details|outlines|presents|reviews|categorizes|explicitly|asserts|cautions|warns|instructs|highlights|stresses|advises|mentions))',
                   'standard nursing references', 'gi'),
       updated_at = NOW()
 WHERE question ILIKE '%saunders%';

UPDATE ngn_cards
   SET rationale = REGEXP_REPLACE(
                    REGEXP_REPLACE(
                     REGEXP_REPLACE(
                      REGEXP_REPLACE(rationale,
                       '\yPer\s+Saunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                       'Per standard nursing references, ', 'gi'),
                      '\ySaunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                      'Standard nursing references ', 'gi'),
                     '\ySaunders(\s+\w+){0,4}\s*:\s*', '', 'gi'),
                    '\ySaunders\y(?!\s+(states|notes|lists|teaches|describes|defines|explains|specifies|identifies|recommends|emphasizes|details|outlines|presents|reviews|categorizes|explicitly|asserts|cautions|warns|instructs|highlights|stresses|advises|mentions))',
                    'standard nursing references', 'gi'),
       updated_at = NOW()
 WHERE rationale ILIKE '%saunders%';

UPDATE ngn_cards
   SET source = REGEXP_REPLACE(
                 REGEXP_REPLACE(
                  REGEXP_REPLACE(
                   REGEXP_REPLACE(source,
                    '\yPer\s+Saunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                    'Per standard nursing references, ', 'gi'),
                   '\ySaunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                   'Standard nursing references ', 'gi'),
                  '\ySaunders(\s+\w+){0,4}\s*:\s*', '', 'gi'),
                 '\ySaunders\y(?!\s+(states|notes|lists|teaches|describes|defines|explains|specifies|identifies|recommends|emphasizes|details|outlines|presents|reviews|categorizes|explicitly|asserts|cautions|warns|instructs|highlights|stresses|advises|mentions))',
                 'standard nursing references', 'gi'),
       updated_at = NOW()
 WHERE source ILIKE '%saunders%';

UPDATE ngn_cards
   SET content = REGEXP_REPLACE(
                  REGEXP_REPLACE(
                   REGEXP_REPLACE(
                    REGEXP_REPLACE(content::text,
                     '\yPer\s+Saunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                     'Per standard nursing references, ', 'gi'),
                    '\ySaunders\s+(Ch\.?|Chapter|Box|Table|Fig\.?|Figure|Section)\s*[\d\-]+(\s*p\.?\s*[\d\-]+)?\s*:?\s*',
                    'Standard nursing references ', 'gi'),
                   '\ySaunders(\s+\w+){0,4}\s*:\s*', '', 'gi'),
                  '\ySaunders\y(?!\s+(states|notes|lists|teaches|describes|defines|explains|specifies|identifies|recommends|emphasizes|details|outlines|presents|reviews|categorizes|explicitly|asserts|cautions|warns|instructs|highlights|stresses|advises|mentions))',
                  'standard nursing references', 'gi')::jsonb,
       updated_at = NOW()
 WHERE content::text ILIKE '%saunders%';


-- ---------------------------------------------------------------------
-- 6. Verification — expects ~13 bucket-2b residuals
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_cards_text   INTEGER;
  v_cards_jsonb  INTEGER;
  v_ngn_total    INTEGER;
  v_total        INTEGER;
  v_backup_cards INTEGER;
  v_backup_ngn   INTEGER;
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

  SELECT COUNT(*) INTO v_backup_cards FROM saunders_backup_pre_016_cards;
  SELECT COUNT(*) INTO v_backup_ngn   FROM saunders_backup_pre_016_ngn;

  v_total := v_cards_text + v_cards_jsonb + v_ngn_total;

  RAISE NOTICE 'Migration 016 v2: backup captured % cards rows, % ngn_cards rows.',
    v_backup_cards, v_backup_ngn;
  RAISE NOTICE 'Migration 016 v2: residuals (expected ~13 from bucket 2b): % total (cards-text: %, cards-jsonb: %, ngn_cards: %).',
    v_total, v_cards_text, v_cards_jsonb, v_ngn_total;

  IF v_total = 0 THEN
    RAISE NOTICE 'Migration 016 v2: zero residuals — bucket 2b may already have been cleaned, OR regex was more aggressive than expected. Inspect surgical pile before assuming done.';
  ELSIF v_total > 25 THEN
    RAISE WARNING 'Migration 016 v2: % residuals is significantly higher than expected ~13. Investigate before deploying to staging.', v_total;
  ELSE
    RAISE NOTICE 'Migration 016 v2: residual count within expected range. Proceed to 016b for surgical cleanup of bucket 2b rows.';
  END IF;
END $$;

COMMIT;
