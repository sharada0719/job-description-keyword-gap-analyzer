import React from 'react'
import ScoreGauge from '../charts/ScoreGauge.jsx'

export default function ScoreSummaryCard({ analysis }) {
  return (
    <div className="card">
      <h3 className="text-base font-semibold text-gray-900 mb-6">Score Breakdown</h3>
      <div className="grid grid-cols-3 gap-4 justify-items-center">
        <ScoreGauge score={analysis.overall_score}              label="Overall"            />
        <ScoreGauge score={analysis.semantic_similarity_score}  label="Semantic Similarity" />
        <ScoreGauge score={analysis.keyword_match_score}        label="Keyword Match"       />
      </div>
    </div>
  )
}
