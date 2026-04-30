// src/features/admin/NGNBatchScreen.tsx
//
// Batch authoring screen — generates up to 20 cards sequentially, streaming
// each one into the list as it lands so the admin can review/approve/discard
// in real time. Saves only the cards explicitly approved by the admin.
//
// Cards are generated one-at-a-time (not via generator.generateBatchCards)
// so we can update React state between calls and so a single failure pauses
// the run rather than tossing the whole batch.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  fetchNGNCardTitlesAndScenarios,
  insertNGNCard,
} from '@/features/ngn/ngn.service';
import type { NGNQuestionType } from '@/features/ngn/ngn.types';
import { useAuthStore } from '@/store/authStore';

import { logAdminAction } from './admin.service';
import {
  fieldLabelStyle,
  GOLD,
  inputStyle,
  numberInputStyle,
  sectionTitleStyle,
  textareaStyle,
} from './forms/_shared';
import {
  ALL_CATEGORIES,
  ALL_DIFFICULTIES,
  ALL_TYPES,
  generateSingleCard,
  pickFromOption,
  type GeneratedCard,
} from './ngn.generator';

const TYPE_LABEL: Record<NGNQuestionType, string> = {
  mcq:               'MCQ',
  extended_mr_n:     'MR · select N',
  extended_mr_all:   'MR · select all',
  bow_tie:           'Bow-tie',
  matrix:            'Matrix',
  cloze:             'Cloze',
  drag_drop:         'Drag-drop',
  trend:             'Trend',
};

type CardStatus = 'pending' | 'approved' | 'discarded';

interface BatchItem {
  id: string;
  card: GeneratedCard;
  status: CardStatus;
  editing: boolean;
}

const newItemId = () =>
  // crypto.randomUUID is reliably present in Vite's runtime; fallback for
  // older jsdom versions used in CI.
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `item-${Math.random().toString(36).slice(2)}-${Date.now()}`;

export function NGNBatchScreen() {
  const navigate = useNavigate();

  // Config
  const [typeOption,        setTypeOption]        = useState<NGNQuestionType[] | 'mixed'>('mixed');
  const [categoryOption,    setCategoryOption]    = useState<string[]          | 'mixed'>('mixed');
  const [difficultyOption,  setDifficultyOption]  = useState<number[]          | 'mixed'>('mixed');
  const [count, setCount]                         = useState(5);
  const [hint, setHint]                           = useState('');

  // Workflow
  const [items, setItems]                 = useState<BatchItem[]>([]);
  const [isGenerating, setIsGenerating]   = useState(false);
  const [progress, setProgress]           = useState({ done: 0, total: 0 });
  const [isSaving, setIsSaving]           = useState(false);
  const [saveProgress, setSaveProgress]   = useState({ done: 0, total: 0 });
  const [error, setError]                 = useState<string | null>(null);

  // Existing card titles+scenarios for AI dup-check.
  const [existing, setExisting] = useState<Array<{ title: string; scenario: string }>>([]);
  useEffect(() => {
    void fetchNGNCardTitlesAndScenarios().then(rows =>
      setExisting(rows.map(r => ({ title: r.title, scenario: r.scenario }))),
    );
  }, []);

  // ─── Generation loop ───
  async function handleGenerate() {
    const total = Math.min(20, Math.max(1, count));
    setItems([]);
    setProgress({ done: 0, total });
    setIsGenerating(true);
    setError(null);

    const knownCards = [...existing];
    const collected: BatchItem[] = [];

    for (let i = 0; i < total; i++) {
      const t    = pickFromOption(typeOption,       ALL_TYPES,        i);
      const cat  = pickFromOption(categoryOption,   ALL_CATEGORIES,   i);
      const diff = pickFromOption(difficultyOption, ALL_DIFFICULTIES, i);

      try {
        const card = await generateSingleCard(t, cat, diff, [...knownCards], hint || undefined);
        const item: BatchItem = {
          id: newItemId(), card, status: 'pending', editing: false,
        };
        collected.push(item);
        knownCards.push({ title: card.title, scenario: card.scenario });
        setItems([...collected]);
        setProgress({ done: i + 1, total });
      } catch (e) {
        setError(`Stopped at card ${i + 1}: ${(e as Error).message}`);
        break;
      }
    }

    setIsGenerating(false);
  }

  // ─── Item mutators ───
  function setStatus(id: string, status: CardStatus) {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, status } : it)));
  }
  function toggleEdit(id: string) {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, editing: !it.editing } : it)));
  }
  function patchCard(id: string, patch: Partial<GeneratedCard>) {
    setItems(prev =>
      prev.map(it =>
        it.id === id ? { ...it, card: { ...it.card, ...patch } } : it,
      ),
    );
  }

  // ─── Save approved ───
  async function handleSaveAll() {
    const approved = items.filter(it => it.status === 'approved');
    if (approved.length === 0) {
      setError('No approved cards to save.');
      return;
    }
    setIsSaving(true);
    setError(null);
    setSaveProgress({ done: 0, total: approved.length });

    const studentId = useAuthStore.getState().supaStudentId;
    let saved = 0;
    const failures: string[] = [];

    for (const item of approved) {
      const c = item.card;
      try {
        const inserted = await insertNGNCard({
          title:            c.title,
          scenario:         c.scenario,
          question:         c.question,
          type:             c.type,
          nclex_category:   c.nclex_category,
          difficulty_level: c.difficulty_level,
          scoring_rule:     c.scoring_rule,
          max_points:       c.max_points,
          content:          c.content,
          rationale:        c.rationale,
          source:           c.source,
          created_by:       studentId ?? undefined,
        });
        await logAdminAction('admin.ngn_create', {
          card_id: inserted.id, type: c.type, batch: true,
        });
        saved++;
      } catch (e) {
        failures.push(`${c.title}: ${(e as Error).message}`);
      }
      setSaveProgress({ done: saved + failures.length, total: approved.length });
    }

    setIsSaving(false);

    if (failures.length === 0) {
      navigate('/admin');
      return;
    }
    setError(`${saved} saved, ${failures.length} failed: ${failures.join('; ')}`);
  }

  const approvedCount = items.filter(it => it.status === 'approved').length;
  const pendingCount  = items.filter(it => it.status === 'pending').length;

  return (
    <div
      data-testid="ngn-batch-screen"
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
            Batch generate
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
        {/* ─── Config panel ─── */}
        <aside
          data-testid="batch-config"
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
          <div style={sectionTitleStyle}>Batch config</div>

          <Field label="Types">
            <select
              value={typeOption === 'mixed' ? 'mixed' : (typeOption[0] ?? 'mixed')}
              onChange={(e) =>
                setTypeOption(e.target.value === 'mixed'
                  ? 'mixed'
                  : [e.target.value as NGNQuestionType])}
              aria-label="Batch types"
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="mixed">Mixed (rotate all 7)</option>
              {ALL_TYPES.map(t => (
                <option key={t} value={t}>{TYPE_LABEL[t]}</option>
              ))}
            </select>
          </Field>

          <Field label="Categories">
            <select
              value={categoryOption === 'mixed' ? 'mixed' : (categoryOption[0] ?? 'mixed')}
              onChange={(e) =>
                setCategoryOption(e.target.value === 'mixed' ? 'mixed' : [e.target.value])}
              aria-label="Batch categories"
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="mixed">Mixed (rotate all)</option>
              {ALL_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>

          <Field label="Difficulty">
            <select
              value={difficultyOption === 'mixed' ? 'mixed' : String(difficultyOption[0] ?? 'mixed')}
              onChange={(e) =>
                setDifficultyOption(e.target.value === 'mixed' ? 'mixed' : [Number(e.target.value)])}
              aria-label="Batch difficulty"
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="mixed">Mixed (1–5)</option>
              {ALL_DIFFICULTIES.map(d => (
                <option key={d} value={d}>Level {d}</option>
              ))}
            </select>
          </Field>

          <Field label="Count (1–20)">
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) =>
                setCount(Math.max(1, Math.min(20, Number(e.target.value))))}
              aria-label="Batch count"
              style={numberInputStyle}
            />
          </Field>

          <Field label="Hint (optional)">
            <textarea
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="e.g. focus on prioritization questions"
              aria-label="Batch hint"
              style={textareaStyle}
            />
          </Field>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || isSaving}
            data-testid="batch-generate-btn"
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
            {isGenerating
              ? `Generating ${progress.done}/${progress.total}…`
              : 'Generate batch →'}
          </button>

          {/* Generation progress */}
          {(isGenerating || progress.total > 0) && (
            <ProgressBar
              done={progress.done}
              total={progress.total}
              testId="generation-progress"
              color={GOLD}
            />
          )}

          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'rgba(255,255,255,0.55)' }}>
              {approvedCount} approved · {pendingCount} pending
            </span>
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>
              {items.length} total
            </span>
          </div>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving || isGenerating || approvedCount === 0}
            data-testid="save-all-btn"
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: approvedCount === 0
                ? 'rgba(255,255,255,0.06)'
                : isSaving ? 'rgba(74,222,128,0.4)' : 'rgba(74,222,128,0.9)',
              color: approvedCount === 0 ? 'rgba(255,255,255,0.3)' : '#053571',
              border: 'none',
              fontSize: 14,
              fontWeight: 800,
              fontFamily: "'Outfit', sans-serif",
              cursor: isSaving || approvedCount === 0 ? 'default' : 'pointer',
            }}
          >
            {isSaving
              ? `Saving ${saveProgress.done}/${saveProgress.total}…`
              : `Save all approved (${approvedCount})`}
          </button>

          {isSaving && (
            <ProgressBar
              done={saveProgress.done}
              total={saveProgress.total}
              testId="save-progress"
              color="rgba(74,222,128,0.9)"
            />
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
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}
        </aside>

        {/* ─── Cards list ─── */}
        <main
          data-testid="batch-list"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            minHeight: 200,
          }}
        >
          {items.length === 0 && !isGenerating && (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(255,255,255,0.15)',
              borderRadius: 14,
              padding: 24,
              color: 'rgba(255,255,255,0.45)',
              fontSize: 13,
              textAlign: 'center',
            }}>
              Configure the batch on the left, then hit Generate batch.
            </div>
          )}

          {items.map(item => (
            <BatchRow
              key={item.id}
              item={item}
              onApprove={() => setStatus(item.id, 'approved')}
              onDiscard={() => setStatus(item.id, 'discarded')}
              onEdit={() => toggleEdit(item.id)}
              onPatch={(patch) => patchCard(item.id, patch)}
            />
          ))}
        </main>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={fieldLabelStyle}>{label}</span>
      {children}
    </label>
  );
}

function ProgressBar({
  done, total, color, testId,
}: { done: number; total: number; color: string; testId?: string }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div
      data-testid={testId}
      role="progressbar"
      aria-valuenow={done}
      aria-valuemin={0}
      aria-valuemax={total}
      style={{
        height: 6,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          transition: 'width 200ms ease',
        }}
      />
    </div>
  );
}

interface RowProps {
  item: BatchItem;
  onApprove: () => void;
  onDiscard: () => void;
  onEdit: () => void;
  onPatch: (patch: Partial<GeneratedCard>) => void;
}

function BatchRow({ item, onApprove, onDiscard, onEdit, onPatch }: RowProps) {
  const { card, status, editing } = item;
  const dim = status === 'discarded' ? 0.35 : 1;
  const borderColor =
    status === 'approved'  ? 'rgba(74,222,128,0.6)' :
    status === 'discarded' ? 'rgba(248,113,113,0.4)' :
    'rgba(255,255,255,0.08)';

  return (
    <div
      data-testid={`batch-row-${status}`}
      style={{
        opacity: dim,
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${borderColor}`,
        borderRadius: 14,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 1,
          color: 'rgba(255,255,255,0.5)',
          fontWeight: 700,
        }}>
          {TYPE_LABEL[card.type] ?? card.type} · L{card.difficulty_level} · {card.nclex_category}
        </span>
        {card.isDuplicate && (
          <span
            data-testid="dup-badge"
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(248,113,113,0.95)',
              background: 'rgba(248,113,113,0.10)',
              padding: '2px 6px',
              borderRadius: 6,
              border: '1px solid rgba(248,113,113,0.4)',
            }}
          >
            DUP {Math.round(card.similarity * 100)}%
          </span>
        )}
        <span style={{ flex: 1 }} />
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          color:
            status === 'approved'  ? 'rgba(74,222,128,0.9)' :
            status === 'discarded' ? 'rgba(248,113,113,0.9)' :
            'rgba(255,255,255,0.4)',
        }}>
          {status.toUpperCase()}
        </span>
      </div>

      <div style={{ fontSize: 15, fontWeight: 700 }}>{card.title}</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
        {card.scenario}
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
        {card.question}
      </div>

      {editing && (
        <div
          data-testid="row-edit-panel"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <input
            type="text"
            value={card.title}
            onChange={(e) => onPatch({ title: e.target.value })}
            placeholder="Title"
            aria-label={`Edit title for ${card.title}`}
            style={inputStyle}
          />
          <textarea
            value={card.scenario}
            onChange={(e) => onPatch({ scenario: e.target.value })}
            placeholder="Scenario"
            aria-label={`Edit scenario for ${card.title}`}
            style={textareaStyle}
          />
          <textarea
            value={card.question}
            onChange={(e) => onPatch({ question: e.target.value })}
            placeholder="Question"
            aria-label={`Edit question for ${card.title}`}
            style={textareaStyle}
          />
          <textarea
            value={card.rationale}
            onChange={(e) => onPatch({ rationale: e.target.value })}
            placeholder="Rationale"
            aria-label={`Edit rationale for ${card.title}`}
            style={textareaStyle}
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onApprove}
          disabled={status === 'approved'}
          data-testid="approve-btn"
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            background: status === 'approved' ? 'rgba(74,222,128,0.3)' : 'rgba(74,222,128,0.12)',
            border: '1px solid rgba(74,222,128,0.5)',
            color: 'rgba(74,222,128,0.95)',
            fontSize: 12,
            fontWeight: 700,
            cursor: status === 'approved' ? 'default' : 'pointer',
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          ✓ Approve
        </button>
        <button
          type="button"
          onClick={onEdit}
          data-testid="edit-btn"
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            background: editing ? 'rgba(245,197,24,0.18)' : 'rgba(245,197,24,0.08)',
            border: '1px solid rgba(245,197,24,0.4)',
            color: GOLD,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          {editing ? 'Done editing' : 'Edit'}
        </button>
        <button
          type="button"
          onClick={onDiscard}
          disabled={status === 'discarded'}
          data-testid="discard-btn"
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            background: status === 'discarded' ? 'rgba(248,113,113,0.2)' : 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.4)',
            color: 'rgba(248,113,113,0.95)',
            fontSize: 12,
            fontWeight: 700,
            cursor: status === 'discarded' ? 'default' : 'pointer',
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          × Discard
        </button>
      </div>
    </div>
  );
}
