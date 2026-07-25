import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { resumesApi } from '../api/resumes.js'
import { jobsApi }    from '../api/jobs.js'
import { analysisApi } from '../api/analysis.js'
import Spinner from '../components/common/Spinner.jsx'
import { formatScore, scoreBgColour, formatDate } from '../utils/formatters.js'

function StatCard({ label, value, icon, linkTo }) {
  return (
    <Link to={linkTo} className="card hover:shadow-md transition-shadow flex items-center gap-4">
      <span className="text-3xl" aria-hidden="true">{icon}</span>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats,     setStats]     = useState({ resumes: 0, jobs: 0, analyses: 0 })
  const [recent,    setRecent]    = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      resumesApi.list(0, 100),
      jobsApi.list(0, 100),
      analysisApi.list(0, 5),
    ])
      .then(([resumeData, jobData, analysisData]) => {
        setStats({
          resumes:  resumeData.length,
          jobs:     jobData.length,
          analyses: analysisData.length,
        })
        setRecent(analysisData.slice(0, 5))
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here&apos;s an overview of your activity.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Resumes uploaded" value={stats.resumes}  icon="📄" linkTo="/resumes" />
        <StatCard label="Job descriptions" value={stats.jobs}     icon="💼" linkTo="/jobs" />
        <StatCard label="Analyses run"     value={stats.analyses} icon="📊" linkTo="/analysis" />
      </div>

      {/* Quick actions */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/resumes"     className="btn-secondary">📄 Upload Resume</Link>
          <Link to="/jobs"        className="btn-secondary">💼 Add Job Description</Link>
          <Link to="/analysis/new" className="btn-primary">⚡ Run Analysis</Link>
        </div>
      </div>

      {/* Recent analyses */}
      {recent.length > 0 && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Analyses</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 pr-4 font-medium">ID</th>
                  <th className="pb-2 pr-4 font-medium">Overall Score</th>
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recent.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 pr-4 text-gray-600">#{a.id}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${scoreBgColour(a.overall_score)}`}>
                        {formatScore(a.overall_score)}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-500">{formatDate(a.created_at)}</td>
                    <td className="py-2">
                      <Link
                        to={`/analysis/${a.id}`}
                        className="text-primary-600 hover:underline text-xs font-medium"
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
    </div>
  )
}
