/**
 * CardScreen
 *
 * Main card display — question state with answer options, session HUD,
 * card navigation, submit flow, exit modal, and epic answer animations.
 * Routes: /session/play, /diagnostic/play
 *
 * Owner: Junior Engineer 3
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { AnimationType } from '@/components/animations/AnswerAnimations'
import { AnswerAnimations } from '@/components/animations/AnswerAnimations'
import { ExitModal } from '@/components/modals/ExitModal'
import { useDashboardStore } from '@/store/dashboardStore'
import { useSessionStore } from '@/store/sessionStore'
import type { SessionSnapshot } from '@/types'
import { shuffleOptions } from '@/utils/shuffle'

import { AnswerOption } from './AnswerOption'
import { PearlReveal } from './PearlReveal'
import { StudyLayers } from './StudyLayers'
import { WhyWrongBox } from './WhyWrongBox'

const STREAK_MILESTONES = [3, 5, 10]

export function CardScreen() {
  const navigate = useNavigate()
  const {
    cards, currentIdx, mode, results, answers, shuffles, isDiagnostic, sessionName,
    correctCount, wrongCount, xp, streakCount,
    setCurrentIdx, recordAnswer, setShuffle, startCardTimer, stopCardTimer, endSession,
  } = useSessionStore()
  const addSession = useDashboardStore((s) => s.addSession)
  const markCardSeen = useDashboardStore((s) => s.markCardSeen)
  const sessionHistoryLength = useDashboardStore((s) => s.sessionHistory.length)

  const [selectedOpt, setSelectedOpt] = useState(-1)
  const [struckOpts, setStruckOpts] = useState<Record<number, boolean>>({})
  const [answered, setAnswered] = useState(false)
  const [showPearl, setShowPearl] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const [animation, setAnimation] = useState<AnimationType>(null)

  const card = cards[currentIdx]
  const totalCards = cards.length
  const pct = totalCards > 0 ? Math.round(((currentIdx + 1) / totalCards) * 100) : 0

  // Get or create shuffle for current card
  const currentShuffle = shuffles[currentIdx] ?? (() => {
    const s = shuffleOptions(card?.opts ?? [], card?.correct ?? 0)
    setShuffle(currentIdx, s)
    return s
  })()

  // Reset local state when card changes
  useEffect(() => {
    const alreadyAnswered = answers[currentIdx] !== undefined
    setSelectedOpt(alreadyAnswered ? (answers[currentIdx] ?? -1) : -1)
    setStruckOpts({})
    setAnswered(alreadyAnswered)
    setShowPearl(false)
    startCardTimer()
  }, [currentIdx, answers, startCardTimer])

  const handleSelect = useCallback((idx: number) => {
    if (answered) return
    setSelectedOpt(idx)
  }, [answered])

  const handleStrike = useCallback((idx: number) => {
    if (answered) return
    setStruckOpts((prev) => {
      const next = { ...prev, [idx]: !prev[idx] }
      if (next[idx] && selectedOpt === idx) setSelectedOpt(-1)
      return next
    })
  }, [answered, selectedOpt])

  /**
   * Save completed session to dashboardStore history and navigate to review.
   * Only runs for non-diagnostic sessions (diagnostic goes to /diagnostic/results).
   */
  const completeSession = useCallback(() => {
    endSession()

    if (isDiagnostic) {
      navigate('/diagnostic/results')
      return
    }

    // Build snapshot using LATEST store state (after final recordAnswer)
    const state = useSessionStore.getState()
    const total = state.cards.length
    const pctScore = total > 0 ? Math.round((state.correctCount / total) * 100) : 0
    const cats: Record<string, boolean> = {}
    state.cards.forEach((c) => { cats[c.cat] = true })
    const categoryList = Object.keys(cats).join(', ')

    const now = new Date()
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const dateStr = `${months[now.getMonth()]} ${now.getDate()}`

    const snapshot: SessionSnapshot = {
      id: sessionHistoryLength + 1,
      name: sessionName || `Session ${sessionHistoryLength + 1}`,
      mode: state.mode,
      date: dateStr,
      categories: categoryList,
      correct: state.correctCount,
      wrong: state.wrongCount,
      total,
      pct: pctScore,
      cards: state.cards,
      results: state.results,
      answers: state.answers,
      shuffles: state.shuffles,
    }
    addSession(snapshot)
    state.cards.forEach((c) => markCardSeen(c.title))

    navigate('/session/review')
  }, [endSession, isDiagnostic, navigate, sessionHistoryLength, sessionName, addSession, markCardSeen])

  const handleSubmit = useCallback(() => {
    if (selectedOpt === -1 || answered) return
    stopCardTimer()

    const isCorrect = selectedOpt === currentShuffle.correct
    const xpEarned = isCorrect ? (card?.xp ?? 20) : 0
    recordAnswer(currentIdx, selectedOpt, isCorrect, xpEarned)
    setAnswered(true)

    // Trigger epic animation (study mode only)
    if (mode === 'study') {
      setAnimation(isCorrect ? 'correct' : 'wrong')

      // Check for streak milestone (requires the new streak count after recordAnswer)
      if (isCorrect) {
        const newStreak = streakCount + 1
        if (STREAK_MILESTONES.includes(newStreak)) {
          setTimeout(() => setAnimation('streak'), 900)
        }
      }
      // Check for halfway milestone
      const halfway = Math.floor(totalCards / 2)
      if (currentIdx + 1 === halfway) {
        setTimeout(() => setAnimation('milestone'), 900)
      }
    }

    if (mode === 'test') {
      setTimeout(() => {
        if (currentIdx < totalCards - 1) {
          setCurrentIdx(currentIdx + 1)
        } else {
          completeSession()
        }
      }, 600)
    }
  }, [selectedOpt, answered, currentShuffle, card, currentIdx, totalCards, mode, streakCount, stopCardTimer, recordAnswer, setCurrentIdx, completeSession])

  const handleNext = useCallback(() => {
    if (currentIdx < totalCards - 1) {
      setCurrentIdx(currentIdx + 1)
    } else {
      completeSession()
    }
  }, [currentIdx, totalCards, setCurrentIdx, completeSession])

  const handlePrev = useCallback(() => {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1)
  }, [currentIdx, setCurrentIdx])

  const handleExit = useCallback(() => {
    setShowExitModal(false)
    endSession()
    navigate('/')
  }, [endSession, navigate])

  if (!card) return null

  const showResult = answered && mode === 'study'
  const isCorrectAnswer = results[currentIdx] === true

  return (
    <div className="content card-screen scrollable">
      {/* Navigation row + exit button */}
      <div className="nav-row" style={{ marginBottom: 8, position: 'relative' }}>
        <button
          className={`nav-btn${currentIdx === 0 ? ' disabled' : ''}`}
          onClick={handlePrev}
          aria-label="Previous card"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 11L5 7l4-4" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="nav-center" />
        <button
          className={`nav-btn${(!answered || currentIdx >= totalCards - 1) ? ' disabled' : ''}`}
          onClick={() => answered && setCurrentIdx(currentIdx + 1)}
          aria-label="Next card"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3l4 4-4 4" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          className="nav-btn"
          onClick={() => setShowExitModal(true)}
          aria-label="Exit session"
          style={{ marginLeft: 6 }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* XP tag + progress */}
      <div className="card-hdr">
        <span className="xp-tag">+{card.xp} XP</span>
      </div>
      <div className="card-prog-wrap">
        <div className="card-prog-meta">
          <span>Card {currentIdx + 1} of {totalCards}</span>
          <span>{pct}%</span>
        </div>
        <div className="card-prog-bar">
          <div className="card-prog-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Stats HUD */}
      <div className="stats-row">
        <div className="stat-mini"><div className="stat-n">{correctCount}</div><div className="stat-l">Correct</div></div>
        <div className="stat-mini"><div className="stat-n">{wrongCount}</div><div className="stat-l">Review</div></div>
        <div className="stat-mini"><div className="stat-n">{xp}</div><div className="stat-l">XP</div></div>
        <div className="stat-mini"><div className="stat-n">🔥{streakCount}</div><div className="stat-l">Streak</div></div>
      </div>

      {/* Question card */}
      <div className="q-card">
        <div className="scenario-box">
          <div className="scenario-tag-label">📋 Scenario</div>
          <div>{card.scenario}</div>
        </div>
        <div className="q-text-main">{card.question}</div>
      </div>

      {/* Answer options */}
      {currentShuffle.opts.map((text, i) => (
        <AnswerOption
          key={i}
          index={i}
          text={text}
          isSelected={selectedOpt === i && !answered}
          isStruck={!!struckOpts[i]}
          isCorrect={answered && i === currentShuffle.correct}
          isWrong={answered && i === selectedOpt && i !== currentShuffle.correct}
          isDisabled={answered}
          onSelect={handleSelect}
          onStrike={handleStrike}
        />
      ))}

      {/* Submit button (visible when option selected, hidden after submit) */}
      {selectedOpt !== -1 && !answered && (
        <button className="submit-answer-btn" onClick={handleSubmit}>
          Submit Answer →
        </button>
      )}

      {/* Study mode result — full CCCC flow */}
      {showResult && (
        <div style={{ marginTop: 12 }}>
          <div className={`result-bar ${isCorrectAnswer ? 'result-correct' : 'result-wrong'}`}>
            <span style={{ fontSize: 18 }}>{isCorrectAnswer ? '⚡' : '📖'}</span>
            <span className={isCorrectAnswer ? 'result-text-correct' : 'result-text-wrong'}>
              {isCorrectAnswer ? `Correct! +${card.xp} XP Earned` : `Review — Correct: ${currentShuffle.opts[currentShuffle.correct]}`}
            </span>
          </div>

          {/* Why wrong explanation */}
          <WhyWrongBox
            chosenText={currentShuffle.opts[answers[currentIdx] ?? 0] ?? ''}
            whyWrong={card.why_wrong ?? {}}
            visible={!isCorrectAnswer}
          />

          {/* CCCC Layers */}
          <StudyLayers
            layers={card.layers ?? []}
            onAllUnlocked={() => setShowPearl(true)}
          />

          {/* Pearl + Next button (after all layers unlocked) */}
          {showPearl && (
            <PearlReveal
              lens={card.lens ?? ''}
              pearl={card.pearl ?? ''}
              mnemonic={card.mnemonic ?? []}
              isLastCard={currentIdx === totalCards - 1}
              onNext={handleNext}
            />
          )}
        </div>
      )}

      {/* Epic animations */}
      <AnswerAnimations
        type={animation}
        xp={card.xp}
        streakCount={streakCount + (isCorrectAnswer ? 1 : 0)}
        currentCard={currentIdx + 1}
        totalCards={totalCards}
        onComplete={() => setAnimation(null)}
      />

      {/* Exit modal */}
      <ExitModal
        visible={showExitModal}
        onCancel={() => setShowExitModal(false)}
        onConfirm={handleExit}
      />
    </div>
  )
}
