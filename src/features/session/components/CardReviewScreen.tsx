/**
 * CardReviewScreen
 *
 * Read-only review of a single answered card. Displays:
 * - Scenario + question + all 4 options
 * - Correct answer highlighted green, student's wrong pick (if any) in red
 * - Why-wrong explanation for wrong answers
 * - SNL Method CCCC layers (tap-to-unlock) with pearl reveal at end
 * - Back to Results button
 *
 * Routes: /session/review-card/:cardIdx
 *
 * Owner: Junior Engineer 3
 */

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useSessionStore } from '@/store/sessionStore'

import { PearlReveal } from './PearlReveal'
import { StudyLayers } from './StudyLayers'
import { WhyWrongBox } from './WhyWrongBox'

export function CardReviewScreen() {
  const navigate = useNavigate()
  const { cardIdx } = useParams<{ cardIdx: string }>()
  const idx = parseInt(cardIdx ?? '0')

  const cards = useSessionStore((s) => s.cards)
  const shuffles = useSessionStore((s) => s.shuffles)
  const answers = useSessionStore((s) => s.answers)
  const results = useSessionStore((s) => s.results)

  const [showPearl, setShowPearl] = useState(false)

  const card = cards[idx]
  const shuffle = shuffles[idx]
  const studentPick = answers[idx]
  const wasCorrect = results[idx] === true

  if (!card || !shuffle) {
    return (
      <div className="content">
        <p className="err-msg">Card not found.</p>
        <button className="btn-ghost" onClick={() => navigate('/session/review')}>
          Back to Results
        </button>
      </div>
    )
  }

  const chosenText = studentPick !== undefined ? shuffle.opts[studentPick] ?? '' : ''

  return (
    <div className="content card-screen scrollable">
      {/* Back button */}
      <button
        className="back-btn"
        onClick={() => navigate('/session/review')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to Results
      </button>

      {/* Header */}
      <div className="card-hdr">
        <span className="xp-tag">+{card.xp} XP</span>
      </div>

      {/* Question card */}
      <div className="q-card">
        <div className="scenario-box">
          <div className="scenario-tag-label">📋 Scenario</div>
          <div>{card.scenario}</div>
        </div>
        <div className="q-text-main">{card.question}</div>
      </div>

      {/* Options — all disabled, highlighted based on correctness */}
      {shuffle.opts.map((optText, i) => {
        const isCorrect = i === shuffle.correct
        const isWrongPick = studentPick === i && !wasCorrect && !isCorrect
        const isDimmed = !isCorrect && !isWrongPick

        const optClasses = [
          'ans-opt',
          'disabled',
          isCorrect && 'correct',
          isWrongPick && 'wrong',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <div key={i} className="ans-row">
            <button
              className={optClasses}
              disabled
              style={isDimmed ? { opacity: 0.35 } : undefined}
            >
              {optText}
            </button>
          </div>
        )
      })}

      {/* Why wrong explanation (only if student answered wrong) */}
      <WhyWrongBox
        chosenText={chosenText}
        whyWrong={card.why_wrong ?? {}}
        visible={!wasCorrect && studentPick !== undefined}
      />

      {/* CCCC Layers (available for all cards in review mode) */}
      <div style={{ marginTop: 12 }}>
        <StudyLayers
          layers={card.layers ?? []}
          onAllUnlocked={() => setShowPearl(true)}
        />
      </div>

      {/* Pearl reveal after all layers unlocked */}
      {showPearl && (
        <PearlReveal
          lens={card.lens ?? ''}
          pearl={card.pearl ?? ''}
          mnemonic={card.mnemonic ?? []}
          isLastCard={false}
          onNext={() => navigate('/session/review')}
          nextLabel="Back to Results →"
        />
      )}
    </div>
  )
}
