/**
 * CPR Store
 *
 * Holds:
 *  - the draft the user fills out on CPREntry \u2192 Review
 *  - the latest persisted CPR report for the signed-in student (for the
 *    HomeTab dashboard card). Populated by useCPR.loadLatest().
 *
 * Owner: Junior Engineer 2
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import type { CPRCategoriesMap, CPRDraft, CPRReport, CPRResultLevel } from '@/types'

const emptyDraft: CPRDraft = {
  attempt_date: null,
  overall_result: null,
  image_path: null,
  categories: {},
}

interface CPRState {
  draft: CPRDraft;
  latest: CPRReport | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

interface CPRActions {
  resetDraft: () => void;
  setAttemptDate: (date: string | null) => void;
  setCategoryResult: (categoryId: string, level: CPRResultLevel) => void;
  setCategoriesMap: (map: CPRCategoriesMap) => void;
  setLatest: (report: CPRReport | null) => void;
  setIsLoading: (loading: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  setError: (message: string | null) => void;
}

export const useCPRStore = create<CPRState & CPRActions>()(
  devtools(
    (set) => ({
      draft: { ...emptyDraft, categories: {} },
      latest: null,
      isLoading: false,
      isSaving: false,
      error: null,

      resetDraft: () => set({ draft: { ...emptyDraft, categories: {} }, error: null }),

      setAttemptDate: (attempt_date) =>
        set((s) => ({ draft: { ...s.draft, attempt_date } })),

      setCategoryResult: (categoryId, level) =>
        set((s) => ({
          draft: {
            ...s.draft,
            categories: { ...s.draft.categories, [categoryId]: level },
          },
        })),

      setCategoriesMap: (categories) =>
        set((s) => ({ draft: { ...s.draft, categories } })),

      setLatest: (latest) => set({ latest }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setIsSaving: (isSaving) => set({ isSaving }),
      setError: (error) => set({ error }),
    }),
    { name: 'cprStore' },
  ),
)
