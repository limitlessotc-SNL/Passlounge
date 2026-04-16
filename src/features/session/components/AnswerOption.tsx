/**
 * AnswerOption
 *
 * Single answer option with strike-through elimination button.
 * Handles selected, struck, correct, wrong, disabled states.
 *
 * Owner: Junior Engineer 3
 */

interface AnswerOptionProps {
  index: number;
  text: string;
  isSelected: boolean;
  isStruck: boolean;
  isCorrect: boolean;
  isWrong: boolean;
  isDisabled: boolean;
  onSelect: (index: number) => void;
  onStrike: (index: number) => void;
}

export function AnswerOption({
  index,
  text,
  isSelected,
  isStruck,
  isCorrect,
  isWrong,
  isDisabled,
  onSelect,
  onStrike,
}: AnswerOptionProps) {
  const optClasses = [
    'ans-opt',
    isSelected && 'selected-opt',
    isStruck && 'struck',
    isCorrect && 'correct',
    isWrong && 'wrong',
    isDisabled && 'disabled',
  ]
    .filter(Boolean)
    .join(' ')

  const strikeClasses = ['strike-btn', isStruck && 'struck'].filter(Boolean).join(' ')

  return (
    <div className="ans-row">
      <button
        className={strikeClasses}
        onClick={() => onStrike(index)}
        disabled={isDisabled}
        aria-label={`Strike out option ${index + 1}`}
      >
        ✕
      </button>
      <button
        className={optClasses}
        onClick={() => !isStruck && onSelect(index)}
        disabled={isDisabled}
      >
        {text}
      </button>
    </div>
  )
}
