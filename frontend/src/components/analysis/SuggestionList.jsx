import React from 'react'

export default function SuggestionList({ suggestions }) {
  if (!suggestions?.length) return null

  return (
    <div className="space-y-2">
      {suggestions.map((s, i) => (
        <div key={i} className="flex items-start gap-3 text-sm">
          <span className="flex-shrink-0 mt-0.5 text-primary-600" aria-hidden="true">💡</span>
          <span className="text-gray-700">{s}</span>
        </div>
      ))}
    </div>
  )
}
