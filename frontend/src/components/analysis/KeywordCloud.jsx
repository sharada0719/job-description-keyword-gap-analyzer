/**
 * KeywordCloud — dark-theme pill clouds for matched / missing keywords.
 * match_type: "exact" → green, "semantic" → blue, "uncertain" → amber
 * Backward-compatible with legacy {keyword,score} records (no match_type).
 */
function matchedPillClass(kw) {
  if (kw.match_type === 'exact')     return 'badge-green'
  if (kw.match_type === 'semantic')  return 'badge-blue'
  if (kw.match_type === 'uncertain') return 'badge-amber'
  if (kw.score >= 0.75) return 'badge-green'
  if (kw.score >= 0.5)  return 'badge-amber'
  return 'badge-red'
}

function matchedBadgeLabel(kw) {
  if (kw.match_type === 'exact')     return 'exact'
  if (kw.match_type === 'semantic')  return 'semantic'
  if (kw.match_type === 'uncertain') return 'uncertain'
  return null
}

export default function KeywordCloud({ matchedKeywords, missingKeywords }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Matched */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-emerald-400 text-base">✓</span>
          <h4 className="text-sm font-semibold text-emerald-400">
            Matched ({matchedKeywords.length})
          </h4>
        </div>
        <div className="flex flex-wrap gap-2">
          {matchedKeywords.length === 0 && (
            <span className="text-sm text-slate-500">None found</span>
          )}
          {matchedKeywords.map((kw, i) => {
            const badge = matchedBadgeLabel(kw)
            const tip = kw.evidence
              ? `Evidence: "${kw.evidence}"`
              : `Score: ${Math.round((kw.score ?? 0) * 100)}%`
            return (
              <span key={i} title={tip} className={`${matchedPillClass(kw)} cursor-default`}>
                {kw.keyword}
                {badge && (
                  <span className="ml-1 text-[9px] font-normal opacity-60">{badge}</span>
                )}
              </span>
            )
          })}
        </div>
        <p className="mt-3 text-[10px] text-slate-600">
          exact = verbatim/alias · semantic = strong match · uncertain = borderline
        </p>
      </div>

      {/* Not found */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-coral-400 text-base">✕</span>
          <h4 className="text-sm font-semibold text-coral-400">
            Not Found in Resume ({missingKeywords.length})
          </h4>
        </div>
        <div className="flex flex-wrap gap-2">
          {missingKeywords.length === 0 && (
            <span className="text-sm text-slate-500">None — great match!</span>
          )}
          {missingKeywords.map((kw, i) => (
            <span key={i} className="badge-red">{kw}</span>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-slate-600">
          Not found in resume text — this does not mean you lack the skill.
        </p>
      </div>
    </div>
  )
}
