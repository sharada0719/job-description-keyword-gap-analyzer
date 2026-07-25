import React, { useEffect } from 'react'

/**
 * Centred modal confirmation dialog.
 *
 * Props
 *   title       – bold heading, e.g. "Delete Resume?"
 *   description – secondary text, e.g. "This action cannot be undone."
 *   confirmLabel – label for the destructive button (default "Delete")
 *   cancelLabel  – label for the safe button (default "Cancel")
 *   onConfirm   – called when the user clicks the destructive button
 *   onCancel    – called when the user clicks Cancel or the backdrop
 */
export default function ConfirmDialog({
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) {
  // Close on Escape key
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onCancel?.()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onCancel])

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      {/* Panel — stop click propagation so clicks inside don't close it */}
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5" aria-hidden="true">🗑</span>
          <div>
            <h2 id="confirm-title" className="text-base font-semibold text-gray-900">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="btn-danger"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
