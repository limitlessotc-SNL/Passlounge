/**
 * TodaysFocus
 *
 * Shows the top 3 weakest categories as today's study focus.
 *
 * Owner: Junior Engineer 5
 */

import { CATEGORY_ICONS } from '@/config/diagnostic-cards'

interface FocusCategory {
  cat: string;
  correct: number;
  total: number;
  pct: number;
}

interface TodaysFocusProps {
  categories: FocusCategory[];
  completed: boolean;
}

export function TodaysFocus({ categories, completed }: TodaysFocusProps) {
  if (!completed) {
    return (
      <>
        <div className="dash-section-lbl">Today&apos;s Focus</div>
        <div className="focus-card">
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '8px 0' }}>
            Complete your diagnostic to see recommendations.
          </div>
        </div>
      </>
    )
  }

  const sorted = [...categories].sort((a, b) => a.pct - b.pct).slice(0, 3)

  return (
    <>
      <div className="dash-section-lbl">Today&apos;s Focus</div>
      <div className="focus-card">
        {sorted.map((cat) => {
          const icon = CATEGORY_ICONS[cat.cat] ?? '📋'
          const badge = cat.pct < 50
            ? <div className="priority-badge pr-red">Priority</div>
            : cat.pct < 80
              ? <div className="priority-badge pr-yellow">Review</div>
              : <div className="priority-badge pr-green">Maintain</div>

          return (
            <div key={cat.cat} className="focus-row">
              <div className="focus-icon">{icon}</div>
              <div>
                <div className="focus-title">{cat.cat}</div>
                <div className="focus-sub">{cat.correct}/{cat.total} correct · Focus here</div>
              </div>
              {badge}
            </div>
          )
        })}
      </div>
    </>
  )
}
