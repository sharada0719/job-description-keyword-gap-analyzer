import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAnalysisList } from '../hooks/useAnalysis.js'
import Spinner from '../components/common/Spinner.jsx'
import Alert from '../components/common/Alert.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import ConfirmDialog from '../components/common/ConfirmDialog.jsx'
import { formatScore, formatDate } from '../utils/formatters.js'

function scoreBadge(s) {
  if (s >= 0.75) return 'badge-green'
  if (s >= 0.5)  return 'badge-amber'
  return 'badge-red'
}

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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-primary-400 font-medium uppercase tracking-wider mb-1">History</p>
          <h1 className="page-title">Analysis History</h1>
        </div>
        <Link to="/analysis/new" className="btn-gradient">⚡ New Analysis</Link>
      </div>

      <div className="card">
        {loading && <div className="flex justify-center py-10"><Spinner /></div>}
        {error   && <Alert message={error} variant="error" />}
        {!loading && !error && analyses.length === 0 && (
          <EmptyState
            icon="📊" title="No analyses yet"
            description="Run your first analysis to see your keyword gap."
            action={<Link to="/analysis/new" className="btn-gradient">⚡ Run Analysis</Link>}
          />
        )}
        {!loading && analyses.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b border-white/[0.07]">
                  <th className="pb-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="pb-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
                  <th className="pb-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {analyses.map((a) => (
                  <tr key={a.id} className="hover:bg-navy-500/40 transition-colors">
                    <td className="py-3 pr-4 text-slate-400 font-mono text-xs">#{a.id}</td>
                    <td className="py-3 pr-4">
                      <span className={scoreBadge(a.overall_score)}>{formatScore(a.overall_score)}</span>
                    </td>
                    <td className="py-3 pr-4 text-slate-500 text-xs">{formatDate(a.created_at)}</td>
                    <td className="py-3">
                      {confirmId === a.id ? (
                        <ConfirmDialog
                          title="Delete analysis?"
                          description="This cannot be undone."
                          onConfirm={() => handleDelete(a.id)}
                          onCancel={() => setConfirmId(null)}
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <Link to={`/analysis/${a.id}`} className="text-xs font-medium text-primary-400 hover:text-primary-300">View →</Link>
                          <button onClick={() => setConfirmId(a.id)} className="text-xs text-slate-500 hover:text-coral-400 transition-colors">Delete</button>
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
