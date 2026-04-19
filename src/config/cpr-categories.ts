/**
 * CPR (Candidate Performance Report) Categories
 *
 * The 8 NCSBN Client Needs categories that appear on every NCLEX CPR.
 * Each category is graded Above / Near / Below passing on the report.
 *
 * These ids are persisted in `cpr_reports.categories` as:
 *   { management_of_care: 'above', safety_and_infection_control: 'near', ... }
 *
 * Owner: Junior Engineer 2
 */

export const CPR_RESULT_LEVELS = ['above', 'near', 'below'] as const
export type CPRResultLevel = typeof CPR_RESULT_LEVELS[number]

export interface CPRCategory {
  /** Stable id used as the JSONB key in cpr_reports.categories. */
  id: string;
  /** Human-readable label shown on forms and dashboard. */
  label: string;
  /** Short label for compact displays (card grid, weak-area chips). */
  short: string;
}

export const CPR_CATEGORIES: readonly CPRCategory[] = [
  { id: 'management_of_care', label: 'Management of Care', short: 'Management' },
  { id: 'safety_and_infection_control', label: 'Safety and Infection Control', short: 'Safety' },
  { id: 'health_promotion_and_maintenance', label: 'Health Promotion and Maintenance', short: 'Health Promo' },
  { id: 'psychosocial_integrity', label: 'Psychosocial Integrity', short: 'Psychosocial' },
  { id: 'basic_care_and_comfort', label: 'Basic Care and Comfort', short: 'Basic Care' },
  { id: 'pharmacological_and_parenteral_therapies', label: 'Pharmacological and Parenteral Therapies', short: 'Pharm' },
  { id: 'reduction_of_risk_potential', label: 'Reduction of Risk Potential', short: 'Risk Reduction' },
  { id: 'physiological_adaptation', label: 'Physiological Adaptation', short: 'Physiological' },
] as const

/** Map of categoryId → user's result. Missing keys mean "not answered yet". */
export type CPRCategoriesMap = Partial<Record<string, CPRResultLevel>>

/**
 * Returns true if the given value is a valid CPRResultLevel.
 */
export function isValidResult(value: unknown): value is CPRResultLevel {
  return typeof value === 'string' && (CPR_RESULT_LEVELS as readonly string[]).includes(value)
}

/**
 * Returns true when every category in CPR_CATEGORIES has a valid result.
 * Used to gate the "Review" / "Save" buttons on the entry form.
 */
export function isComplete(map: CPRCategoriesMap): boolean {
  return CPR_CATEGORIES.every((c) => isValidResult(map[c.id]))
}

/**
 * Returns categories where the user scored Below passing.
 * These are the "weak areas" that should drive study priority.
 */
export function getWeakCategories(map: CPRCategoriesMap): CPRCategory[] {
  return CPR_CATEGORIES.filter((c) => map[c.id] === 'below')
}

/**
 * Returns categories where the user scored Above passing.
 */
export function getStrongCategories(map: CPRCategoriesMap): CPRCategory[] {
  return CPR_CATEGORIES.filter((c) => map[c.id] === 'above')
}

/**
 * Returns a simple ordering: below < near < above. Useful for sorting
 * category rows so weakest surface first in the dashboard card.
 */
export function resultRank(level: CPRResultLevel | undefined): number {
  if (level === 'below') return 0
  if (level === 'near') return 1
  if (level === 'above') return 2
  return 3
}

/**
 * Returns the human label for a result level.
 */
export function resultLabel(level: CPRResultLevel): string {
  switch (level) {
    case 'above': return 'Above Passing'
    case 'near': return 'Near Passing'
    case 'below': return 'Below Passing'
  }
}
