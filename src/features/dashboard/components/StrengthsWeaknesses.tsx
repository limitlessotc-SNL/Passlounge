/**
 * StrengthsWeaknesses
 *
 * Per-category accuracy bars sorted strongest to weakest.
 *
 * Owner: Junior Engineer 5
 */

interface CategoryAccuracy {
  cat: string;
  pct: number;
  icon: string;
}

interface StrengthsWeaknessesProps {
  categories: CategoryAccuracy[];
  completed: boolean;
}

export function StrengthsWeaknesses({ categories, completed }: StrengthsWeaknessesProps) {
  if (!completed) {
    return (
      <>
        <div className="dash-section-lbl">Strengths & Weaknesses</div>
        <div className="sw-card">
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '8px 0' }}>
            Complete your diagnostic to see your breakdown.
          </div>
        </div>
      </>
    )
  }

  const sorted = [...categories].sort((a, b) => b.pct - a.pct)

  return (
    <>
      <div className="dash-section-lbl">Strengths & Weaknesses</div>
      <div className="sw-card">
        {sorted.map((cat) => {
          const color = cat.pct >= 80 ? '#4ade80' : cat.pct >= 50 ? '#F5C518' : '#f87171'
          return (
            <div key={cat.cat} className="sw-row">
              <div className="sw-name">{cat.icon}&nbsp;{cat.cat}</div>
              <div className="sw-bar">
                <div className="sw-fill" style={{ width: `${cat.pct}%`, background: color }} />
              </div>
              <div className="sw-pct" style={{ color }}>{cat.pct}%</div>
            </div>
          )
        })}
      </div>
    </>
  )
}
