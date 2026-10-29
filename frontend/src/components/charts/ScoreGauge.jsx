/**
 * Circular score gauge — CSS SVG, dark-theme aware.
 */
export default function ScoreGauge({ score, label }) {
  const pct  = Math.round((score ?? 0) * 100)
  const dash = 282 // circumference of r=45 circle
  const fill = (pct / 100) * dash
  const colour = score >= 0.75 ? '#22C55E' : score >= 0.5 ? '#F59E0B' : '#EF4444'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke={colour}
            strokeWidth="10"
            strokeDasharray={`${fill} ${dash}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.7s ease', filter: `drop-shadow(0 0 6px ${colour}60)` }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-white">
          {pct}%
        </span>
      </div>
      {label && <span className="text-xs text-slate-400 text-center leading-tight">{label}</span>}
    </div>
  )
}
