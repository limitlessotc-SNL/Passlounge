-- Migration 006: Session Snapshot Column
-- Created: 2026-04-18
--
-- Adds a JSONB `snapshot` column to the sessions table so we can store
-- the full SessionSnapshot (cards, results, answers, shuffles) per session.
-- This enables cross-device "Review Session" on past sessions.
--
-- Also adds `date` and `categories` text columns so session history shows
-- them without recomputation.

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS snapshot JSONB;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS categories TEXT;
