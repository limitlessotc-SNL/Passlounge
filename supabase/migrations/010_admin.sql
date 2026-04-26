-- Migration 010: Admin role + audit + login attempts
-- Created: 2026-04-24
--
-- Adds an `is_admin` flag to students and the two tables that back the
-- admin auth flow: an audit log of admin actions and a login-attempt log
-- used for client-side rate limiting.

-- ─── students.is_admin ────────────────────────────────────────────────────
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- ─── admin_audit_log ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id  UUID         NOT NULL REFERENCES students(id),
  action      TEXT         NOT NULL,
  details     JSONB        DEFAULT '{}'::jsonb,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_student
  ON admin_audit_log(student_id, created_at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read audit log" ON admin_audit_log;
CREATE POLICY "Admins can read audit log"
  ON admin_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE id = auth.uid() AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "System can insert audit log" ON admin_audit_log;
CREATE POLICY "System can insert audit log"
  ON admin_audit_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── admin_login_attempts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id   UUID         REFERENCES students(id),
  attempted_at TIMESTAMPTZ  DEFAULT NOW(),
  succeeded    BOOLEAN      NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_student
  ON admin_login_attempts(student_id, attempted_at DESC);

ALTER TABLE admin_login_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can insert own attempts" ON admin_login_attempts;
CREATE POLICY "Students can insert own attempts"
  ON admin_login_attempts FOR INSERT
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can read own attempts" ON admin_login_attempts;
CREATE POLICY "Students can read own attempts"
  ON admin_login_attempts FOR SELECT
  USING (auth.uid() = student_id);
