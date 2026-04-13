-- Migration 003: Add Onboarding Columns
-- Created: 2025-04-12

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT FALSE;

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS daily_cards INT DEFAULT 35;
