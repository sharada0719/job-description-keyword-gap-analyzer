import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { resumesApi } from '../api/resumes.js'
import { jobsApi }    from '../api/jobs.js'
import { analysisApi } from '../api/analysis.js'
import Spinner from '../components/common/Spinner.jsx'
import { formatScore, formatDate } from '../utils/formatters.js'

function scoreColor(s) {
  if (s >= 0.75) return 'text-emerald-400'
  if (s >= 0.5)  return 'text-amber-400'
  return 'text-coral-400'
}
function scoreBadge(s) {
  if (s >= 0.75) return 'badge-green'
  if (s >= 0.5)  return 'badge-amber'
  return 'badge-red'
}

function StatCard({ label, value, icon, linkTo, accent }) {
  const accentMap = {
    purple: 'bg-primary-500/15 text-primary-400 border-primary-500/25',
    blue:   'bg-blue-500/15 text-blue-400 border-blue-500/25',
    green:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    amber:  'bg-amber-500/15 text-amber-400 border-amber-500/25',
  }
  return (
    <Link
      to={linkTo}
      className="card-hover flex items-center gap-4 group"
    >
      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl flex-shrink-0 ${accentMap[accent] ?? accentMap.purple}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const { user }  = useAuth()
  const firstName = user?.full_name?.split(' ')[0] ?? 'there'

  const [stats,   setStats]   = useState({ resumes: 0, jobs: 0, analyses: 0, bestScore: null })
  const [recent,  setRecent]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      resumesApi.list(0, 100),
      jobsApi.list(0, 100),
      analysisApi.list(0, 50),
    ])
      .then(([resumeData, jobData, analysisData]) => {
        const bestScore = analysisData.length
          ? Math.max(...analysisData.map((a) => a.overall_score))
          : null
        setStats({
          resumes:  resumeData.length,
          jobs:     jobData.length,
          analyses: analysisData.length,
          bestScore,
        })
        setRecent(analysisData.slice(0, 6))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Welcome */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-primary-400 font-medium uppercase tracking-wider mb-1">Dashboard</p>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {firstName} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Here's an overview of your career analysis activity.
          </p>
        </div>
        <Link to="/analysis/new" className="btn-gradient">
          ⚡ New Analysis
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Resumes uploaded"  value={stats.resumes}  icon="📄" linkTo="/resumes"  accent="blue"   />
        <StatCard label="Job descriptions"  value={stats.jobs}     icon="💼" linkTo="/jobs"      accent="purple" />
        <StatCard label="Analyses run"      value={stats.analyses} icon="📊" linkTo="/analysis"  accent="green"  />
        <StatCard
          label="Best match score"
          value={stats.bestScore != null ? formatScore(stats.bestScore) : '—'}
          icon="🏆"
          linkTo="/analysis"
          accent="amber"
        />
      </div>

      {/* Quick actions */}
      <div className="card">
        <h2 className="section-title mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/resumes"      className="btn-secondary">📄 Upload Resume</Link>
          <Link to="/jobs"         className="btn-secondary">💼 Add Job Description</Link>
          <Link to="/analysis/new" className="btn-gradient">⚡ Run Analysis</Link>
          <Link to="/analysis"     className="btn-secondary">📊 View History</Link>
        </div>
      </div>

      {/* Recent analyses */}
      {recent.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title">Recent Analyses</h2>
            <Link to="/analysis" className="text-xs text-primary-400 hover:underline">View all →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b border-white/[0.07]">
                  <th className="pb-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="pb-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
                  <th className="pb-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {recent.map((a) => (
                  <tr key={a.id} className="hover:bg-navy-500/40 transition-colors">
                    <td className="py-3 pr-4 text-slate-400 font-mono text-xs">#{a.id}</td>
                    <td className="py-3 pr-4">
                      <span className={`${scoreBadge(a.overall_score)}`}>
                        {formatScore(a.overall_score)}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-500 text-xs">{formatDate(a.created_at)}</td>
                    <td className="py-3">
                      <Link
                        to={`/analysis/${a.id}`}
                        className="text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state CTA */}
      {recent.length === 0 && (
        <div className="card text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-navy-500 border border-white/[0.07] flex items-center justify-center text-3xl mx-auto mb-4">
            📊
          </div>
          <h3 className="text-base font-semibold text-white mb-2">No analyses yet</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">
            Upload a resume, add a job description, then run your first analysis to see keyword gaps.
          </p>
          <Link to="/analysis/new" className="btn-gradient">⚡ Run Your First Analysis</Link>
        </div>
      )}
    </div>
  )
}
