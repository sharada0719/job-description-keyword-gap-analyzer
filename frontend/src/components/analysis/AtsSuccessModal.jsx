import { useEffect, useRef } from 'react'
import ScoreGauge from '../charts/ScoreGauge.jsx'

export default function AtsSuccessModal({ open, atsReport, jobMatchScore, onClose }) {
  const closeBtnRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', handleKey)
    closeBtnRef.current?.focus()
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open || !atsReport) return null

  const pct          = Math.round((atsReport.score ?? 0) * 100)
  const thresholdPct = Math.round((atsReport.threshold ?? 0.8) * 100)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ats-success-title"
    >
      <div
        className="bg-navy-600 border border-white/[0.1] rounded-2xl shadow-card-lg w-full max-w-lg p-6 sm:p-8 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-2xl flex-shrink-0">
            🎉
          </div>
          <div>
            <h2 id="ats-success-title" className="text-lg font-bold text-white">
              Your resume is ATS-friendly!
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Passed our ATS compatibility checks. Review the recommendations
              below to further improve your job alignment.
            </p>
          </div>
        </div>

        {/* Score row */}
        <div className="flex items-center gap-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
          <div className="w-20 h-20 flex-shrink-0">
            <ScoreGauge score={atsReport.score} label="ATS" />
          </div>
          <div className="text-sm space-y-1">
            <p className="text-slate-300">
              <span className="font-bold text-white text-base">{pct}%</span>
              {' '}ATS compatibility
              {' '}<span className="text-slate-500">(threshold {thresholdPct}%)</span>
            </p>
            <p className="text-xs text-slate-500">
              This is not a guarantee of an interview. It confirms the resume
              is parseable and well-structured.
            </p>
          </div>
        </div>

        {/* Job-match note */}
        {jobMatchScore != null && (
          <div className="text-sm text-slate-400 rounded-xl bg-navy-500 border border-white/[0.07] px-4 py-3">
            Your job-match score is{' '}
            <span className="font-semibold text-white">{Math.round(jobMatchScore * 100)}%</span>.
            {' '}ATS compatibility and job-match are measured independently.
          </div>
        )}

        {/* Recommendations preview */}
        {atsReport.recommendations?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quick Recommendations</p>
            <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {atsReport.recommendations.slice(0, 4).map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="flex-shrink-0 mt-0.5 text-primary-400">💡</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action */}
        <div className="flex justify-end pt-1">
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="btn-gradient"
            aria-label="Close ATS success dialog"
          >
            Got it ✓
          </button>
        </div>
      </div>
    </div>
  )
}
