import React from 'react'

/**
 * Lightweight inline confirmation dialog (not a modal portal).
 * Renders inline where it's placed — suitable for table row confirmations.
 */
export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-gray-700">{message}</span>
      <button
        onClick={onConfirm}
        className="text-red-600 font-medium hover:underline"
      >
        Delete
      </button>
      <button
        onClick={onCancel}
        className="text-gray-500 hover:underline"
      >
        Cancel
      </button>
    </div>
  )
}
