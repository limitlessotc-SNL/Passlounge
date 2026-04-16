/**
 * SR Store
 *
 * Zustand store for Spaced Repetition card progress.
 * Holds the cardProgressMap (loaded from Supabase on app init)
 * and a pending-updates queue for batch writes after sessions.
 *
 * Owner: Junior Engineer 4
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import type {
  CardProgressMap,
  SRActions,
  SRState,
} from '@/types'

const INITIAL_STATE: SRState = {
  cardProgressMap: {},
  cardProgressLoaded: false,
  srPendingUpdates: {},
}

export const useSRStore = create<SRState & SRActions>()(
  devtools(
    (set, get) => ({
      ...INITIAL_STATE,

      setCardProgressMap: (cardProgressMap: CardProgressMap) =>
        set({ cardProgressMap }),

      setCardProgressLoaded: (cardProgressLoaded: boolean) =>
        set({ cardProgressLoaded }),

      recordSRAnswer: (cardId: string, wasCorrect: boolean) => {
        const pending = { ...get().srPendingUpdates }
        if (!pending[cardId]) {
          pending[cardId] = { seen: 0, correct: 0, wrong: 0 }
        }
        pending[cardId].seen += 1
        if (wasCorrect) {
          pending[cardId].correct += 1
        } else {
          pending[cardId].wrong += 1
        }
        set({ srPendingUpdates: pending })
      },

      clearPendingUpdates: () => set({ srPendingUpdates: {} }),
    }),
    { name: 'srStore' },
  ),
)
