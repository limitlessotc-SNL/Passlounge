/**
 * WhyWrongBox
 *
 * Shows the explanation for why the student's chosen answer was wrong.
 * Only visible when the student answered incorrectly and an explanation exists.
 *
 * Owner: Junior Engineer 3
 */

import { stripLabel } from '@/utils/shuffle'

interface WhyWrongBoxProps {
  chosenText: string;
  whyWrong: Record<string, string>;
  visible: boolean;
}

export function WhyWrongBox({ chosenText, whyWrong, visible }: WhyWrongBoxProps) {
  const stripped = stripLabel(chosenText)
  const explanation = whyWrong[stripped]

  if (!visible || !explanation) return null

  return (
    <div className="why-wrong-box visible">
      <div className="why-wrong-lbl">
        Why &quot;{stripped}&quot; is wrong
      </div>
      <div className="why-wrong-text">{explanation}</div>
    </div>
  )
}
