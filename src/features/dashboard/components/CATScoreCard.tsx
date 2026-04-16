/**
 * CATScoreCard
 *
 * Shows the CAT score from diagnostic results with progress bar and passing line.
 *
 * Owner: Junior Engineer 5
 */

interface CATScoreCardProps {
  catLevel: string;
  catLabel: string;
  catSub: string;
  completed: boolean;
}

export function CATScoreCard({ catLevel, catLabel, catSub, completed }: CATScoreCardProps) {
  const fillPct = completed ? (parseFloat(catLevel) / 5) * 100 : 0

  return (
    <div className="cat-score-card">
      <div className="cat-score-label">Your CAT Score</div>
      <div className="cat-score-row">
        <div className="cat-score-number">{completed ? catLevel : '—'}</div>
        <div className="cat-score-desc">
          <strong>{completed ? catLabel : 'Complete your diagnostic'}</strong>
          <span>{completed ? catSub : 'to see your score'}</span>
        </div>
      </div>
      <div className="cat-prog-track">
        <div className="cat-prog-fill" style={{ width: `${fillPct}%` }} />
        <div className="cat-prog-marker" style={{ left: '60%' }} />
      </div>
      <div className="cat-prog-labels">
        <span>Level 1</span>
        <span className="pass-lbl">← Passing Line (Level 3)</span>
        <span>Level 5</span>
      </div>
    </div>
  )
}
