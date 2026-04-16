/**
 * StatsGrid
 *
 * 4-stat grid: Cards Studied, Avg Accuracy, XP Earned, Sessions Done.
 *
 * Owner: Junior Engineer 5
 */

interface StatsGridProps {
  cardsStudied: number;
  accuracy: string;
  xpEarned: number;
  sessionsDone: number;
}

export function StatsGrid({ cardsStudied, accuracy, xpEarned, sessionsDone }: StatsGridProps) {
  return (
    <div className="dash-stats">
      <div className="dash-stat">
        <div className="dash-stat-val">{cardsStudied}</div>
        <div className="dash-stat-lbl">Cards Studied</div>
      </div>
      <div className="dash-stat">
        <div className="dash-stat-val">{accuracy}</div>
        <div className="dash-stat-lbl">Avg Accuracy</div>
      </div>
      <div className="dash-stat">
        <div className="dash-stat-val">{xpEarned}</div>
        <div className="dash-stat-lbl">XP Earned</div>
      </div>
      <div className="dash-stat">
        <div className="dash-stat-val">{sessionsDone}</div>
        <div className="dash-stat-lbl">Sessions Done</div>
      </div>
    </div>
  )
}
