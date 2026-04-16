/**
 * CardBankProgress
 *
 * Shows card bank stats: seen, new, need review, progress bar.
 *
 * Owner: Junior Engineer 5
 */

interface CardBankProgressProps {
  totalCards: number;
  seenCount: number;
  reviewCount: number;
}

export function CardBankProgress({ totalCards, seenCount, reviewCount }: CardBankProgressProps) {
  const newCount = totalCards - seenCount
  const pct = totalCards > 0 ? Math.round((seenCount / totalCards) * 100) : 0

  return (
    <>
      <div className="setup-section-lbl">Card Bank</div>
      <div className="bank-prog-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Study Cards</span>
          <span style={{ fontSize: 12, fontWeight: 900, color: '#F5C518' }}>{pct}%</span>
        </div>
        <div className="bank-prog-bar">
          <div className="bank-prog-fill" style={{ width: `${pct}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: '#4ade80' }}>{seenCount} seen</span>
          <span style={{ fontSize: 10, color: '#F5C518' }}>{newCount} new</span>
          <span style={{ fontSize: 10, color: '#f87171' }}>{reviewCount} need review</span>
        </div>
      </div>
    </>
  )
}
