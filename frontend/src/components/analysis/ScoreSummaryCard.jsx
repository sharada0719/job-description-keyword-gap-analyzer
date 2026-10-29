import ScoreGauge from '../charts/ScoreGauge.jsx'

export default function ScoreSummaryCard({ analysis }) {
  const hasAts = Boolean(analysis.ats_report)

  return (
    <div className="card">
      <h3 className="section-title mb-6">Score Breakdown</h3>
      <div className={`grid ${hasAts ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'} gap-6 justify-items-center`}>
        <ScoreGauge score={analysis.overall_score}             label="Overall Match"      />
        <ScoreGauge score={analysis.semantic_similarity_score} label="Semantic Similarity" />
        <ScoreGauge score={analysis.keyword_match_score}       label="Keyword Match"       />
        {hasAts && (
          <ScoreGauge score={analysis.ats_report.score} label="ATS Compatibility" />
        )}
      </div>
      <p className="mt-5 text-xs text-slate-500 text-center border-t border-white/[0.06] pt-4">
        Job-match % is not a probability of selection · ATS score is not a guarantee of an interview
      </p>
    </div>
  )
}
