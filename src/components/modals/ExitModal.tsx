/**
 * ExitModal
 *
 * "Exit Session?" confirmation modal shown when user tries to leave
 * a session mid-progress. Matches original HTML exit-modal.
 *
 * Owner: Junior Engineer 3
 */

interface ExitModalProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ExitModal({
  visible,
  title = 'Exit Session?',
  subtitle = 'Your answers so far have been saved. You can review them anytime from your dashboard.',
  cancelLabel = 'Keep Going',
  confirmLabel = 'Exit',
  onCancel,
  onConfirm,
}: ExitModalProps) {
  if (!visible) return null

  return (
    <div className="exit-modal-overlay visible" onClick={onCancel}>
      <div className="exit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="exit-modal-title">{title}</div>
        <div className="exit-modal-sub">{subtitle}</div>
        <div className="exit-modal-btns">
          <button className="exit-modal-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="exit-modal-confirm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
