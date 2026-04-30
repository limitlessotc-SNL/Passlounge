// src/features/admin/NGNCreateScreen.test.tsx

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GeneratedCard } from './ngn.generator';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/features/ngn/ngn.service', () => ({
  fetchNGNCardTitlesAndScenarios: vi.fn(),
  insertNGNCard: vi.fn(),
}));

vi.mock('./admin.service', async () => {
  const actual = await vi.importActual<typeof import('./admin.service')>('./admin.service');
  return { ...actual, logAdminAction: vi.fn() };
});

vi.mock('./ngn.generator', () => ({
  generateSingleCard: vi.fn(),
}));

import {
  fetchNGNCardTitlesAndScenarios,
  insertNGNCard,
} from '@/features/ngn/ngn.service';
import { useAuthStore } from '@/store/authStore';

import { logAdminAction } from './admin.service';
import { NGNCreateScreen } from './NGNCreateScreen';
import { generateSingleCard } from './ngn.generator';

const mockFetchTitles = vi.mocked(fetchNGNCardTitlesAndScenarios);
const mockInsert      = vi.mocked(insertNGNCard);
const mockLog         = vi.mocked(logAdminAction);
const mockGenerate    = vi.mocked(generateSingleCard);

function renderScreen() {
  return render(
    <MemoryRouter>
      <NGNCreateScreen />
    </MemoryRouter>,
  );
}

const validGenerated: GeneratedCard = {
  title:            'Sepsis matrix L4',
  scenario:         'A 64-year-old patient develops sepsis...',
  question:         'Classify each finding.',
  type:             'matrix',
  nclex_category:   'Physiological Adaptation',
  difficulty_level: 4,
  scoring_rule:     '0/1',
  max_points:       3,
  content:          {
    columns: ['Anticipated', 'Unanticipated'],
    rows: [
      { label: 'Fever', correct_col: 0 },
      { label: 'Bradycardia', correct_col: 1 },
      { label: 'Tachypnea', correct_col: 0 },
    ],
  },
  rationale:        'Sepsis presents with...',
  source:           'Saunders 8th ed.',
  isDuplicate:      false,
  similarity:       0.2,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockNavigate.mockReset();
  mockFetchTitles.mockResolvedValue([]);
  mockLog.mockResolvedValue();
  useAuthStore.setState({
    user:            { id: 'stu-1', email: 't@t.com' },
    supaStudentId:   'stu-1',
    token:           'tok',
    isAuthenticated: true,
    isLoading:       false,
  });
});

afterEach(() => {
  useAuthStore.getState().logout();
});

describe('NGNCreateScreen', () => {
  it('renders heading and AI generate panel', async () => {
    renderScreen();
    expect(screen.getByText(/Create one card/i)).toBeTruthy();
    expect(screen.getByLabelText(/Question type/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Generate with AI/i })).toBeTruthy();
  });

  it('Generate button populates the fields from the AI response', async () => {
    mockGenerate.mockResolvedValue(validGenerated);
    const user = userEvent.setup();
    renderScreen();

    await user.selectOptions(screen.getByLabelText(/Question type/i), 'matrix');
    await user.click(screen.getByRole('button', { name: /Generate with AI/i }));

    await waitFor(() => {
      expect((screen.getByLabelText(/Card title/i) as HTMLInputElement).value)
        .toBe('Sepsis matrix L4');
    });
    expect((screen.getByLabelText(/Card scenario/i) as HTMLTextAreaElement).value)
      .toMatch(/64-year-old patient/);
    expect((screen.getByLabelText(/Card question/i) as HTMLTextAreaElement).value)
      .toMatch(/Classify each finding/);
  });

  it('shows the duplicate warning when isDuplicate=true', async () => {
    mockGenerate.mockResolvedValue({
      ...validGenerated,
      isDuplicate:    true,
      similarity:     0.92,
      similarToTitle: 'Sepsis matrix L4',
    });
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: /Generate with AI/i }));

    await waitFor(() => {
      expect(screen.getByTestId('duplicate-warning')).toBeTruthy();
    });
    expect(screen.getByTestId('duplicate-warning').textContent).toMatch(/92% similar/);
  });

  it('Save validates that title and question are present', async () => {
    renderScreen();

    fireEvent.click(screen.getByTestId('save-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('error-msg').textContent)
        .toMatch(/Title and question are required/i);
    });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('Save inserts the card and navigates back to /admin', async () => {
    mockGenerate.mockResolvedValue(validGenerated);
    mockInsert.mockResolvedValue({ ...validGenerated, id: 'new-id' });
    const user = userEvent.setup();
    renderScreen();

    await user.selectOptions(screen.getByLabelText(/Question type/i), 'matrix');
    await user.click(screen.getByRole('button', { name: /Generate with AI/i }));

    await waitFor(() => {
      expect((screen.getByLabelText(/Card title/i) as HTMLInputElement).value)
        .toBe('Sepsis matrix L4');
    });

    await user.click(screen.getByTestId('save-btn'));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });
    const insertedCard = mockInsert.mock.calls[0][0];
    expect(insertedCard.title).toBe('Sepsis matrix L4');
    expect(insertedCard.type).toBe('matrix');
    expect(insertedCard.scoring_rule).toBe('0/1');
    expect(insertedCard.max_points).toBe(3);
    expect(insertedCard.created_by).toBe('stu-1');
    expect(mockLog).toHaveBeenCalledWith('admin.ngn_create', expect.objectContaining({
      card_id: 'new-id', type: 'matrix',
    }));
    expect(mockNavigate).toHaveBeenCalledWith('/admin');
  });

  it('switching the type swaps the active form', async () => {
    const user = userEvent.setup();
    renderScreen();

    // Default = MCQ, has "Add option" button.
    await waitFor(() => {
      expect(screen.getByText(/Add option/i)).toBeTruthy();
    });

    // Switch to bow-tie.
    await user.selectOptions(screen.getByLabelText(/Question type/i), 'bow_tie');
    await waitFor(() => {
      expect(screen.getByText(/Center panel/i)).toBeTruthy();
    });
  });
});
