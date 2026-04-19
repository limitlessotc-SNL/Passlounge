/**
 * PearlReveal
 *
 * Shows after all 4 CCCC layers are unlocked:
 * - Clinical Lens badge
 * - Coach's Pearl with mnemonic
 * - Next Card button
 *
 * Owner: Junior Engineer 3
 */

interface PearlRevealProps {
  lens: string;
  pearl: string;
  mnemonic: [string, string][];
  isLastCard: boolean;
  onNext: () => void;
  /** Optional override for the button label (e.g. "Back to Results →" for review mode). */
  nextLabel?: string;
}

export function PearlReveal({ lens, pearl, mnemonic, isLastCard, onNext, nextLabel }: PearlRevealProps) {
  const buttonLabel = nextLabel ?? (isLastCard ? 'Complete Session →' : 'Next Card →')
  return (
    <div className="anim" style={{ animationDelay: '0.1s' }}>
      {/* Clinical Lens */}
      <div className="lens-reveal">
        <div className="lens-hdr">Clinical Lens Identified</div>
        <div className="lens-badge">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <circle cx="5" cy="5" r="4" stroke="#60a5fa" strokeWidth="1.2" />
            <circle cx="5" cy="5" r="1.5" fill="#60a5fa" />
          </svg>
          <span className="lens-name">{lens}</span>
        </div>
      </div>

      {/* Coach's Pearl */}
      <div className="pearl-section">
        <div className="pearl-hdr">
          <div className="pearl-anim-dot" />
          Coach&apos;s Pearl
        </div>
        <div className="pearl-content">{pearl}</div>

        {mnemonic.length > 0 && (
          <div className="mnemonic">
            {mnemonic.map(([letter, word], i) => (
              <span key={i}>
                <span className="m-letter">{letter}</span>
                <span className="m-word">{word}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Next Card Button */}
      <button className="btn-gold" onClick={onNext}>
        {buttonLabel}
      </button>
    </div>
  )
}
