import React from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAnalysisDetail } from '../hooks/useAnalysis.js'
import { analysisApi } from '../api/analysis.js'
import Spinner from '../components/common/Spinner.jsx'
import Alert from '../components/common/Alert.jsx'
import ScoreSummaryCard from '../components/analysis/ScoreSummaryCard.jsx'
import KeywordCloud from '../components/analysis/KeywordCloud.jsx'
import SuggestionList from '../components/analysis/SuggestionList.jsx'
import ScoreRadarChart from '../components/charts/ScoreRadarChart.jsx'
import KeywordBarChart from '../components/charts/KeywordBarChart.jsx'
import { formatDate } from '../utils/formatters.js'

export default function AnalysisDetailPage() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { analysis, loading, error } = useAnalysisDetail(id)

  async function handleDelete() {
    if (!window.confirm('Delete this analysis?')) return
    try {
      await analysisApi.delete(id)
      navigate('/analysis')
    } catch {
      alert('Delete failed.')
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert message={error} variant="error" />
        <Link to="/analysis" className="mt-4 inline-block text-sm text-primary-600 hover:underline">
          ← Back to history
        </Link>
      </div>
    )
  }

  if (!analysis) return null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link to="/analysis" className="text-sm text-primary-600 hover:underline">
            ← Analysis History
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            Analysis #{analysis.id}
          </h1>
          <p className="text-sm text-gray-500">{formatDate(analysis.created_at)}</p>
        </div>
        <button onClick={handleDelete} className="btn-danger text-sm">
          🗑 Delete
        </button>
      </div>

      {/* Score summary */}
      <ScoreSummaryCard analysis={analysis} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Score Radar</h3>
          <ScoreRadarChart analysis={analysis} />
        </div>
        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Top Matched Keywords</h3>
          <KeywordBarChart matchedKeywords={analysis.matched_keywords} />
        </div>
      </div>

      {/* Keyword clouds */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Keyword Analysis</h3>
        <KeywordCloud
          matchedKeywords={analysis.matched_keywords}
          missingKeywords={analysis.missing_keywords}
        />
      </div>

      {/* Suggestions */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Improvement Suggestions
        </h3>
        <SuggestionList suggestions={analysis.suggestions} />
      </div>
    </div>
  )
}
