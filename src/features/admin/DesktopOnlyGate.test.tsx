// src/features/admin/DesktopOnlyGate.test.tsx

import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import { DesktopOnlyGate } from './DesktopOnlyGate';

const ORIGINAL_INNER_WIDTH = window.innerWidth;

function setInnerWidth(px: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: px });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockNavigate.mockReset();
});

afterEach(() => {
  setInnerWidth(ORIGINAL_INNER_WIDTH);
});

describe('DesktopOnlyGate', () => {
  it('renders children when viewport is wide enough', () => {
    setInnerWidth(1440);
    render(
      <MemoryRouter>
        <DesktopOnlyGate>
          <div data-testid="protected-child">visible</div>
        </DesktopOnlyGate>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('protected-child')).toBeTruthy();
    expect(screen.queryByTestId('desktop-only-gate')).toBeNull();
  });

  it('shows the desktop-required gate when viewport is below threshold', () => {
    setInnerWidth(800);
    render(
      <MemoryRouter>
        <DesktopOnlyGate>
          <div data-testid="protected-child">should not render</div>
        </DesktopOnlyGate>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('desktop-only-gate')).toBeTruthy();
    expect(screen.getByText(/Desktop required/i)).toBeTruthy();
    expect(screen.queryByTestId('protected-child')).toBeNull();
  });

  it('renders children at exactly the 1024px threshold', () => {
    setInnerWidth(1024);
    render(
      <MemoryRouter>
        <DesktopOnlyGate>
          <div data-testid="protected-child">visible</div>
        </DesktopOnlyGate>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('protected-child')).toBeTruthy();
  });

  it('reacts to resize — hides children when window narrows below threshold', () => {
    setInnerWidth(1440);
    render(
      <MemoryRouter>
        <DesktopOnlyGate>
          <div data-testid="protected-child">visible</div>
        </DesktopOnlyGate>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('protected-child')).toBeTruthy();

    act(() => {
      setInnerWidth(800);
      window.dispatchEvent(new Event('resize'));
    });
    expect(screen.queryByTestId('protected-child')).toBeNull();
    expect(screen.getByTestId('desktop-only-gate')).toBeTruthy();
  });

  it('renders an Outlet when used as a route element with no children', () => {
    setInnerWidth(1440);
    render(
      <MemoryRouter initialEntries={['/inside']}>
        <Routes>
          <Route element={<DesktopOnlyGate />}>
            <Route path="/inside" element={<div data-testid="outlet-child">outlet content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('outlet-child')).toBeTruthy();
  });

  it('Back to app button navigates to /', () => {
    setInnerWidth(800);
    render(
      <MemoryRouter>
        <DesktopOnlyGate />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Back to app/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
