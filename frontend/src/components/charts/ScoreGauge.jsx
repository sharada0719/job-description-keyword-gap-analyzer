import React from 'react'

/**
 * Simple circular score gauge — CSS-only, no canvas dependency.
 */
export default function ScoreGauge({ score, label }) {
  const pct  = Math.round((score ?? 0) * 100)
  const dash = 282 // circumference of r=45 circle
  const fill = (pct / 100) * dash
  const colour = score >= 0.75 ? '#22c55e' : score >= 0.5 ? '#eab308' : '#ef4444'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke={colour}
            strokeWidth="10"
            strokeDasharray={`${fill} ${dash}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-gray-900">
          {pct}%
        </span>
      </div>
      {label && <span className="text-xs text-gray-500 text-center">{label}</span>}
    </div>
  )
}
