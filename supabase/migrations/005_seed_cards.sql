-- Migration 005: Seed Cards
-- Created: 2026-04-16
--
-- Seeds all 31 cards (15 diagnostic + 16 study) into the cards table.
-- Run this AFTER migration 004 which adds the JSON columns.
--
-- Rather than maintaining SQL duplicates of the card data, the recommended
-- approach is to run the Node seed script (see supabase/seed.mjs) which reads
-- directly from src/config/fallback-cards.ts — single source of truth.
--
-- To seed manually, execute: node supabase/seed.mjs
-- This script connects with the service role key and inserts all cards.

-- This migration file is intentionally empty — seeding happens via the
-- Node script to avoid duplicating 31 cards in SQL format.
-- The app will automatically fall back to hardcoded cards if the table is empty.

SELECT 1 AS seed_via_node_script;
