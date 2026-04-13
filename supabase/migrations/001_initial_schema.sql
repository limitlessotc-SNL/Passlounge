-- Migration 001: Initial Schema
-- Created: 2025-04-12

CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nickname TEXT,
  tester_type TEXT,
  confidence TEXT,
  test_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT, cat TEXT, bloom TEXT, xp INT, type TEXT,
  scenario TEXT, question TEXT,
  opt_a TEXT, opt_b TEXT, opt_c TEXT, opt_d TEXT,
  correct INT,
  layer_1 TEXT, layer_2 TEXT, layer_3 TEXT, layer_4 TEXT,
  lens TEXT, pearl TEXT, mnemonic TEXT,
  why_wrong_a TEXT, why_wrong_b TEXT,
  why_wrong_c TEXT, why_wrong_d TEXT,
  is_diagnostic BOOLEAN DEFAULT FALSE,
  nclex_category TEXT,
  difficulty_level INT DEFAULT 3,
  difficulty_label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  name TEXT, mode TEXT,
  card_count INT DEFAULT 0,
  correct INT DEFAULT 0,
  wrong INT DEFAULT 0,
  xp INT DEFAULT 50,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diagnostic_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  correct INT, total INT, cat_level TEXT,
  results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
