/**
 * AnswerAnimations unit tests
 */

import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AnswerAnimations } from './AnswerAnimations'

describe('AnswerAnimations', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  // ── null type ────────────────────────────────────────────────────────

  it('renders nothing when type is null', () => {
    const { container } = render(<AnswerAnimations type={null} />)
    expect(container.innerHTML).toBe('')
  })

  // ── correct type ─────────────────────────────────────────────────────

  describe('correct', () => {
    it('renders overlay', () => {
      render(<AnswerAnimations type="correct" xp={20} />)
      expect(screen.getByTestId('overlay-correct')).toBeInTheDocument()
    })

    it('renders two rings', () => {
      render(<AnswerAnimations type="correct" xp={20} />)
      expect(screen.getByTestId('ring-gold')).toBeInTheDocument()
      expect(screen.getByTestId('ring-green')).toBeInTheDocument()
    })

    it('renders score popup with XP value', () => {
      render(<AnswerAnimations type="correct" xp={25} />)
      expect(screen.getByTestId('score-popup')).toBeInTheDocument()
      expect(screen.getByText('+25')).toBeInTheDocument()
      expect(screen.getByText('XP Earned')).toBeInTheDocument()
    })

    it('renders correct toast', () => {
      render(<AnswerAnimations type="correct" xp={20} />)
      expect(screen.getByTestId('toast-correct')).toBeInTheDocument()
      expect(screen.getByText(/nailed it/i)).toBeInTheDocument()
    })

    it('renders 30 confetti pieces', () => {
      const { container } = render(<AnswerAnimations type="correct" xp={20} />)
      expect(container.querySelectorAll('.anim-conf').length).toBe(30)
    })

    it('calls onComplete after 1500ms', () => {
      const onComplete = vi.fn()
      render(<AnswerAnimations type="correct" xp={20} onComplete={onComplete} />)

      expect(onComplete).not.toHaveBeenCalled()

      act(() => { vi.advanceTimersByTime(1500) })

      expect(onComplete).toHaveBeenCalledTimes(1)
    })
  })

  // ── wrong type ───────────────────────────────────────────────────────

  describe('wrong', () => {
    it('renders wrong overlay', () => {
      render(<AnswerAnimations type="wrong" />)
      expect(screen.getByTestId('overlay-wrong')).toBeInTheDocument()
    })

    it('renders red rings', () => {
      render(<AnswerAnimations type="wrong" />)
      expect(screen.getByTestId('ring-red')).toBeInTheDocument()
      expect(screen.getByTestId('ring-red-2')).toBeInTheDocument()
    })

    it('renders wrong score popup with X emoji', () => {
      render(<AnswerAnimations type="wrong" />)
      expect(screen.getByTestId('score-wrong')).toBeInTheDocument()
      expect(screen.getByText('❌')).toBeInTheDocument()
      expect(screen.getByText(/review this card/i)).toBeInTheDocument()
    })

    it('renders wrong toast', () => {
      render(<AnswerAnimations type="wrong" />)
      expect(screen.getByTestId('toast-wrong')).toBeInTheDocument()
      expect(screen.getByText(/cccc will show you why/i)).toBeInTheDocument()
    })

    it('does not render confetti', () => {
      const { container } = render(<AnswerAnimations type="wrong" />)
      expect(container.querySelectorAll('.anim-conf').length).toBe(0)
    })
  })

  // ── streak type ──────────────────────────────────────────────────────

  describe('streak', () => {
    it('renders streak overlay', () => {
      render(<AnswerAnimations type="streak" streakCount={3} />)
      expect(screen.getByTestId('overlay-streak')).toBeInTheDocument()
    })

    it('renders streak popup with count', () => {
      render(<AnswerAnimations type="streak" streakCount={5} />)
      expect(screen.getByText(/🔥 x5/)).toBeInTheDocument()
      expect(screen.getAllByText(/on fire/i).length).toBeGreaterThanOrEqual(1)
    })

    it('shows "on fire" message at 5 streak', () => {
      render(<AnswerAnimations type="streak" streakCount={5} />)
      expect(screen.getByText(/you're on fire/i)).toBeInTheDocument()
    })

    it('shows "UNSTOPPABLE" message at 10+ streak', () => {
      render(<AnswerAnimations type="streak" streakCount={10} />)
      expect(screen.getByText(/unstoppable/i)).toBeInTheDocument()
    })

    it('shows plain message below 5 streak', () => {
      render(<AnswerAnimations type="streak" streakCount={3} />)
      expect(screen.getByText(/🔥 3 in a row!/i)).toBeInTheDocument()
    })
  })

  // ── milestone type ───────────────────────────────────────────────────

  describe('milestone', () => {
    it('renders milestone overlay', () => {
      render(<AnswerAnimations type="milestone" currentCard={5} totalCards={10} />)
      expect(screen.getByTestId('overlay-milestone')).toBeInTheDocument()
    })

    it('renders current/total progress', () => {
      render(<AnswerAnimations type="milestone" currentCard={10} totalCards={20} />)
      expect(screen.getByText('10 / 20')).toBeInTheDocument()
      expect(screen.getByText(/halfway there/i)).toBeInTheDocument()
    })

    it('renders milestone toast', () => {
      render(<AnswerAnimations type="milestone" currentCard={5} totalCards={10} />)
      expect(screen.getByText(/halfway — finish strong/i)).toBeInTheDocument()
    })

    it('renders 22 confetti pieces', () => {
      const { container } = render(<AnswerAnimations type="milestone" currentCard={5} totalCards={10} />)
      expect(container.querySelectorAll('.anim-conf').length).toBe(22)
    })
  })

  // ── onComplete ───────────────────────────────────────────────────────

  it('onComplete fires for all types after 1500ms', () => {
    const types: Array<'correct' | 'wrong' | 'streak' | 'milestone'> = [
      'correct', 'wrong', 'streak', 'milestone',
    ]
    for (const t of types) {
      const onComplete = vi.fn()
      const { unmount } = render(<AnswerAnimations type={t} onComplete={onComplete} />)
      act(() => { vi.advanceTimersByTime(1500) })
      expect(onComplete).toHaveBeenCalledTimes(1)
      unmount()
    }
  })

  it('does not call onComplete when unmounted before timeout', () => {
    const onComplete = vi.fn()
    const { unmount } = render(<AnswerAnimations type="correct" xp={20} onComplete={onComplete} />)
    unmount()
    act(() => { vi.advanceTimersByTime(1500) })

    expect(onComplete).not.toHaveBeenCalled()
  })
})
