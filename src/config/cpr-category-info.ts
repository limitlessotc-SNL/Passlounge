/**
 * CPR Category Info
 *
 * Descriptive content for each of the 8 NCSBN Client Needs categories,
 * used by CPRAnalysisScreen to explain what each category covers and
 * what Above / Near / Below Passing means for the student's study plan.
 *
 * Source: NCSBN 2023 NCLEX-RN Test Plan.
 *
 * Owner: Junior Engineer 2
 */

import type { CPRResultLevel } from './cpr-categories'

export interface CPRCategoryInfo {
  id: string;
  /** Percent of NCLEX items drawn from this category (approx range). */
  weight: string;
  /** One-paragraph scope of the category. */
  overview: string;
  /** Specific subtopics NCSBN lists under this category. */
  topics: string[];
  /** Level-specific advice tailored to this category. */
  advice: Record<CPRResultLevel, string>;
}

export const CPR_CATEGORY_INFO: Record<string, CPRCategoryInfo> = {
  management_of_care: {
    id: 'management_of_care',
    weight: '17–23%',
    overview:
      'Care coordination, leadership, and ethical-legal practice. How you prioritize, delegate, advocate, and protect clients in a team environment.',
    topics: [
      'Prioritization and assignment',
      'Delegation to UAP / LPN',
      'Advance directives and informed consent',
      'Advocacy and ethical practice',
      'Confidentiality and HIPAA',
      'Continuity of care and referrals',
      'Case management and legal responsibilities',
    ],
    advice: {
      below:
        'Your top priority. Drill prioritization frameworks (Maslow, ABCs, acute-over-chronic), delegation rules (RN-only tasks), and ethical/legal scenarios every study session.',
      near:
        'Review high-yield delegation matrices and consent/advocacy edge cases. A few focused sessions should push this into passing range.',
      above:
        'Keep this sharp with brief weekly reviews — this is the largest category on the exam, so drift here hurts.',
    },
  },

  safety_and_infection_control: {
    id: 'safety_and_infection_control',
    weight: '9–15%',
    overview:
      'Protecting clients, staff, and self from harm. Covers infection precautions, emergency response, error prevention, and safe use of equipment.',
    topics: [
      'Standard and transmission-based precautions',
      'Accident and injury prevention',
      'Emergency response and disaster planning',
      'Restraints (least-restrictive, monitoring, documentation)',
      'Safe handling of hazardous / biohazard materials',
      'Reporting incidents and sentinel events',
      'Safe equipment use and home safety teaching',
    ],
    advice: {
      below:
        'Memorize isolation precautions for the high-yield organisms (TB, C. diff, measles, MRSA) and restraint rules cold. Run through emergency-triage scenarios.',
      near:
        'Solidify the edge cases: airborne vs droplet, protective vs contact, and restraint monitoring intervals.',
      above:
        'Solid — maintain with a quick scan of precaution tables the week before test day.',
    },
  },

  health_promotion_and_maintenance: {
    id: 'health_promotion_and_maintenance',
    weight: '6–12%',
    overview:
      'Wellness across the lifespan. Growth and development milestones, screenings, immunizations, and teaching clients to prevent disease.',
    topics: [
      'Growth and developmental stages (Erikson / Piaget)',
      'Health screening and assessment techniques',
      'Immunization schedules (pediatric + adult)',
      'Antepartum / intrapartum / postpartum care',
      'Newborn care and self-care education',
      'Lifestyle choices (nutrition, exercise, smoking)',
      'Aging process and geriatric considerations',
    ],
    advice: {
      below:
        'Focus on developmental milestones, vaccine schedules, and normal vs abnormal findings in pregnancy/newborns. These are memorizable wins.',
      near:
        'Polish the pediatric milestone table and postpartum warning signs. High return on a few hours of focused review.',
      above:
        'Good footing here. Keep normal prenatal labs and developmental red flags fresh.',
    },
  },

  psychosocial_integrity: {
    id: 'psychosocial_integrity',
    weight: '6–12%',
    overview:
      'Mental, emotional, and social care. Therapeutic communication, coping, crisis, abuse, cultural humility, and end-of-life support.',
    topics: [
      'Therapeutic communication techniques',
      'Coping mechanisms and stress management',
      'Grief, loss, and end-of-life care',
      'Mental health disorders and behavioral interventions',
      'Substance use and chemical dependency',
      'Abuse / neglect identification and reporting',
      'Cultural awareness and religious / spiritual care',
      'Family dynamics and therapeutic milieu',
    ],
    advice: {
      below:
        'Drill therapeutic vs non-therapeutic responses, signs of suicidal ideation, and abuse reporting duties. These questions lean on communication nuance.',
      near:
        'Practice identifying the "best" therapeutic response when multiple answers sound supportive. Review crisis intervention stages.',
      above:
        'Keep therapeutic communication phrasing in mind — even strong test-takers lose points here when rushed.',
    },
  },

  basic_care_and_comfort: {
    id: 'basic_care_and_comfort',
    weight: '6–12%',
    overview:
      'Everyday nursing: helping clients meet activities of daily living, nutrition, mobility, elimination, rest, and non-pharm comfort.',
    topics: [
      'Activities of daily living (ADLs) and hygiene',
      'Nutrition and oral hydration',
      'Mobility / immobility and assistive devices',
      'Rest and sleep',
      'Non-pharmacological comfort (positioning, heat/cold, music)',
      'Elimination (bowel and bladder training)',
      'Palliative and comfort-focused care',
    ],
    advice: {
      below:
        'Review therapeutic diets (cardiac, renal, diabetic, low-residue), positioning after procedures, and safe feeding/transfer techniques.',
      near:
        'Target therapeutic diets and fall-prevention positioning. Low complexity, high score yield.',
      above:
        'Stay fresh on therapeutic-diet quick-reference tables.',
    },
  },

  pharmacological_and_parenteral_therapies: {
    id: 'pharmacological_and_parenteral_therapies',
    weight: '12–18%',
    overview:
      'Medications, IV therapy, blood products, TPN, and dosage math. Includes adverse reactions, interactions, and safe administration.',
    topics: [
      'Drug classes and mechanisms of action',
      'Adverse effects and contraindications',
      'Dosage calculations (oral, IV, units/kg/hr)',
      'IV therapy and central lines',
      'Blood product administration',
      'Total parenteral nutrition (TPN)',
      'Pain management and PCA pumps',
      'Expected vs toxic therapeutic levels',
    ],
    advice: {
      below:
        'Critical. Rebuild your med list by class (beta blockers, ACE inhibitors, anticoagulants, diuretics, antibiotics). Drill dosage calc 15 min daily.',
      near:
        'Lock in therapeutic levels (dig, lithium, warfarin/INR, heparin/aPTT) and key adverse effects. Redo any dosage-calc question you missed.',
      above:
        'Keep your dosage-calc speed up. Don\'t let a math slip cost you a passing category.',
    },
  },

  reduction_of_risk_potential: {
    id: 'reduction_of_risk_potential',
    weight: '9–15%',
    overview:
      'Anticipating and preventing complications from conditions, diagnostic tests, and treatments. Requires knowing labs, test prep, and post-procedure monitoring.',
    topics: [
      'Lab values (normal ranges and critical values)',
      'Diagnostic tests (prep, consent, post-procedure)',
      'Therapeutic procedures and monitoring',
      'System-specific assessments (neuro, cardiac, respiratory)',
      'Potential for alterations and complications',
      'Changes in vital signs — when to act',
    ],
    advice: {
      below:
        'Memorize normal + critical lab values and know the red-flag post-procedure signs. This is where "which finding should the nurse report first" questions live.',
      near:
        'Focus on pre/post-op teaching, contrast dye precautions, and ABG interpretation.',
      above:
        'Keep lab ranges crisp — a half-second pause on a lab question can break your rhythm.',
    },
  },

  physiological_adaptation: {
    id: 'physiological_adaptation',
    weight: '11–17%',
    overview:
      'Managing clients with acute, chronic, or life-threatening physical conditions. Heavy on pathophysiology, hemodynamics, and emergency interventions.',
    topics: [
      'Alterations in body systems (CV, resp, renal, GI, endocrine, neuro)',
      'Fluid and electrolyte imbalances',
      'Acid-base balance',
      'Hemodynamic monitoring',
      'Medical emergencies (MI, stroke, sepsis, DKA, shock)',
      'Pathophysiology of common chronic diseases',
      'Unexpected response to therapies',
    ],
    advice: {
      below:
        'Rebuild pathophys foundations for the big killers: MI, stroke, sepsis, DKA, respiratory failure. Tie signs/symptoms to interventions.',
      near:
        'Drill fluid/electrolyte and acid-base quick-reference. Work priority scenarios for each emergency.',
      above:
        'Keep pathophys connections tight. Reviewing "cause → effect → intervention" chains once a week is enough.',
    },
  },
}

/**
 * Safely fetches info for a category id, returning null if unknown.
 */
export function getCategoryInfo(id: string): CPRCategoryInfo | null {
  return CPR_CATEGORY_INFO[id] ?? null
}
