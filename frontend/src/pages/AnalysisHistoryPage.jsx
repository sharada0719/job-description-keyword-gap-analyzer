import React from 'react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useAnalysisList } from '../hooks/useAnalysis.js'
import Spinner from '../components/common/Spinner.jsx'
import Alert from '../components/common/Alert.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import ConfirmDialog from '../components/common/ConfirmDialog.jsx'
import { formatScore, scoreBgColour, formatDate } from '../utils/formatters.js'

export default function AnalysisHistoryPage() {
  const { analyses, loading, error, deleteAnalysis } = useAnalysisList()
  const [confirmId, setConfirmId] = useState(null)

  async function handleDelete(id) {
    try { await deleteAnalysis(id) }
    catch { /* intentional */ }
    finally { setConfirmId(null) }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analysis History</h1>
        <Link to="/analysis/new" className="btn-primary">⚡ New Analysis</Link>
      </div>

      <div className="card">
        {loading && <div className="flex justify-center py-10"><Spinner /></div>}
        {error   && <Alert message={error} variant="error" />}
        {!loading && !error && analyses.length === 0 && (
          <EmptyState
            icon="📊"
            title="No analyses yet"
            description="Run your first analysis to see your keyword gap."
            action={<Link to="/analysis/new" className="btn-primary">⚡ Run Analysis</Link>}
          />
        )}
        {!loading && analyses.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 pr-4 font-medium">ID</th>
                  <th className="pb-2 pr-4 font-medium">Overall Score</th>
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {analyses.map((a) => (
                  <tr key={a.id}>
                    <td className="py-3 pr-4 text-gray-600">#{a.id}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${scoreBgColour(a.overall_score)}`}>
                        {formatScore(a.overall_score)}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{formatDate(a.created_at)}</td>
                    <td className="py-3 pr-4">
                      {confirmId === a.id ? (
                        <ConfirmDialog
                          message="Delete?"
                          onConfirm={() => handleDelete(a.id)}
                          onCancel={() => setConfirmId(null)}
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <Link to={`/analysis/${a.id}`} className="text-primary-600 hover:underline font-medium">
                            View
                          </Link>
                          <button
                            onClick={() => setConfirmId(a.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
