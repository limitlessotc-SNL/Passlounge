-- Migration 002: Add Card Progress Table
-- Created: 2025-04-12

CREATE TABLE IF NOT EXISTS card_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id),
  card_id UUID NOT NULL,
  times_seen INT DEFAULT 0,
  times_correct INT DEFAULT 0,
  times_wrong INT DEFAULT 0,
  last_seen TIMESTAMPTZ,
  ease_factor FLOAT DEFAULT 2.5,
  next_review TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, card_id)
);
