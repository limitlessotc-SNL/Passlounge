-- Migration 007: CPR (Candidate Performance Report) uploads for repeat testers
-- Created: 2026-04-19
--
-- Stores self-reported CPR breakdowns so repeat testers get a study plan
-- built around their exact weak NCSBN categories. Image storage is
-- optional and goes to the private `cpr-photos` storage bucket.
--
-- Keeping multiple rows per student lets them track improvement across
-- attempts (most recent row = current breakdown).

CREATE TABLE IF NOT EXISTS cpr_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  attempt_date DATE,
  overall_result TEXT CHECK (overall_result IN ('pass', 'fail')),
  image_path TEXT,
  categories JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cpr_reports_student ON cpr_reports(student_id, created_at DESC);

-- ─── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE cpr_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can read own cpr reports" ON cpr_reports;
CREATE POLICY "Students can read own cpr reports"
  ON cpr_reports FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can insert own cpr reports" ON cpr_reports;
CREATE POLICY "Students can insert own cpr reports"
  ON cpr_reports FOR INSERT
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can update own cpr reports" ON cpr_reports;
CREATE POLICY "Students can update own cpr reports"
  ON cpr_reports FOR UPDATE
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can delete own cpr reports" ON cpr_reports;
CREATE POLICY "Students can delete own cpr reports"
  ON cpr_reports FOR DELETE
  USING (auth.uid() = student_id);

-- ─── Storage bucket for CPR photos ────────────────────────────────────────
-- Bucket is private (not public) — authenticated access only.
INSERT INTO storage.buckets (id, name, public)
VALUES ('cpr-photos', 'cpr-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Each student can only read/write files under their own uid prefix,
-- e.g. `<auth.uid()>/<timestamp>.jpg`.
DROP POLICY IF EXISTS "Students can read own cpr photos" ON storage.objects;
CREATE POLICY "Students can read own cpr photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'cpr-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Students can upload own cpr photos" ON storage.objects;
CREATE POLICY "Students can upload own cpr photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'cpr-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Students can delete own cpr photos" ON storage.objects;
CREATE POLICY "Students can delete own cpr photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'cpr-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
