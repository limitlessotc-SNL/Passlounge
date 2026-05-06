// src/features/ngn/NGNPreviewScreen.tsx
//
// TEMPORARY preview page mounted at /ngn-preview. Renders all 7 NGN
// question-type components with realistic NCLEX-style sample data so the
// full interactive flow (scenario → question → answer → rationale) is
// visible per type. Delete the route + this file when no longer needed.

import { NGNCardScreen } from './NGNCardScreen'
import type { NGNCard } from './ngn.types'

const GOLD = '#F5C518'

const SAMPLES: Array<{ label: string; card: NGNCard }> = [
  // 1. Bow-tie — digoxin toxicity
  {
    label: 'Bow-tie · Pharmacology · L4',
    card: {
      id: 'preview-bowtie',
      title: 'Digoxin toxicity priorities',
      scenario:
        'A 78-year-old patient on digoxin 0.25 mg PO daily presents with nausea, confusion, ' +
        'and yellow-green visual halos. Heart rate is 48 bpm. Most recent labs: K+ 3.2, ' +
        'digoxin level 2.8 ng/mL.',
      question: 'Complete the bow-tie for this patient\'s priority management.',
      type: 'bow_tie',
      nclex_category: 'Pharmacological and Parenteral Therapies',
      difficulty_level: 4,
      scoring_rule: 'rationale',
      max_points: 7,
      content: {
        left_label: 'Actions to take',
        center_label: 'Priority condition',
        right_label: 'Parameters to monitor',
        left_opts: [
          'Withhold next dose of digoxin',
          'Increase digoxin to 0.5 mg',
          'Replace potassium per protocol',
          'Administer atropine 1 mg IV',
          'Notify provider',
        ],
        left_correct: [0, 2, 4],
        center_opts: [
          'Worsening heart failure',
          'Digoxin toxicity',
          'Septic shock',
          'Hypovolemic shock',
        ],
        center_correct: 1,
        right_opts: [
          'Apical heart rate',
          'Serum potassium',
          'Serum digoxin level',
          'Blood glucose',
          'Urine output',
        ],
        right_correct: [0, 1, 2],
      },
      rationale:
        'Digoxin toxicity is precipitated by hypokalemia. Therapeutic range is 0.8–2.0 ng/mL; ' +
        'this level is toxic. Hold the drug, replace K+, and monitor heart rate, K+, and digoxin levels.',
      source: 'Saunders 8th ed.',
    },
  },

  // 2. Extended MR — select N
  {
    label: 'Extended MR · select 3 · Safety · L3',
    card: {
      id: 'preview-mrn',
      title: 'Fall prevention priorities',
      scenario:
        'An 82-year-old admitted overnight after a syncopal episode is rated Morse Fall Scale 65 ' +
        '(high risk). The room is on a busy med-surg unit.',
      question: 'Select the THREE priority interventions for this patient.',
      type: 'extended_mr_n',
      nclex_category: 'Safety and Infection Control',
      difficulty_level: 3,
      scoring_rule: '0/1',
      max_points: 3,
      content: {
        opts: [
          'Apply a bed alarm',
          'Apply soft wrist restraints routinely',
          'Keep the call light within reach',
          'Lower the bed to its lowest position',
          'Restrict the patient to bed rest',
          'Elevate the head of the bed to 90°',
        ],
        correct_indices: [0, 2, 3],
        select_n: 3,
      },
      rationale:
        'Bed alarms, accessible call lights, and a low bed reduce fall risk without restricting ' +
        'mobility. Routine restraints and bed-rest enforce immobility — both increase fall and ' +
        'deconditioning risk. Head-of-bed at 90° is unrelated to fall prevention.',
      source: 'Saunders 8th ed.',
    },
  },

  // 3. Extended MR — select all
  {
    label: 'Extended MR · select all · Physiological Adaptation · L4',
    card: {
      id: 'preview-mrall',
      title: 'Signs of impending shock',
      scenario:
        'A 56-year-old post-op day 1 from bowel resection. The nurse is reviewing trends on rounds.',
      question: 'Select ALL findings that indicate impending shock.',
      type: 'extended_mr_all',
      nclex_category: 'Physiological Adaptation',
      difficulty_level: 4,
      scoring_rule: '+/-',
      max_points: 4,
      content: {
        opts: [
          'Blood pressure 88/52 mmHg',
          'Heart rate 132 bpm',
          'Capillary refill 4 seconds',
          'Blood pressure 134/82 mmHg',
          'Skin warm and pink',
          'Serum lactate 4.5 mmol/L',
        ],
        correct_indices: [0, 1, 2, 5],
      },
      rationale:
        'Hypotension, tachycardia, prolonged capillary refill, and elevated lactate are hallmark ' +
        'signs of decompensated shock. Normotension and warm/pink skin reflect adequate perfusion.',
      source: 'Saunders 8th ed.',
    },
  },

  // 4. Matrix
  {
    label: 'Matrix · Management of Care · L4',
    card: {
      id: 'preview-matrix',
      title: 'UAP delegation matrix',
      scenario:
        'A registered nurse is assigning tasks at the start of a med-surg shift. Determine which ' +
        'tasks may be delegated to unlicensed assistive personnel (UAP).',
      question: 'For each task, choose whether delegation to UAP is appropriate or inappropriate.',
      type: 'matrix',
      nclex_category: 'Management of Care',
      difficulty_level: 4,
      scoring_rule: '0/1',
      max_points: 6,
      content: {
        columns: ['Appropriate', 'Inappropriate'],
        rows: [
          { label: 'Assisting a stable patient to the bedside commode', correct_col: 0 },
          { label: 'Performing the initial assessment on a new admission', correct_col: 1 },
          { label: 'Taking vital signs on a stable post-op patient', correct_col: 0 },
          { label: 'Administering IV morphine for breakthrough pain', correct_col: 1 },
          { label: 'Bathing a patient on contact precautions', correct_col: 0 },
          { label: 'Teaching diabetic foot care to a new diabetic', correct_col: 1 },
        ],
      },
      rationale:
        'UAPs may perform stable, routine, predictable tasks that fall within their training. ' +
        'Initial assessment, IV medications, and patient teaching all require licensed-nurse ' +
        'judgment and cannot be delegated.',
      source: 'Saunders 8th ed.',
    },
  },

  // 5. Cloze — DKA
  {
    label: 'Cloze · Physiological Adaptation · L4',
    card: {
      id: 'preview-cloze',
      title: 'DKA fluid + insulin protocol',
      scenario:
        'A patient presents to the ED with diabetic ketoacidosis: blood glucose 612 mg/dL, ' +
        'pH 7.18, HCO3- 12 mEq/L, anion gap 22.',
      question: 'Complete the order set for this patient\'s initial treatment.',
      type: 'cloze',
      nclex_category: 'Physiological Adaptation',
      difficulty_level: 4,
      scoring_rule: '0/1',
      max_points: 3,
      content: {
        template:
          'Begin fluid resuscitation with {0} and start {1} per protocol. ' +
          'Once the blood glucose reaches 250 mg/dL, change the IV fluid to {2} ' +
          'and continue insulin until the anion gap closes.',
        dropdowns: [
          {
            opts: ['0.9% normal saline', 'D5W', 'Lactated Ringer\'s', '0.45% saline'],
            correct: 0,
          },
          {
            opts: [
              'continuous IV regular insulin',
              'subcutaneous lispro',
              'oral metformin',
              'IV NPH insulin',
            ],
            correct: 0,
          },
          {
            opts: [
              'D5 0.45% saline',
              'plain D5W',
              '0.9% normal saline',
              '3% hypertonic saline',
            ],
            correct: 0,
          },
        ],
      },
      rationale:
        '0.9% NS is the standard initial volume expander in DKA. Continuous IV regular insulin is ' +
        'the only insulin appropriate for DKA. Once glucose reaches 250 mg/dL, dextrose-containing ' +
        'fluids prevent hypoglycemia while insulin continues to close the anion gap.',
      source: 'Saunders 8th ed.',
    },
  },

  // 6. Drag-drop — triage
  {
    label: 'Drag-drop · Management of Care · L3',
    card: {
      id: 'preview-dragdrop',
      title: 'Mass-casualty triage',
      scenario:
        'A nurse is triaging four patients at the scene of a multi-vehicle collision. Use START triage ' +
        'principles to assign each patient to the correct triage category.',
      question: 'Drag each patient to the matching triage tag.',
      type: 'drag_drop',
      nclex_category: 'Management of Care',
      difficulty_level: 3,
      scoring_rule: '0/1',
      max_points: 4,
      content: {
        items: [
          'Patient receiving active CPR',
          'Open femur fracture, alert and oriented, RR 22',
          'Multiple abrasions, ambulatory, complaining of headache',
          'Apneic with no pulse after airway repositioning',
        ],
        zones: ['Red — Immediate', 'Yellow — Delayed', 'Green — Minor', 'Black — Expectant'],
        correct_mapping: {
          '0': 'Black — Expectant',
          '1': 'Red — Immediate',
          '2': 'Green — Minor',
          '3': 'Black — Expectant',
        },
      },
      rationale:
        'In mass-casualty START triage, resources go to the salvageable. Active CPR and apnea after ' +
        'airway repositioning are both BLACK in the field. The open femur is RED (life-threatening, ' +
        'salvageable). Ambulatory minor injuries are GREEN.',
      source: 'Saunders 8th ed.',
    },
  },

  // 7. Case-study wrapped Extended MR (NCSBN tabbed layout)
  {
    label: 'Case study · Extended MR (select all) · Physiological Adaptation · L4',
    card: {
      id: 'preview-case-study',
      title: 'Acute ischemic stroke — tPA exclusions',
      scenario:
        'Use the case file on the left to identify findings that exclude tPA.',
      question:
        'The nurse receives an order to prepare for the administration of tPA ' +
        '(tissue plasminogen activator). Which of the following findings would exclude ' +
        'this patient from receiving this medication? Select all that apply.',
      type: 'extended_mr_all',
      nclex_category: 'Physiological Adaptation',
      difficulty_level: 4,
      scoring_rule: '+/-',
      max_points: 3,
      content: {
        opts: [
          'Diagnosis of ischemic stroke',
          'Blood pressure 210/116 mmHg',
          'Onset of symptoms 8 hours ago',
          'Negative CT scan of the head from hemorrhage',
          'Blood glucose level 120 mg/dL',
          'Warfarin usage with INR 2.0',
        ],
        correct_indices: [1, 2, 5],
      },
      rationale:
        'tPA is excluded for: BP > 185/110 (severe HTN bleed risk), symptom onset > 4.5 ' +
        'hours from last-known-well (efficacy window), and active anticoagulation with ' +
        'INR > 1.7. Ischemic stroke is the indication, not an exclusion. A negative ' +
        'hemorrhage CT is required, and BG 120 is normal.',
      source: 'Saunders 8th ed.',
      case_study_tabs: [
        {
          label: 'Health History',
          body:
            '60-year-old male. PMHx: hypertension (30 years), hyperlipidemia, type 2 ' +
            'diabetes. No head trauma or recent surgery. BMI 32. Non-smoker, occasional ' +
            'alcohol. Allergies: NKDA. Home meds: lisinopril 20 mg daily, atorvastatin ' +
            '40 mg daily, metformin 1000 mg BID, warfarin 5 mg daily (for atrial ' +
            'fibrillation).',
        },
        {
          label: "Nurses' Notes",
          body:
            "0945 — Patient and spouse walking dog around neighborhood. Spouse states " +
            "patient suddenly began to report a headache and dizziness along with " +
            "slurred speech. Right-sided hemiplegia and confusion noted.\n" +
            "1045 — Patient arrived to ED via EMS. Alert and presents with right-sided " +
            "facial drooping, dysarthria, mild aphasia, no vision changes, and right-sided " +
            "hemiplegia. NIHSS score 16.",
        },
        {
          label: 'Vital Signs',
          body:
            'On arrival (1045):\n' +
            'BP 210/116 mmHg\n' +
            'HR 92 bpm, regular\n' +
            'RR 18\n' +
            'SpO2 96% on room air\n' +
            'Temp 98.4°F (36.9°C)\n' +
            'Pain 4/10 (headache)',
        },
        {
          label: 'Laboratory Results',
          body:
            'CBC: WBC 8.2, Hgb 14.6, Plt 245\n' +
            'BMP: Na 138, K 4.1, BUN 18, Cr 1.0\n' +
            'Coagulation: PT 22 sec, INR 2.0, aPTT 38 sec\n' +
            'Glucose 120 mg/dL\n' +
            'CT head (non-contrast): negative for acute hemorrhage',
        },
      ],
    },
  },

  // 8. Trend — sepsis trends
  {
    label: 'Trend · Physiological Adaptation · L4',
    card: {
      id: 'preview-trend',
      title: 'Sepsis trend recognition',
      scenario:
        'A 65-year-old post-op patient is being monitored on a med-surg unit. The chart below shows ' +
        'their vital signs and labs over four hours.',
      question: 'For each finding, indicate whether the trend is improving or worsening.',
      type: 'trend',
      nclex_category: 'Physiological Adaptation',
      difficulty_level: 4,
      scoring_rule: '0/1',
      max_points: 4,
      content: {
        exhibit: {
          headers: ['Time', 'Temp (F)', 'HR', 'BP', 'Lactate'],
          rows: [
            ['08:00', '100.4', '92',  '118/72', '1.8'],
            ['10:00', '101.6', '108', '104/64', '2.4'],
            ['12:00', '102.8', '120', '92/56',  '3.2'],
          ],
        },
        question_type: 'matrix',
        columns: ['Improving', 'Worsening'],
        rows: [
          { label: 'Temperature',    correct_col: 1 },
          { label: 'Heart rate',     correct_col: 1 },
          { label: 'Blood pressure', correct_col: 1 },
          { label: 'Lactate',        correct_col: 1 },
        ],
      },
      rationale:
        'All four parameters move in the wrong direction: rising temp, rising heart rate, falling ' +
        'BP, and rising lactate are the classic septic-shock decompensation pattern.',
      source: 'Saunders 8th ed.',
    },
  },
]

export function NGNPreviewScreen() {
  return (
    <div
      data-testid="ngn-preview-screen"
      style={{
        minHeight: '100dvh',
        padding: '24px 16px 80px',
        color: '#fff',
        fontFamily: "'Outfit', 'Inter', sans-serif",
        maxWidth: 720,
        margin: '0 auto',
      }}
    >
      <div style={{
        marginBottom: 16,
        padding: '10px 14px',
        background: 'rgba(245,197,24,0.06)',
        border: '1px dashed rgba(245,197,24,0.4)',
        borderRadius: 12,
        fontSize: 12,
        color: GOLD,
      }}>
        Temporary preview · all 7 NGN question-type players · mode = study.
        Submit each card to see the rationale block reveal.
      </div>

      {SAMPLES.map(({ label, card }, i) => (
        <section
          key={card.id}
          data-testid={`ngn-preview-section-${i}`}
          style={{
            marginBottom: 32,
            paddingTop: 16,
            borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            color: 'rgba(255,255,255,0.5)',
            fontWeight: 800,
            marginBottom: 4,
          }}>
            {i + 1}. {label}
          </div>
          <NGNCardScreen card={card} mode="study" onAnswer={() => {}} />
        </section>
      ))}
    </div>
  )
}
