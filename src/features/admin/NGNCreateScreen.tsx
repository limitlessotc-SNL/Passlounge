// src/features/admin/NGNCreateScreen.tsx
//
// Admin authoring screen for a single NGN card. Two columns on wide
// screens: left panel drives AI generation (type / category / difficulty
// / hint), right panel hosts the card metadata fields and the
// type-specific authoring form. Forms own their content state and emit
// changes via onChange; the screen owns everything else (title,
// scenario, question, rationale, etc.).
//
// Save composes the merged card and posts to insertNGNCard, then audit-
// logs and returns to the dashboard.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  fetchNGNCardTitlesAndScenarios,
  insertNGNCard,
} from '@/features/ngn/ngn.service';
import type {
  BowTieContent,
  ClozeContent,
  DragDropContent,
  ExtendedMRAllContent,
  ExtendedMRNContent,
  MatrixContent,
  NGNCard,
  NGNContent,
  NGNQuestionType,
  NGNScoringRule,
  TrendContent,
} from '@/features/ngn/ngn.types';
import { useAuthStore } from '@/store/authStore';

import { logAdminAction } from './admin.service';
import { BowTieForm } from './forms/BowTieForm';
import { ClozeForm } from './forms/ClozeForm';
import { DragDropForm } from './forms/DragDropForm';
import { ExtendedMRForm } from './forms/ExtendedMRForm';
import { MatrixForm } from './forms/MatrixForm';
import { MCQForm } from './forms/MCQForm';
import { TrendForm } from './forms/TrendForm';
import {
  GOLD,
  fieldLabelStyle,
  inputStyle,
  numberInputStyle,
  sectionTitleStyle,
  textareaStyle,
} from './forms/_shared';
import {
  generateSingleCard,
  type GeneratedCard,
} from './ngn.generator';

const NCLEX_CATEGORIES = [
  'Management of Care',
  'Safety and Infection Control',
  'Health Promotion and Maintenance',
  'Psychosocial Integrity',
  'Basic Care and Comfort',
  'Pharmacological and Parenteral Therapies',
  'Reduction of Risk Potential',
  'Physiological Adaptation',
];

const TYPE_OPTIONS: Array<{ value: NGNQuestionType; label: string }> = [
  { value: 'mcq',             label: 'MCQ (single answer)' },
  { value: 'extended_mr_n',   label: 'Extended MR · select N' },
  { value: 'extended_mr_all', label: 'Extended MR · select all' },
  { value: 'bow_tie',         label: 'Bow-tie' },
  { value: 'matrix',          label: 'Matrix' },
  { value: 'cloze',           label: 'Cloze' },
  { value: 'drag_drop',       label: 'Drag-drop' },
  { value: 'trend',           label: 'Trend' },
];

// ─── Scoring rule + max-points derivation ────────────────────────────

function deriveScoringRule(type: NGNQuestionType): NGNScoringRule {
  if (type === 'extended_mr_all') return '+/-';
  if (type === 'bow_tie') return 'rationale';
  return '0/1';
}

function deriveMaxPoints(type: NGNQuestionType, content: NGNContent): number {
  switch (type) {
    case 'mcq':
      return 1;
    case 'extended_mr_n':
      return Math.max(1, (content as ExtendedMRNContent).select_n);
    case 'extended_mr_all':
      return Math.max(1, (content as ExtendedMRAllContent).correct_indices.length);
    case 'bow_tie': {
      const c = content as BowTieContent;
      return c.left_correct.length + 1 + c.right_correct.length || 1;
    }
    case 'matrix':
      return (content as MatrixContent).rows.length || 1;
    case 'cloze':
      return (content as ClozeContent).dropdowns.length || 1;
    case 'drag_drop':
      return (content as DragDropContent).items.length || 1;
    case 'trend':
      return (content as TrendContent).rows.length || 1;
    default:
      return 1;
  }
}

// ─── Screen ───────────────────────────────────────────────────────────

export function NGNCreateScreen() {
  const navigate = useNavigate();

  // Generation controls
  const [type, setType]             = useState<NGNQuestionType>('mcq');
  const [category, setCategory]     = useState(NCLEX_CATEGORIES[0]);
  const [difficulty, setDifficulty] = useState(3);
  const [hint, setHint]             = useState('');

  // Card metadata
  const [title, setTitle]         = useState('');
  const [scenario, setScenario]   = useState('');
  const [question, setQuestion]   = useState('');
  const [rationale, setRationale] = useState('');
  const [source, setSource]       = useState('');

  // Content (managed by the active form)
  const [content, setContent] = useState<NGNContent | null>(null);
  // ExtendedMR's variant escapes via onChange — track it so save can use the right type.
  const [activeType, setActiveType] = useState<NGNQuestionType>(type);

  // Workflow state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving]         = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [genResult, setGenResult]       = useState<GeneratedCard | null>(null);

  // Form seeding — the form remounts on `formKey` change, picking up new initialData.
  const [formSeed, setFormSeed] = useState<NGNCard | undefined>(undefined);
  const [formKey, setFormKey]   = useState(0);

  // Existing card titles+scenarios for AI dup-check.
  const [existing, setExisting] = useState<Array<{ title: string; scenario: string }>>([]);
  useEffect(() => {
    void fetchNGNCardTitlesAndScenarios().then(rows =>
      setExisting(rows.map(r => ({ title: r.title, scenario: r.scenario }))),
    );
  }, []);

  // When the type selector changes, sync activeType (ExtendedMR variant follows generation).
  useEffect(() => { setActiveType(type); }, [type]);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateSingleCard(
        type, category, difficulty, existing, hint || undefined,
      );
      setGenResult(result);
      setTitle(result.title);
      setScenario(result.scenario);
      setQuestion(result.question);
      setRationale(result.rationale);
      setSource(result.source);
      setActiveType(result.type);
      setFormSeed({ id: 'new', ...result } as NGNCard);
      setFormKey(k => k + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSave() {
    if (!content) {
      setError('Form content is empty.');
      return;
    }
    if (!title.trim() || !question.trim()) {
      setError('Title and question are required.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const studentId = useAuthStore.getState().supaStudentId;
      const card = await insertNGNCard({
        title:            title.trim(),
        scenario,
        question:         question.trim(),
        type:             activeType,
        nclex_category:   category,
        difficulty_level: difficulty,
        scoring_rule:     deriveScoringRule(activeType),
        max_points:       deriveMaxPoints(activeType, content),
        content,
        rationale,
        source,
        created_by:       studentId ?? undefined,
      });
      await logAdminAction('admin.ngn_create', { card_id: card.id, type: activeType });
      navigate('/admin');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleExtendedMRChange(c: ExtendedMRNContent | ExtendedMRAllContent, variant: NGNQuestionType) {
    setContent(c);
    setActiveType(variant);
  }

  const formNode = useMemo(() => {
    switch (type) {
      case 'mcq':
        return <MCQForm key={formKey} initialData={formSeed} onChange={setContent} />;
      case 'extended_mr_n':
      case 'extended_mr_all':
        return <ExtendedMRForm key={formKey} initialData={formSeed} onChange={handleExtendedMRChange} />;
      case 'bow_tie':
        return <BowTieForm key={formKey} initialData={formSeed} onChange={setContent} />;
      case 'matrix':
        return <MatrixForm key={formKey} initialData={formSeed} onChange={setContent} />;
      case 'cloze':
        return <ClozeForm key={formKey} initialData={formSeed} onChange={setContent} />;
      case 'drag_drop':
        return <DragDropForm key={formKey} initialData={formSeed} onChange={setContent} />;
      case 'trend':
        return <TrendForm key={formKey} initialData={formSeed} onChange={setContent} />;
      default:
        return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, formKey, formSeed]);

  return (
    <div
      data-testid="ngn-create-screen"
      style={{
        minHeight: '100dvh',
        padding: '32px 32px 80px',
        color: '#fff',
        fontFamily: "'Outfit', 'Inter', sans-serif",
        maxWidth: 1400,
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div>
          <div style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: 2,
            color: 'rgba(255,255,255,0.45)',
            fontWeight: 700,
          }}>
            NGN library · author
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '4px 0 0' }}>
            Create one card
          </h1>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin')}
          style={{
            padding: '8px 14px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          ← Back to dashboard
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(280px, 380px) 1fr',
        gap: 24,
        alignItems: 'flex-start',
      }}>
        {/* ─── Left panel · generation ─── */}
        <aside
          data-testid="generation-panel"
          style={{
            position: 'sticky',
            top: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: 16,
          }}
        >
          <div style={sectionTitleStyle}>AI generation</div>

          <Field label="Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as NGNQuestionType)}
              aria-label="Question type"
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>

          <Field label="NCLEX category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="NCLEX category"
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {NCLEX_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>

          <Field label="Difficulty (1–5)">
            <input
              type="number"
              min={1}
              max={5}
              value={difficulty}
              onChange={(e) =>
                setDifficulty(Math.max(1, Math.min(5, Number(e.target.value))))
              }
              aria-label="Difficulty"
              style={numberInputStyle}
            />
          </Field>

          <Field label="Hint (optional)">
            <textarea
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="e.g. focus on sepsis bundle priorities"
              aria-label="Generation hint"
              style={textareaStyle}
            />
          </Field>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: isGenerating ? 'rgba(245,197,24,0.4)' : GOLD,
              color: '#053571',
              border: 'none',
              fontSize: 14,
              fontWeight: 800,
              fontFamily: "'Outfit', sans-serif",
              cursor: isGenerating ? 'wait' : 'pointer',
            }}
          >
            {isGenerating ? 'Generating…' : 'Generate with AI →'}
          </button>

          {genResult?.isDuplicate && (
            <div
              data-testid="duplicate-warning"
              style={{
                padding: 10,
                borderRadius: 10,
                background: 'rgba(248,113,113,0.10)',
                border: '1px solid rgba(248,113,113,0.4)',
                fontSize: 12,
                color: 'rgba(248,113,113,0.95)',
                lineHeight: 1.5,
              }}
            >
              <strong>Possible duplicate</strong> ({Math.round(genResult.similarity * 100)}% similar
              {genResult.similarToTitle ? ` to “${genResult.similarToTitle}”` : ''}). Review before saving.
            </div>
          )}

          {error && (
            <div
              data-testid="error-msg"
              style={{
                padding: 10,
                borderRadius: 10,
                background: 'rgba(248,113,113,0.10)',
                border: '1px solid rgba(248,113,113,0.4)',
                fontSize: 12,
                color: 'rgba(248,113,113,0.95)',
              }}
            >
              {error}
            </div>
          )}
        </aside>

        {/* ─── Right panel · form ─── */}
        <main
          data-testid="form-panel"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: 16,
          }}
        >
          <div style={sectionTitleStyle}>Card details</div>

          <Field label="Title">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Card title"
              placeholder="e.g. Sepsis matrix L4"
              style={inputStyle}
            />
          </Field>

          <Field label="Scenario">
            <textarea
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              aria-label="Card scenario"
              placeholder="Brief clinical scenario shown above the question…"
              style={{ ...textareaStyle, minHeight: 90 }}
            />
          </Field>

          <Field label="Question">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              aria-label="Card question"
              placeholder="The exact question prompt the student answers."
              style={textareaStyle}
            />
          </Field>

          <Field label="Rationale">
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              aria-label="Card rationale"
              placeholder="Explanation revealed in study mode after answering."
              style={{ ...textareaStyle, minHeight: 90 }}
            />
          </Field>

          <Field label="Source">
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              aria-label="Card source"
              placeholder="e.g. Saunders 8th ed."
              style={inputStyle}
            />
          </Field>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '6px 0' }} />

          {formNode}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !content}
            data-testid="save-btn"
            style={{
              marginTop: 6,
              padding: '12px 14px',
              borderRadius: 12,
              background: isSaving || !content ? 'rgba(74,222,128,0.4)' : 'rgba(74,222,128,0.9)',
              color: '#053571',
              border: 'none',
              fontSize: 14,
              fontWeight: 800,
              fontFamily: "'Outfit', sans-serif",
              cursor: isSaving || !content ? 'wait' : 'pointer',
            }}
          >
            {isSaving ? 'Saving…' : 'Save card'}
          </button>
        </main>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={fieldLabelStyle}>{label}</span>
      {children}
    </label>
  );
}
