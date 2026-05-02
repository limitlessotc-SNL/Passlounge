// src/features/messaging/messaging.types.ts
//
// Messaging types for the Phase D4 inbox. Mirrors migration 011 + 012's
// `messages` table; the `is_announcement` flag is what the coach broadcasts
// flip to mark a message as a cohort announcement (also persisted in the
// `announcements` table for the coach-side view).

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  cohort_id: string | null;
  subject: string;
  body: string;
  read_at: string | null;
  created_at: string;
  is_announcement: boolean;
  /** Joined client-side from `students` or `coaches`. Empty string when unknown. */
  sender_name?: string;
  /** Joined client-side from `students.avatar` (avatar id, not URL). */
  sender_avatar?: string;
}

export interface Conversation {
  other_party_id: string;
  other_party_name: string;
  other_party_avatar: string | null;
  other_party_role: 'student' | 'coach';
  last_message_body: string;
  last_message_at: string;
  unread_count: number;
  messages: Message[];
}

export interface SendMessagePayload {
  recipient_id: string;
  body: string;
  subject?: string;
  cohort_id?: string;
  is_announcement?: boolean;
}
