// src/store/coachStore.ts
//
// Zustand store for the SNL Educator session. Holds the signed-in coach + the
// associated school. Initialised on app boot or after login by reading the
// current Supabase auth session and looking up the matching coaches row.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { supabase } from '@/config/supabase';
import {
  getCoachByAuthId,
  getSchoolById,
} from '@/features/coach/coach.service';
import type { Coach, CoachAuthState, School } from '@/features/coach/coach.types';

interface CoachActions {
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Test helper — directly seed state. Not used in production code paths. */
  _setForTest: (state: Partial<CoachAuthState>) => void;
}

const initial: CoachAuthState = {
  coach: null,
  school: null,
  isLoading: true,
  isAuthenticated: false,
};

export const useCoachStore = create<CoachAuthState & CoachActions>()(
  devtools(
    (set) => ({
      ...initial,

      initialize: async () => {
        set({ isLoading: true });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            set({ ...initial, isLoading: false });
            return;
          }
          const coach: Coach | null = await getCoachByAuthId(user.id);
          if (!coach) {
            set({ ...initial, isLoading: false });
            return;
          }
          const school: School | null = await getSchoolById(coach.school_id);
          set({
            coach,
            school,
            isLoading: false,
            isAuthenticated: true,
          });
        } catch (e) {
          console.warn('[coachStore] initialize:', (e as Error).message);
          set({ ...initial, isLoading: false });
        }
      },

      signOut: async () => {
        try {
          await supabase.auth.signOut();
        } catch {
          // Ignore — Supabase may be offline; we still clear local state.
        }
        set({ ...initial, isLoading: false });
      },

      _setForTest: (state) => set(state as CoachAuthState),
    }),
    { name: 'coachStore' },
  ),
);
