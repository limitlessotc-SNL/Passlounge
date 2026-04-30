-- Migration 011: Coach / cohort schema for the SNL Educator dashboard
-- Created: 2026-04-28
--
-- Adds the data layer for B2B coach access:
--   • schools  — license tier + max_students cap (shell for future billing)
--   • coaches  — auth-bound staff who can read/manage their school's cohorts
--   • cohorts  — named groups of students with a shareable join code
--   • cohort_students — membership rows (PK = cohort_id + student_id)
--   • coach_notes / interventions — private per-student records for coaches
--   • nclex_outcomes — recorded after a student takes the real exam
--   • messages — 1:1 between auth users; cohort_id is optional context
--   • announcements — coach broadcast to a cohort
--
-- RLS is enabled on every new table. All policies key off coaches.auth_id =
-- auth.uid() — there is no client-side admin path that can bypass them. A
-- coach can only see data scoped to their school; students can only see
-- their own membership and announcements for cohorts they belong to.

-- ─── Schools ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schools (
  id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT         NOT NULL,
  contact_email TEXT         NOT NULL,
  license_tier  TEXT         NOT NULL DEFAULT 'individual'
    CHECK (license_tier IN ('individual','program','enterprise')),
  license_expires_at TIMESTAMPTZ,
  max_students  INT          NOT NULL DEFAULT 10,
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- Default school for owner. Skip if it already exists (re-running migration).
INSERT INTO schools (name, contact_email, license_tier, max_students)
SELECT 'SNL', 'owner@snl.com', 'enterprise', 9999
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE name = 'SNL');

-- ─── Coaches ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coaches (
  id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id     UUID         NOT NULL REFERENCES schools(id),
  auth_id       UUID         NOT NULL UNIQUE REFERENCES auth.users(id),
  name          TEXT         NOT NULL,
  email         TEXT         NOT NULL UNIQUE,
  role          TEXT         NOT NULL DEFAULT 'faculty'
    CHECK (role IN ('super_admin','school_admin','faculty')),
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── Cohorts ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cohorts (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id        UUID         NOT NULL REFERENCES schools(id),
  coach_id         UUID         NOT NULL REFERENCES coaches(id),
  name             TEXT         NOT NULL,
  cohort_code      TEXT         NOT NULL UNIQUE,
  target_test_date DATE,
  is_active        BOOLEAN      NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cohorts_code  ON cohorts(cohort_code);
CREATE INDEX IF NOT EXISTS idx_cohorts_coach ON cohorts(coach_id);

-- ─── Cohort membership ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cohort_students (
  cohort_id   UUID        NOT NULL REFERENCES cohorts(id),
  student_id  UUID        NOT NULL REFERENCES students(id),
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  status      TEXT        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','passed','failed','withdrawn')),
  PRIMARY KEY (cohort_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_cohort_students_student
  ON cohort_students(student_id);

-- ─── Coach notes (private, per student) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS coach_notes (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id    UUID         NOT NULL REFERENCES coaches(id),
  student_id  UUID         NOT NULL REFERENCES students(id),
  note        TEXT         NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_notes_student
  ON coach_notes(student_id, created_at DESC);

-- ─── Intervention log ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interventions (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id    UUID         NOT NULL REFERENCES coaches(id),
  student_id  UUID         NOT NULL REFERENCES students(id),
  type        TEXT         NOT NULL
    CHECK (type IN ('message','session','resource','referral','other')),
  notes       TEXT         NOT NULL DEFAULT '',
  outcome     TEXT,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── NCLEX outcomes ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nclex_outcomes (
  id             UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id     UUID         NOT NULL REFERENCES students(id),
  cohort_id      UUID         REFERENCES cohorts(id),
  test_date      DATE         NOT NULL,
  result         TEXT         NOT NULL DEFAULT 'pending'
    CHECK (result IN ('pending','passed','failed')),
  attempt_number INT          NOT NULL DEFAULT 1,
  recorded_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── Messages ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id    UUID         NOT NULL REFERENCES auth.users(id),
  recipient_id UUID         NOT NULL REFERENCES auth.users(id),
  cohort_id    UUID         REFERENCES cohorts(id),
  subject      TEXT         NOT NULL DEFAULT '',
  body         TEXT         NOT NULL,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_recipient
  ON messages(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender
  ON messages(sender_id, created_at DESC);

-- ─── Announcements (coach → whole cohort) ───────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id         UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  cohort_id  UUID         NOT NULL REFERENCES cohorts(id),
  coach_id   UUID         NOT NULL REFERENCES coaches(id),
  title      TEXT         NOT NULL,
  body       TEXT         NOT NULL,
  pinned     BOOLEAN      NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── Enable RLS ─────────────────────────────────────────────────────────
ALTER TABLE schools           ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohorts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_students   ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_notes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE nclex_outcomes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements     ENABLE ROW LEVEL SECURITY;

-- ─── Policies ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Coaches can read own school" ON schools;
CREATE POLICY "Coaches can read own school"
  ON schools FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coaches
      WHERE coaches.auth_id = auth.uid()
        AND coaches.school_id = schools.id
    )
  );

DROP POLICY IF EXISTS "Coaches can read own row" ON coaches;
CREATE POLICY "Coaches can read own row"
  ON coaches FOR SELECT
  USING (auth_id = auth.uid());

-- Students need the coach name for the "You are in: cohort — coach" panel
-- on their profile. Limited to coaches whose cohort the student belongs to.
DROP POLICY IF EXISTS "Students can read coach for own cohort" ON coaches;
CREATE POLICY "Students can read coach for own cohort"
  ON coaches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cohorts co
      JOIN cohort_students cs ON cs.cohort_id = co.id
      WHERE co.coach_id = coaches.id
        AND cs.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Coaches can read own cohorts" ON cohorts;
CREATE POLICY "Coaches can read own cohorts"
  ON cohorts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coaches
      WHERE coaches.auth_id = auth.uid()
        AND coaches.school_id = cohorts.school_id
    )
  );

DROP POLICY IF EXISTS "Students can read cohorts they joined" ON cohorts;
CREATE POLICY "Students can read cohorts they joined"
  ON cohorts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cohort_students cs
      WHERE cs.cohort_id = cohorts.id
        AND cs.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Coaches can insert cohorts" ON cohorts;
CREATE POLICY "Coaches can insert cohorts"
  ON cohorts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coaches
      WHERE coaches.auth_id = auth.uid()
        AND coaches.school_id = cohorts.school_id
    )
  );

DROP POLICY IF EXISTS "Coaches can update own cohorts" ON cohorts;
CREATE POLICY "Coaches can update own cohorts"
  ON cohorts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM coaches c
      WHERE c.auth_id = auth.uid()
        AND c.id = cohorts.coach_id
    )
  );

DROP POLICY IF EXISTS "Coaches can read cohort students" ON cohort_students;
CREATE POLICY "Coaches can read cohort students"
  ON cohort_students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN cohorts co ON co.id = cohort_students.cohort_id
      WHERE c.auth_id = auth.uid()
        AND c.school_id = co.school_id
    )
  );

DROP POLICY IF EXISTS "Students can read own cohort membership" ON cohort_students;
CREATE POLICY "Students can read own cohort membership"
  ON cohort_students FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can join cohorts" ON cohort_students;
CREATE POLICY "Students can join cohorts"
  ON cohort_students FOR INSERT
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Coaches can read own notes" ON coach_notes;
CREATE POLICY "Coaches can read own notes"
  ON coach_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coaches
      WHERE coaches.auth_id = auth.uid()
        AND coaches.id = coach_notes.coach_id
    )
  );

DROP POLICY IF EXISTS "Coaches can insert notes" ON coach_notes;
CREATE POLICY "Coaches can insert notes"
  ON coach_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coaches
      WHERE coaches.auth_id = auth.uid()
        AND coaches.id = coach_notes.coach_id
    )
  );

DROP POLICY IF EXISTS "Coaches can read own interventions" ON interventions;
CREATE POLICY "Coaches can read own interventions"
  ON interventions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coaches
      WHERE coaches.auth_id = auth.uid()
        AND coaches.id = interventions.coach_id
    )
  );

DROP POLICY IF EXISTS "Coaches can insert interventions" ON interventions;
CREATE POLICY "Coaches can insert interventions"
  ON interventions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coaches
      WHERE coaches.auth_id = auth.uid()
        AND coaches.id = interventions.coach_id
    )
  );

DROP POLICY IF EXISTS "Coaches can read outcomes" ON nclex_outcomes;
CREATE POLICY "Coaches can read outcomes"
  ON nclex_outcomes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN cohort_students cs ON cs.student_id = nclex_outcomes.student_id
      JOIN cohorts co ON co.id = cs.cohort_id
      WHERE c.auth_id = auth.uid()
        AND c.school_id = co.school_id
    )
  );

DROP POLICY IF EXISTS "Coaches can insert outcomes" ON nclex_outcomes;
CREATE POLICY "Coaches can insert outcomes"
  ON nclex_outcomes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coaches
      WHERE coaches.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Messages readable by sender and recipient" ON messages;
CREATE POLICY "Messages readable by sender and recipient"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Authenticated can send messages" ON messages;
CREATE POLICY "Authenticated can send messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Coaches can read cohort announcements" ON announcements;
CREATE POLICY "Coaches can read cohort announcements"
  ON announcements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN cohorts co ON co.id = announcements.cohort_id
      WHERE c.auth_id = auth.uid()
        AND c.school_id = co.school_id
    )
  );

DROP POLICY IF EXISTS "Students can read own cohort announcements" ON announcements;
CREATE POLICY "Students can read own cohort announcements"
  ON announcements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cohort_students cs
      WHERE cs.cohort_id = announcements.cohort_id
        AND cs.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Coaches can insert announcements" ON announcements;
CREATE POLICY "Coaches can insert announcements"
  ON announcements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coaches
      WHERE coaches.auth_id = auth.uid()
        AND coaches.id = announcements.coach_id
    )
  );

-- ─── Verify ─────────────────────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'schools','coaches','cohorts','cohort_students',
    'coach_notes','interventions','nclex_outcomes',
    'messages','announcements'
  )
ORDER BY table_name;
