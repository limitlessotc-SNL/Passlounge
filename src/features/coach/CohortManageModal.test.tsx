// src/features/coach/CohortManageModal.test.tsx

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./coach.service', () => ({
  createCohort: vi.fn(),
  updateCohort: vi.fn(),
}));

import { createCohort, updateCohort } from './coach.service';
import type { Cohort } from './coach.types';

import { CohortManageModal } from './CohortManageModal';

const mockCreate = vi.mocked(createCohort);
const mockUpdate = vi.mocked(updateCohort);

const fakeCohort: Cohort = {
  id: 'co1',
  school_id: 's1',
  coach_id: 'c1',
  name: 'NUR 425',
  cohort_code: 'NUR425',
  target_test_date: '2026-08-01',
  is_active: true,
  created_at: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCreate.mockResolvedValue(fakeCohort);
  mockUpdate.mockResolvedValue();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CohortManageModal', () => {
  it('create mode validates that name is required', async () => {
    const user = userEvent.setup();
    render(
      <CohortManageModal
        mode="create"
        schoolId="s1"
        coachId="c1"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    // Submit button starts disabled with empty name.
    const btn = screen.getByTestId('cohort-submit-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    await user.type(screen.getByLabelText(/cohort name/i), 'NUR 425');
    expect(btn.disabled).toBe(false);
  });

  it('create mode shows the generated cohort code on success', async () => {
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(
      <CohortManageModal
        mode="create"
        schoolId="s1"
        coachId="c1"
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    );

    await user.type(screen.getByLabelText(/cohort name/i), 'NUR 425');
    await user.click(screen.getByTestId('cohort-submit-btn'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
    });
    expect(onSaved).toHaveBeenCalledWith(fakeCohort);
    expect(screen.getByTestId('cohort-code-display').textContent).toBe('NUR425');
  });

  it('edit mode pre-fills the form', () => {
    render(
      <CohortManageModal
        mode="edit"
        schoolId="s1"
        coachId="c1"
        cohort={fakeCohort}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    const nameInput = screen.getByLabelText(/cohort name/i) as HTMLInputElement;
    expect(nameInput.value).toBe('NUR 425');
    const dateInput = screen.getByLabelText(/target test date/i) as HTMLInputElement;
    expect(dateInput.value).toBe('2026-08-01');
  });

  it('edit mode calls updateCohort and closes', async () => {
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(
      <CohortManageModal
        mode="edit"
        schoolId="s1"
        coachId="c1"
        cohort={fakeCohort}
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    );
    const nameInput = screen.getByLabelText(/cohort name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'NUR 425 (Fall)');
    await user.click(screen.getByTestId('cohort-submit-btn'));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('co1', expect.objectContaining({
        name: 'NUR 425 (Fall)',
      }));
    });
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({
      name: 'NUR 425 (Fall)',
    }));
  });

  it('edit mode deactivate button calls updateCohort with is_active=false', async () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(
      <CohortManageModal
        mode="edit"
        schoolId="s1"
        coachId="c1"
        cohort={fakeCohort}
        onClose={onClose}
        onSaved={onSaved}
      />,
    );
    await user.click(screen.getByTestId('cohort-deactivate-btn'));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('co1', { is_active: false });
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking the backdrop calls onClose', () => {
    const onClose = vi.fn();
    render(
      <CohortManageModal
        mode="create"
        schoolId="s1"
        coachId="c1"
        onClose={onClose}
        onSaved={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('cohort-modal-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });
});
