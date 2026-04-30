// src/features/coach/CohortManageModal.tsx
//
// Modal that creates a new cohort or edits an existing one. Cohort code is
// auto-generated on creation by coach.service and shown back to the coach so
// they can copy it to their LMS / class roster. Editing only allows changing
// name, target_test_date, and is_active — the code is permanent.

import { useEffect, useState } from 'react';

import {
  createCohort,
  updateCohort,
} from './coach.service';
import type { Cohort } from './coach.types';

const GOLD = '#F5C518';
const RED  = 'rgba(248,113,113,0.95)';

type Mode = 'create' | 'edit';

interface Props {
  mode:     Mode;
  schoolId: string;
  coachId:  string;
  cohort?:  Cohort;
  onClose:  () => void;
  onSaved:  (cohort: Cohort) => void;
}

export function CohortManageModal({
  mode, schoolId, coachId, cohort, onClose, onSaved,
}: Props) {
  const [name, setName]                 = useState(cohort?.name ?? '');
  const [testDate, setTestDate]         = useState(cohort?.target_test_date ?? '');
  const [isActive, setIsActive]         = useState(cohort?.is_active ?? true);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [createdCohort, setCreatedCohort] = useState<Cohort | null>(null);

  useEffect(() => {
    setName(cohort?.name ?? '');
    setTestDate(cohort?.target_test_date ?? '');
    setIsActive(cohort?.is_active ?? true);
  }, [cohort]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'create') {
        const created = await createCohort({
          school_id: schoolId,
          coach_id: coachId,
          name: name.trim(),
          target_test_date: testDate || null,
          is_active: true,
        });
        setCreatedCohort(created);
        onSaved(created);
      } else if (cohort) {
        await updateCohort(cohort.id, {
          name: name.trim(),
          target_test_date: testDate || null,
          is_active: isActive,
        });
        onSaved({
          ...cohort,
          name: name.trim(),
          target_test_date: testDate || null,
          is_active: isActive,
        });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate() {
    if (!cohort) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateCohort(cohort.id, { is_active: false });
      onSaved({ ...cohort, is_active: false });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div
        data-testid="cohort-modal-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 60,
        }}
      />
      <div
        data-testid="cohort-modal"
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(440px, 100vw)',
          background: '#0a1629',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 18,
          padding: 24,
          color: '#fff',
          fontFamily: "'Outfit', 'Inter', sans-serif",
          zIndex: 70,
        }}
      >
        <div style={{
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.45)',
          fontWeight: 700,
        }}>
          SNL Educator
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: '4px 0 16px' }}>
          {mode === 'create' ? 'New cohort' : 'Edit cohort'}
        </h1>

        {createdCohort ? (
          <div data-testid="cohort-created-block">
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>
              Cohort created. Share this code with students so they can join:
            </p>
            <div
              data-testid="cohort-code-display"
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: 4,
                textAlign: 'center',
                padding: '14px 8px',
                borderRadius: 12,
                background: 'rgba(245,197,24,0.10)',
                border: `1px solid ${GOLD}`,
                color: GOLD,
                fontFamily: 'monospace',
                marginBottom: 16,
              }}
            >
              {createdCohort.cohort_code}
            </div>
            <button
              type="button"
              onClick={onClose}
              data-testid="cohort-close-btn"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 12,
                background: GOLD,
                color: '#053571',
                border: 'none',
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Name">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. NUR 425 Fall 2026"
                aria-label="Cohort name"
                style={inputStyle()}
              />
            </Field>

            <Field label="Target test date">
              <input
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                aria-label="Target test date"
                style={inputStyle()}
              />
            </Field>

            {mode === 'edit' && (
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: 'rgba(255,255,255,0.7)',
              }}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  aria-label="Cohort active"
                  style={{ accentColor: GOLD }}
                />
                Active
              </label>
            )}

            {error && (
              <div
                data-testid="cohort-modal-error"
                style={{
                  background: 'rgba(248,113,113,0.10)',
                  border: '1px solid rgba(248,113,113,0.4)',
                  borderRadius: 10,
                  padding: '8px 10px',
                  color: RED,
                  fontSize: 12,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !name.trim()}
                data-testid="cohort-submit-btn"
                style={{
                  flex: 2,
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: GOLD,
                  color: '#053571',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: submitting || !name.trim() ? 'default' : 'pointer',
                  fontFamily: "'Outfit', sans-serif",
                  opacity: submitting || !name.trim() ? 0.5 : 1,
                }}
              >
                {submitting
                  ? 'Saving…'
                  : mode === 'create' ? 'Create cohort' : 'Save changes'}
              </button>
            </div>

            {mode === 'edit' && cohort?.is_active && (
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={submitting}
                data-testid="cohort-deactivate-btn"
                style={{
                  marginTop: 12,
                  padding: '8px 14px',
                  borderRadius: 10,
                  background: 'rgba(248,113,113,0.06)',
                  border: '1px solid rgba(248,113,113,0.3)',
                  color: RED,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                Deactivate cohort
              </button>
            )}
          </form>
        )}
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: 'rgba(255,255,255,0.5)',
        fontWeight: 700,
        marginBottom: 4,
      }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    padding: '10px 12px',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: 14,
    fontFamily: "'Outfit', sans-serif",
    outline: 'none',
  };
}
