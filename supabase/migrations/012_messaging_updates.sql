-- Migration 012: Messaging system updates
-- Created: 2026-05-01
--
-- Adds the announcements-as-inbox-messages flag and inbox-read indexes
-- on top of the messages table created in 011. Also re-asserts the
-- INSERT-as-self RLS policy so students can initiate threads with
-- their coach (011 had this policy under "Authenticated can send
-- messages" but we re-create idempotently in case 011 was partially
-- applied or the policy was dropped).

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS is_announcement BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_messages_recipient_read
  ON messages(recipient_id, read_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_announcement
  ON messages(cohort_id, is_announcement, created_at DESC);

-- Postgres doesn't support CREATE POLICY IF NOT EXISTS; use DROP + CREATE.
DROP POLICY IF EXISTS "Students can send messages" ON messages;
CREATE POLICY "Students can send messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Verify
SELECT column_name FROM information_schema.columns
WHERE table_name = 'messages'
  AND column_name = 'is_announcement';
