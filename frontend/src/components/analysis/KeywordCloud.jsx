import React from 'react'

/**
 * Renders two keyword pill clouds side-by-side:
 * green = matched, red = missing.
 */
export default function KeywordCloud({ matchedKeywords, missingKeywords }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Matched */}
      <div>
        <h4 className="text-sm font-semibold text-green-700 mb-3">
          ✅ Matched Keywords ({matchedKeywords.length})
        </h4>
        <div className="flex flex-wrap gap-2">
          {matchedKeywords.length === 0 && (
            <span className="text-sm text-gray-400">None found</span>
          )}
          {matchedKeywords.map((kw, i) => (
            <span
              key={i}
              title={`Score: ${Math.round(kw.score * 100)}%`}
              className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 cursor-default"
            >
              {kw.keyword}
            </span>
          ))}
        </div>
      </div>

      {/* Missing */}
      <div>
        <h4 className="text-sm font-semibold text-red-700 mb-3">
          ❌ Missing Keywords ({missingKeywords.length})
        </h4>
        <div className="flex flex-wrap gap-2">
          {missingKeywords.length === 0 && (
            <span className="text-sm text-gray-400">None! Great match.</span>
          )}
          {missingKeywords.map((kw, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
            >
              {kw}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
