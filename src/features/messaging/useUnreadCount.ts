// src/features/messaging/useUnreadCount.ts
//
// Polls fetchUnreadCount every 30s for the BottomNav badge. The interval is
// short enough that a coach reply lands within a tab-switch and long enough
// that a permanently-open inbox tab doesn't hammer Supabase. We re-poll on
// userId change (e.g. login or session restore) so the badge resets on
// account switch instead of carrying over the previous user's count.

import { useEffect, useState } from 'react';

import { fetchUnreadCount } from './messaging.service';

const POLL_INTERVAL_MS = 30_000;

export function useUnreadCount(userId: string): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setCount(0);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      const next = await fetchUnreadCount(userId);
      if (!cancelled) setCount(next);
    };
    void tick();
    const id = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [userId]);

  return count;
}
