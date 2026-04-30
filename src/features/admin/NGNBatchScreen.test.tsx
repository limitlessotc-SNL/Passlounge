// src/features/admin/NGNBatchScreen.test.tsx

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

vi.mock('./ngn.generator', async () => {
  const actual = await vi.importActual<typeof import('./ngn.generator')>('./ngn.generator');
  return { ...actual, generateSingleCard: vi.fn() };
});

import {
  fetchNGNCardTitlesAndScenarios,
  insertNGNCard,
} from '@/features/ngn/ngn.service';
import { useAuthStore } from '@/store/authStore';

import { logAdminAction } from './admin.service';
import { NGNBatchScreen } from './NGNBatchScreen';
import { generateSingleCard } from './ngn.generator';

const mockFetchTitles = vi.mocked(fetchNGNCardTitlesAndScenarios);
const mockInsert      = vi.mocked(insertNGNCard);
const mockLog         = vi.mocked(logAdminAction);
const mockGenerate    = vi.mocked(generateSingleCard);

function makeCard(overrides: Partial<GeneratedCard> = {}): GeneratedCard {
  return {
    title:            'Test card',
    scenario:         'A test scenario',
    question:         'Question?',
    type:             'matrix',
    nclex_category:   'Management of Care',
    difficulty_level: 3,
    scoring_rule:     '0/1',
    max_points:       3,
    content:          { columns: ['A', 'B'], rows: [] },
    rationale:        'Because.',
    source:           'Test source',
    isDuplicate:      false,
    similarity:       0.1,
    ...overrides,
  };
}

function renderScreen() {
  return render(
    <MemoryRouter>
      <NGNBatchScreen />
    </MemoryRouter>,
  );
}

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

describe('NGNBatchScreen', () => {
  it('renders heading and config panel', async () => {
    renderScreen();
    expect(screen.getByText(/Batch generate/i)).toBeTruthy();
    expect(screen.getByLabelText(/Batch types/i)).toBeTruthy();
    expect(screen.getByLabelText(/Batch count/i)).toBeTruthy();
    expect(screen.getByTestId('batch-generate-btn')).toBeTruthy();
  });

  it('streams cards into the list as they are generated', async () => {
    mockGenerate
      .mockResolvedValueOnce(makeCard({ title: 'A' }))
      .mockResolvedValueOnce(makeCard({ title: 'B' }))
      .mockResolvedValueOnce(makeCard({ title: 'C' }));

    const user = userEvent.setup();
    renderScreen();

    const countInput = screen.getByLabelText(/Batch count/i) as HTMLInputElement;
    fireEvent.change(countInput, { target: { value: '3' } });

    await user.click(screen.getByTestId('batch-generate-btn'));

    await waitFor(() => {
      expect(mockGenerate).toHaveBeenCalledTimes(3);
    });
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('B')).toBeTruthy();
    expect(screen.getByText('C')).toBeTruthy();
  });

  it('caps the count at 20', async () => {
    mockGenerate.mockResolvedValue(makeCard());
    const user = userEvent.setup();
    renderScreen();

    fireEvent.change(screen.getByLabelText(/Batch count/i), { target: { value: '50' } });
    expect((screen.getByLabelText(/Batch count/i) as HTMLInputElement).value).toBe('20');

    await user.click(screen.getByTestId('batch-generate-btn'));
    await waitFor(() => {
      expect(mockGenerate).toHaveBeenCalledTimes(20);
    });
  });

  it('Approve marks the card and unlocks Save All', async () => {
    mockGenerate.mockResolvedValue(makeCard({ title: 'Sole card' }));
    const user = userEvent.setup();
    renderScreen();

    fireEvent.change(screen.getByLabelText(/Batch count/i), { target: { value: '1' } });
    await user.click(screen.getByTestId('batch-generate-btn'));

    await waitFor(() => {
      expect(screen.getByText('Sole card')).toBeTruthy();
    });

    // Save All starts disabled.
    expect((screen.getByTestId('save-all-btn') as HTMLButtonElement).disabled).toBe(true);

    await user.click(screen.getByTestId('approve-btn'));

    await waitFor(() => {
      expect((screen.getByTestId('save-all-btn') as HTMLButtonElement).disabled).toBe(false);
    });
    expect(screen.getByTestId('save-all-btn').textContent).toMatch(/Save all approved \(1\)/);
  });

  it('Save All inserts each approved card and navigates back', async () => {
    mockGenerate
      .mockResolvedValueOnce(makeCard({ title: 'A' }))
      .mockResolvedValueOnce(makeCard({ title: 'B' }));
    mockInsert.mockImplementation(async (c) => ({ ...c, id: `id-${c.title}` }));
    const user = userEvent.setup();
    renderScreen();

    fireEvent.change(screen.getByLabelText(/Batch count/i), { target: { value: '2' } });
    await user.click(screen.getByTestId('batch-generate-btn'));

    await waitFor(() => {
      expect(screen.getAllByTestId('approve-btn')).toHaveLength(2);
    });

    const approveButtons = screen.getAllByTestId('approve-btn');
    await user.click(approveButtons[0]);
    await user.click(approveButtons[1]);

    await user.click(screen.getByTestId('save-all-btn'));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledTimes(2);
    });
    expect(mockLog).toHaveBeenCalledWith('admin.ngn_create',
      expect.objectContaining({ batch: true, type: 'matrix' }));
    expect(mockNavigate).toHaveBeenCalledWith('/admin');
  });

  it('Discard skips the card on Save All', async () => {
    mockGenerate
      .mockResolvedValueOnce(makeCard({ title: 'Keep' }))
      .mockResolvedValueOnce(makeCard({ title: 'Drop' }));
    mockInsert.mockImplementation(async (c) => ({ ...c, id: 'id-' + c.title }));
    const user = userEvent.setup();
    renderScreen();

    fireEvent.change(screen.getByLabelText(/Batch count/i), { target: { value: '2' } });
    await user.click(screen.getByTestId('batch-generate-btn'));

    await waitFor(() => {
      expect(screen.getAllByTestId('approve-btn')).toHaveLength(2);
    });

    const rows = screen.getAllByTestId(/batch-row-/);
    await user.click(within(rows[0]).getByTestId('approve-btn'));
    await user.click(within(rows[1]).getByTestId('discard-btn'));

    await user.click(screen.getByTestId('save-all-btn'));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });
    expect(mockInsert.mock.calls[0][0].title).toBe('Keep');
  });

  it('shows the duplicate badge for AI-flagged duplicates', async () => {
    mockGenerate.mockResolvedValueOnce(makeCard({
      title:          'Dup card',
      isDuplicate:    true,
      similarity:     0.91,
      similarToTitle: 'Original',
    }));
    const user = userEvent.setup();
    renderScreen();

    fireEvent.change(screen.getByLabelText(/Batch count/i), { target: { value: '1' } });
    await user.click(screen.getByTestId('batch-generate-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('dup-badge').textContent).toMatch(/91%/);
    });
  });

  it('Edit toggle reveals the inline edit panel', async () => {
    mockGenerate.mockResolvedValueOnce(makeCard({ title: 'Edit me' }));
    const user = userEvent.setup();
    renderScreen();

    fireEvent.change(screen.getByLabelText(/Batch count/i), { target: { value: '1' } });
    await user.click(screen.getByTestId('batch-generate-btn'));

    await waitFor(() => {
      expect(screen.getByText('Edit me')).toBeTruthy();
    });

    expect(screen.queryByTestId('row-edit-panel')).toBeNull();
    await user.click(screen.getByTestId('edit-btn'));
    expect(screen.getByTestId('row-edit-panel')).toBeTruthy();
  });
});
