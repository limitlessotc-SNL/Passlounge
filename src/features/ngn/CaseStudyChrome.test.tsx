// src/features/ngn/CaseStudyChrome.test.tsx

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CaseStudyChrome } from './CaseStudyChrome';
import type { CaseStudyTab } from './ngn.types';

const ORIGINAL_INNER_WIDTH = window.innerWidth;

function setInnerWidth(px: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: px });
}

const TABS: CaseStudyTab[] = [
  { label: 'Health History',     body: 'HPI: 60yo male, sudden weakness right side.' },
  { label: "Nurses' Notes",      body: 'Patient alert, R sided hemiplegia, NIHSS 16.' },
  { label: 'Vital Signs',        body: 'BP 210/116, HR 92, RR 18.' },
  { label: 'Laboratory Results', body: 'Glucose 120 mg/dL, INR 2.0.' },
];

beforeEach(() => {
  setInnerWidth(1024); // tablet+ default
});

afterEach(() => {
  setInnerWidth(ORIGINAL_INNER_WIDTH);
});

describe('CaseStudyChrome', () => {
  it('renders the purple banner with the type label', () => {
    render(
      <CaseStudyChrome type="extended_mr_all" tabs={TABS} question="Question stem">
        <div data-testid="body">body</div>
      </CaseStudyChrome>,
    );
    const banner = screen.getByTestId('case-study-banner');
    expect(banner.textContent).toMatch(/Extended Multiple Response/i);
  });

  it('renders all tab buttons and shows the first tab body by default', () => {
    render(
      <CaseStudyChrome type="extended_mr_all" tabs={TABS} question="Q">
        <div>body</div>
      </CaseStudyChrome>,
    );
    expect(screen.getByTestId('case-study-tab-0')).toBeTruthy();
    expect(screen.getByTestId('case-study-tab-3')).toBeTruthy();
    expect(screen.getByTestId('case-study-tab-body').textContent).toMatch(/sudden weakness/);
  });

  it('switches the active tab on click', () => {
    render(
      <CaseStudyChrome type="extended_mr_all" tabs={TABS} question="Q">
        <div>body</div>
      </CaseStudyChrome>,
    );
    fireEvent.click(screen.getByTestId('case-study-tab-2'));
    expect(screen.getByTestId('case-study-tab-body').textContent).toMatch(/BP 210\/116/);
  });

  it('renders the question stem and the children body', () => {
    render(
      <CaseStudyChrome type="matrix" tabs={TABS} question="Pick the best answer">
        <div data-testid="inner-body">inner</div>
      </CaseStudyChrome>,
    );
    expect(screen.getByText(/Pick the best answer/)).toBeTruthy();
    expect(screen.getByTestId('inner-body')).toBeTruthy();
  });

  it('uses a single-column layout below the 768px breakpoint', () => {
    setInnerWidth(500);
    render(
      <CaseStudyChrome type="matrix" tabs={TABS} question="Q">
        <div>body</div>
      </CaseStudyChrome>,
    );
    const body = screen.getByTestId('case-study-body');
    expect(body.style.gridTemplateColumns).toBe('1fr');
  });

  it('uses a two-column layout at 768px and up', () => {
    setInnerWidth(1024);
    render(
      <CaseStudyChrome type="matrix" tabs={TABS} question="Q">
        <div>body</div>
      </CaseStudyChrome>,
    );
    const body = screen.getByTestId('case-study-body');
    expect(body.style.gridTemplateColumns).toBe('1fr 1fr');
  });

  it('reacts to window resize to flip the layout live', () => {
    setInnerWidth(1024);
    render(
      <CaseStudyChrome type="matrix" tabs={TABS} question="Q">
        <div>body</div>
      </CaseStudyChrome>,
    );
    expect(screen.getByTestId('case-study-body').style.gridTemplateColumns).toBe('1fr 1fr');
    act(() => {
      setInnerWidth(500);
      window.dispatchEvent(new Event('resize'));
    });
    expect(screen.getByTestId('case-study-body').style.gridTemplateColumns).toBe('1fr');
  });

  it('falls back to a single empty tab when none provided', () => {
    render(
      <CaseStudyChrome type="mcq" tabs={[]} question="Q">
        <div>body</div>
      </CaseStudyChrome>,
    );
    expect(screen.getByTestId('case-study-tab-0')).toBeTruthy();
    expect(screen.getByTestId('case-study-tab-body').textContent).toMatch(/No content/);
  });

  it('omits the scenario block when not provided', () => {
    const { container } = render(
      <CaseStudyChrome type="matrix" tabs={TABS} question="Q">
        <div>body</div>
      </CaseStudyChrome>,
    );
    // Italic scenario text would appear; assert no italic-styled child
    expect(container.querySelector('[style*="italic"]')).toBeNull();
  });

  it('renders the scenario block when provided', () => {
    render(
      <CaseStudyChrome
        type="matrix"
        tabs={TABS}
        scenario="The nurse is providing care to a 60-year-old male."
        question="Q"
      >
        <div>body</div>
      </CaseStudyChrome>,
    );
    expect(screen.getByText(/60-year-old male/)).toBeTruthy();
  });
});
