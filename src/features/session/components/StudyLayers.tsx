/**
 * StudyLayers
 *
 * 4-layer progressive unlock for the SNL Method (CCCC):
 * Core Problem → Complication → Connection → Confirmation
 *
 * Layer 1 is auto-revealed. Layers 2-4 require sequential tap.
 * After all 4 unlocked, onAllUnlocked fires to show pearl.
 *
 * Owner: Junior Engineer 3
 */

import { useCallback, useState } from 'react'

interface StudyLayersProps {
  layers: string[];
  onAllUnlocked: () => void;
}

const LAYER_NAMES = ['Core Problem', 'Complication', 'Connection', 'Confirmation']

export function StudyLayers({ layers, onAllUnlocked }: StudyLayersProps) {
  const [unlockedCount, setUnlockedCount] = useState(1)

  const handleUnlock = useCallback(
    (layerIdx: number) => {
      if (layerIdx !== unlockedCount) return
      const newCount = unlockedCount + 1
      setUnlockedCount(newCount)
      if (newCount === 4) {
        setTimeout(onAllUnlocked, 400)
      }
    },
    [unlockedCount, onAllUnlocked],
  )

  return (
    <div>
      <div className="snl-section-title">SNL Method Breakdown</div>

      {LAYER_NAMES.map((name, i) => {
        const isUnlocked = i < unlockedCount
        const isNext = i === unlockedCount
        const isLocked = i > unlockedCount
        const content = layers[i] ?? ''

        const btnClass = [
          'layer-btn',
          isUnlocked && 'unlocked',
          isNext && 'next-up',
        ]
          .filter(Boolean)
          .join(' ')

        const dotClass = [
          'layer-dot',
          isUnlocked && 'lit',
          isNext && 'next',
        ]
          .filter(Boolean)
          .join(' ')

        const nameClass = [
          'layer-name',
          isUnlocked && 'layer-name-open',
          isNext && 'layer-name-next',
          isLocked && 'layer-name-locked',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <div
            key={i}
            className={btnClass}
            onClick={isNext ? () => handleUnlock(i) : undefined}
            style={{ cursor: isNext ? 'pointer' : 'default' }}
            data-testid={`layer-${i}`}
          >
            <div className={dotClass} />
            <div style={{ flex: 1 }}>
              <div className={nameClass}>{name}</div>
              {isUnlocked && (
                <div className="layer-content">{content}</div>
              )}
              {isNext && (
                <div className="layer-hint">Tap to unlock →</div>
              )}
              {isLocked && (
                <div className="layer-locked-text">
                  🔒 Unlock {LAYER_NAMES[i - 1]} first
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
