// src/features/messaging/messaging.service.ts
//
// Reads + writes for the Phase D4 messaging system. RLS on `messages`
// already restricts SELECT to sender or recipient (per migration 011), and
// INSERT to auth.uid() = sender_id (per 012). We trust those policies; this
// module is a thin Supabase client wrapper plus a small client-side join
// to look up sender display name + avatar from `students` or `coaches`.

import { supabase } from '@/config/supabase';

import type { Conversation, Message, SendMessagePayload } from './messaging.types';

// ─── Row types (raw Supabase shapes) ─────────────────────────────────

interface RawMessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  cohort_id: string | null;
  subject: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
  is_announcement: boolean | null;
}

interface SenderRow {
  id: string;
  name: string;
  avatar: string | null;
}

function mapMessageRow(row: RawMessageRow, senderLookup?: Map<string, SenderRow>): Message {
  const sender = senderLookup?.get(row.sender_id);
  return {
    id:              row.id,
    sender_id:       row.sender_id,
    recipient_id:    row.recipient_id,
    cohort_id:       row.cohort_id,
    subject:         row.subject ?? '',
    body:            row.body,
    read_at:         row.read_at,
    created_at:      row.created_at,
    is_announcement: !!row.is_announcement,
    sender_name:     sender?.name,
    sender_avatar:   sender?.avatar ?? undefined,
  };
}

/**
 * Resolves a set of sender IDs to {id, name, avatar}. Senders can be either
 * a student (id matches `students.id`) or a coach (auth_id matches
 * `coaches.auth_id`). We query both tables and merge — RLS on each is
 * already in place from earlier migrations.
 */
async function fetchSenderLookup(senderIds: string[]): Promise<Map<string, SenderRow>> {
  const lookup = new Map<string, SenderRow>();
  if (senderIds.length === 0) return lookup;
  const unique = Array.from(new Set(senderIds));

  const [students, coaches] = await Promise.all([
    supabase
      .from('students')
      .select('id, nickname, avatar')
      .in('id', unique),
    supabase
      .from('coaches')
      .select('auth_id, name')
      .in('auth_id', unique),
  ]);

  for (const row of (students.data ?? []) as Array<{ id: string; nickname: string | null; avatar: string | null }>) {
    lookup.set(row.id, {
      id: row.id,
      name: (row.nickname ?? '').trim() || 'Nurse',
      avatar: row.avatar,
    });
  }
  for (const row of (coaches.data ?? []) as Array<{ auth_id: string; name: string }>) {
    // Coach takes precedence over a student with the same auth_id, since coaches
    // are uniquely identified by auth_id in the messaging context.
    lookup.set(row.auth_id, {
      id: row.auth_id,
      name: row.name,
      avatar: null,
    });
  }
  return lookup;
}

// ─── Student-facing ─────────────────────────────────────────────────

export async function fetchStudentInbox(studentId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('recipient_id', studentId)
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[messaging.service] fetchStudentInbox:', error.message);
    return [];
  }
  const rows = (data ?? []) as RawMessageRow[];
  const lookup = await fetchSenderLookup(rows.map(r => r.sender_id));
  return rows.map(r => mapMessageRow(r, lookup));
}

export async function fetchConversationWithCoach(
  studentId: string,
  coachAuthId: string,
): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${studentId},recipient_id.eq.${coachAuthId}),` +
      `and(sender_id.eq.${coachAuthId},recipient_id.eq.${studentId})`,
    )
    .order('created_at', { ascending: true });
  if (error) {
    console.warn('[messaging.service] fetchConversationWithCoach:', error.message);
    return [];
  }
  const rows = (data ?? []) as RawMessageRow[];
  const lookup = await fetchSenderLookup(rows.map(r => r.sender_id));
  return rows.map(r => mapMessageRow(r, lookup));
}

export async function sendMessageToCoach(
  payload: SendMessagePayload,
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const senderId = auth.user?.id;
  if (!senderId) throw new Error('Not signed in');
  const { error } = await supabase.from('messages').insert({
    sender_id:       senderId,
    recipient_id:    payload.recipient_id,
    cohort_id:       payload.cohort_id ?? null,
    subject:         payload.subject ?? '',
    body:            payload.body,
    is_announcement: payload.is_announcement ?? false,
  });
  if (error) throw new Error(error.message);
}

export async function markMessagesAsRead(messageIds: string[]): Promise<void> {
  if (messageIds.length === 0) return;
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return;
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .in('id', messageIds)
    .eq('recipient_id', userId);
  if (error) console.warn('[messaging.service] markMessagesAsRead:', error.message);
}

export async function fetchUnreadCount(userId: string): Promise<number> {
  if (!userId) return 0;
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .is('read_at', null)
    .eq('is_announcement', false);
  if (error) {
    console.warn('[messaging.service] fetchUnreadCount:', error.message);
    return 0;
  }
  return count ?? 0;
}

export async function fetchAnnouncements(cohortId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('cohort_id', cohortId)
    .eq('is_announcement', true)
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[messaging.service] fetchAnnouncements:', error.message);
    return [];
  }
  const rows = (data ?? []) as RawMessageRow[];
  const lookup = await fetchSenderLookup(rows.map(r => r.sender_id));
  return rows.map(r => mapMessageRow(r, lookup));
}

// ─── Coach-facing ───────────────────────────────────────────────────

export async function fetchCoachInbox(coachAuthId: string): Promise<Conversation[]> {
  // Pull every message the coach is on either side of, then group.
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${coachAuthId},recipient_id.eq.${coachAuthId}`)
    .eq('is_announcement', false)
    .order('created_at', { ascending: true });
  if (error) {
    console.warn('[messaging.service] fetchCoachInbox:', error.message);
    return [];
  }
  const rows = (data ?? []) as RawMessageRow[];

  // The "other party" is whichever side isn't the coach.
  const partyIds = new Set<string>();
  for (const r of rows) {
    partyIds.add(r.sender_id === coachAuthId ? r.recipient_id : r.sender_id);
  }
  const lookup = await fetchSenderLookup([...partyIds, coachAuthId]);

  const byParty = new Map<string, Message[]>();
  for (const r of rows) {
    const otherId = r.sender_id === coachAuthId ? r.recipient_id : r.sender_id;
    const arr = byParty.get(otherId) ?? [];
    arr.push(mapMessageRow(r, lookup));
    byParty.set(otherId, arr);
  }

  const conversations: Conversation[] = [];
  for (const [otherId, msgs] of byParty.entries()) {
    const sender = lookup.get(otherId);
    const last = msgs[msgs.length - 1];
    const unread = msgs.filter(m => m.recipient_id === coachAuthId && m.read_at === null).length;
    conversations.push({
      other_party_id:    otherId,
      other_party_name:  sender?.name ?? 'Student',
      other_party_avatar: sender?.avatar ?? null,
      other_party_role:  'student', // coach side; if coach-to-coach is added later, branch here
      last_message_body: last.body,
      last_message_at:   last.created_at,
      unread_count:      unread,
      messages:          msgs,
    });
  }

  conversations.sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
  return conversations;
}

export async function sendMessageToStudent(
  payload: SendMessagePayload,
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const senderId = auth.user?.id;
  if (!senderId) throw new Error('Not signed in');
  const { error } = await supabase.from('messages').insert({
    sender_id:       senderId,
    recipient_id:    payload.recipient_id,
    cohort_id:       payload.cohort_id ?? null,
    subject:         payload.subject ?? '',
    body:            payload.body,
    is_announcement: payload.is_announcement ?? false,
  });
  if (error) throw new Error(error.message);
}

/**
 * Posts a coach announcement to (a) the `announcements` table for archive,
 * AND (b) the `messages` table once per active cohort student so each one
 * sees it in their inbox with `is_announcement = true`. The two writes are
 * sequential — if the announcement insert fails we don't fan-out; if any
 * inbox-fanout insert fails we surface the error but the announcement is
 * already persisted (acceptable since the archive is the source of truth).
 */
export async function sendAnnouncement(
  coachAuthId: string,
  cohortId: string,
  title: string,
  body: string,
  pinned = false,
): Promise<{ studentCount: number }> {
  // Look up the coach's row id (announcements.coach_id is coaches.id, not auth_id).
  const { data: coach, error: ce } = await supabase
    .from('coaches')
    .select('id')
    .eq('auth_id', coachAuthId)
    .maybeSingle();
  if (ce) throw new Error(ce.message);
  if (!coach) throw new Error('Coach not found');

  const { error: ae } = await supabase.from('announcements').insert({
    cohort_id: cohortId,
    coach_id:  (coach as { id: string }).id,
    title,
    body,
    pinned,
  });
  if (ae) throw new Error(ae.message);

  const { data: members, error: me } = await supabase
    .from('cohort_students')
    .select('student_id')
    .eq('cohort_id', cohortId)
    .eq('status', 'active');
  if (me) throw new Error(me.message);

  const rows = ((members ?? []) as Array<{ student_id: string }>).map(m => ({
    sender_id:       coachAuthId,
    recipient_id:    m.student_id,
    cohort_id:       cohortId,
    subject:         title,
    body,
    is_announcement: true,
  }));
  if (rows.length > 0) {
    const { error: ie } = await supabase.from('messages').insert(rows);
    if (ie) throw new Error(ie.message);
  }
  return { studentCount: rows.length };
}

export async function fetchStudentMessages(
  coachAuthId: string,
  studentId: string,
): Promise<Message[]> {
  return fetchConversationWithCoach(studentId, coachAuthId);
}
