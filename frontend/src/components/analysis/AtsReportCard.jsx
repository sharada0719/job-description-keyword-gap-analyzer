import ScoreGauge from '../charts/ScoreGauge.jsx'
import Alert from '../common/Alert.jsx'

export default function AtsReportCard({ atsReport }) {
  if (!atsReport) {
    return (
      <div className="card">
        <h3 className="section-title mb-3">ATS Compatibility</h3>
        <Alert
          variant="info"
          message="ATS data not available — run a new analysis to see it."
        />
      </div>
    )
  }

  const passed = atsReport.passed
  const thresholdPct = Math.round((atsReport.threshold ?? 0.8) * 100)

  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="section-title">ATS Compatibility</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
          passed
            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
            : 'bg-amber-500/15 text-amber-400 border-amber-500/25'
        }`}>
          {passed ? '✓ ATS-Friendly' : `Below ${thresholdPct}% threshold`}
        </span>
      </div>

      {/* Score */}
      <div className="flex items-center gap-5">
        <div className="flex-shrink-0">
          <ScoreGauge score={atsReport.score} label="ATS Score" />
        </div>
        <div className="text-sm space-y-1.5">
          <p className="text-slate-300">
            Score <span className="font-bold text-white">{Math.round(atsReport.score * 100)}%</span>
            {' '}<span className="text-slate-500">(threshold {thresholdPct}%)</span>
          </p>
          <p className="text-slate-500 text-xs leading-relaxed max-w-xs">
            Independent of your job-match score. A high ATS score means the
            resume is parseable and well-structured.
          </p>
        </div>
      </div>

      {/* Checks */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Checks</p>
        <ul className="space-y-2">
          {atsReport.checks.map((c, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              <span className={`mt-0.5 text-base flex-shrink-0 ${c.passed ? 'text-emerald-400' : 'text-amber-400'}`}>
                {c.passed ? '✓' : '⚠'}
              </span>
              <span>
                <span className="font-medium text-slate-200">{c.name}</span>
                <span className="text-slate-500"> — {c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Warnings */}
      {atsReport.warnings?.length > 0 && (
        <div className="space-y-2">
          {atsReport.warnings.map((w, i) => (
            <Alert key={i} variant="warning" message={w} />
          ))}
        </div>
      )}

      {/* Recommendations */}
      {atsReport.recommendations?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Recommendations</p>
          <ul className="space-y-2">
            {atsReport.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="flex-shrink-0 mt-0.5 text-primary-400">💡</span>
                <span className="text-slate-300">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
