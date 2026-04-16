/**
 * SessionNameModal
 *
 * Optional session naming modal shown before starting a study session.
 * Matches original HTML session-name-overlay.
 *
 * Owner: Junior Engineer 3
 */

import { useState } from 'react'

interface SessionNameModalProps {
  visible: boolean;
  onStart: (name: string) => void;
  onCancel: () => void;
}

export function SessionNameModal({ visible, onStart, onCancel }: SessionNameModalProps) {
  const [name, setName] = useState('')

  if (!visible) return null

  const handleSkip = () => {
    setName('')
    onStart('')
  }

  const handleStart = () => {
    onStart(name.trim())
    setName('')
  }

  return (
    <div className="session-name-overlay visible" onClick={onCancel}>
      <div className="session-name-box" onClick={(e) => e.stopPropagation()}>
        <button className="session-name-close" onClick={onCancel} title="Go back">
          &#x2715;
        </button>
        <div className="session-name-title">Name This Session</div>
        <div className="session-name-sub">
          Optional — helps you find it in My Progress later.
        </div>
        <input
          className="session-name-input"
          type="text"
          maxLength={40}
          placeholder="e.g. Week 2 Review..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <div className="session-name-btns">
          <button className="session-name-skip" onClick={handleSkip}>
            Skip
          </button>
          <button className="session-name-start" onClick={handleStart}>
            Start →
          </button>
        </div>
      </div>
    </div>
  )
}
