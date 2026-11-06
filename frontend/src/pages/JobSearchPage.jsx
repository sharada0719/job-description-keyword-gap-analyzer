import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { jobSearchApi } from '../api/jobSearch.js'
import { applicationsApi } from '../api/applications.js'
import { useResumes } from '../hooks/useResumes.js'
import { analysisApi } from '../api/analysis.js'
import Spinner from '../components/common/Spinner.jsx'
import Alert from '../components/common/Alert.jsx'
import EmptyState from '../components/common/EmptyState.jsx'

const JOB_TYPE_FILTERS = [
  { value: 'internship',       label: 'Internship',      icon: '🎓' },
  { value: 'fresher',          label: 'Fresher / Entry',  icon: '🌱' },
  { value: 'graduate_trainee', label: 'Graduate Trainee', icon: '🎓' },
  { value: 'full_time',        label: 'Full-time',         icon: '💼' },
]

function BoardCard({ board }) {
  return (
    <a
      href={board.url}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-navy-500 border border-white/[0.07] rounded-xl p-4 hover:border-white/[0.15] transition-all duration-150 group cursor-pointer flex items-center gap-4"
    >
      <div className="w-10 h-10 rounded-lg bg-navy-400 border border-white/[0.08] flex items-center justify-center text-lg flex-shrink-0">
        {board.icon ?? '🔗'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white group-hover:text-primary-300 transition-colors">
          {board.label}
        </p>
        <p className="text-xs text-slate-500 truncate">{board.description}</p>
      </div>
      <span className="text-slate-600 group-hover:text-primary-400 transition-colors text-sm flex-shrink-0">↗</span>
    </a>
  )
}

function RoleCard({ rec, expanded, onToggle }) {
  const [saveState, setSaveState] = useState('idle')
  const [saveError, setSaveError] = useState('')
  const scoreColor =
    rec.score >= 0.7 ? 'text-emerald-400' :
    rec.score >= 0.4 ? 'text-amber-400' : 'text-slate-400'

  async function handleSave() {
    setSaveState('saving')
    setSaveError('')
    try {
      await applicationsApi.create({
        job_title:       rec.title,
        job_description: rec.description,
      })
      setSaveState('saved')
    } catch (err) {
      if (err?.response?.status === 409) {
        setSaveState('saved')
      } else {
        setSaveError(err?.response?.data?.message || 'Failed to save.')
        setSaveState('error')
      }
    }
  }

  return (
    <div className="bg-navy-500 border border-white/[0.07] rounded-xl p-4 space-y-3 hover:border-white/[0.12] transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-white">{rec.title}</h4>
          <p className="text-xs text-slate-500 mt-0.5 leading-snug">{rec.description}</p>
        </div>
        <span className={`text-xs font-bold flex-shrink-0 ${scoreColor}`}>{Math.round(rec.score * 100)}%</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {rec.tags.map((t) => (
          <span key={t} className="badge-gray text-[10px]">{t}</span>
        ))}
      </div>
      {rec.matched_skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {rec.matched_skills.map((s) => (
            <span key={s} className="badge-green text-[10px]">{s}</span>
          ))}
        </div>
      )}
      {/* Save + search links */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.05]">
        <button
          onClick={handleSave}
          disabled={saveState === 'saving' || saveState === 'saved'}
          className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
            saveState === 'saved'
              ? 'bg-emerald-500/15 text-emerald-400 cursor-default'
              : saveState === 'error'
              ? 'bg-coral-500/15 text-coral-400 hover:bg-coral-500/25'
              : 'bg-navy-400 text-slate-300 hover:text-white hover:bg-navy-300'
          }`}
        >
          {saveState === 'saving' ? <Spinner size="sm" /> :
           saveState === 'saved'  ? '✓ Saved to Tracker' :
           saveState === 'error'  ? '⚠ Try again' :
           '📋 Save to Tracker'}
        </button>
        <button
          onClick={() => onToggle(rec.title)}
          className="text-xs text-primary-400 hover:text-primary-300"
          aria-expanded={expanded}
        >
          {expanded ? '▲ Hide' : '▼ Job boards'}
        </button>
      </div>
      {saveError && <p className="text-xs text-coral-400">{saveError}</p>}
      {expanded && (
        <div className="flex flex-wrap gap-2">
          {rec.search_links.map((link) => (
            <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-navy-400 border border-white/[0.08] text-slate-300 hover:text-white hover:bg-navy-300 transition-colors">
              {link.label} ↗
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export default function JobSearchPage() {
  const location = useLocation()
  const navState = location.state || {}

  // ── Form state
  const [query,      setQuery]      = useState(navState.query || '')
  const [locationVal, setLocationVal] = useState(navState.location || '')
  const [remote,     setRemote]     = useState(false)
  const [jobTypes,   setJobTypes]   = useState(navState.jobTypes || [])
  const [resumeKeywords, setResumeKeywords] = useState(navState.resumeKeywords || [])
  const [selectedAnalysis, setSelectedAnalysis] = useState(navState.analysisId || null)
  const [expandedRoles,   setExpandedRoles]   = useState({})

  // ── Data state
  const [results, setResults]     = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error,   setError]      = useState('')

  // ── Resume selection for matching (optional)
  const { resumes } = useResumes()
  const [analyses, setAnalyses] = useState([])
  const [selectedResumeId, setSelectedResumeId] = useState('')

  // Load analyses when a resume is selected (to get keywords)
  useEffect(() => {
    if (!selectedResumeId) return
    analysisApi.list(0, 50).then((data) => {
      setAnalyses(data.filter((a) => a.resume_id === parseInt(selectedResumeId)))
    }).catch(() => {})
  }, [selectedResumeId])

  // ── Toggle a job type filter
  function toggleJobType(value) {
    setJobTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    )
  }

  function toggleRole(title) {
    setExpandedRoles((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  // ── Search
  async function handleSearch(e) {
    e?.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await jobSearchApi.search({
        query:          query.trim(),
        location:       locationVal.trim() || undefined,
        remote,
        job_types:      jobTypes,
        resume_keywords: resumeKeywords,
        max_results:    10,
      })
      setResults(data)
    } catch (err) {
      setError(err?.response?.data?.message || 'Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Apply analysis keywords
  function applyAnalysis(analysisId) {
    setSelectedAnalysis(analysisId)
    // Fetch the full analysis to get resume_keywords
    analysisApi.get(analysisId).then((data) => {
      setResumeKeywords(data.resume_keywords || [])
    }).catch(() => {})
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs text-primary-400 font-medium uppercase tracking-wider mb-1">Discover</p>
        <h1 className="page-title">Job &amp; Internship Search</h1>
        <p className="text-sm text-slate-500 mt-1">
          Search legitimate job boards for real opportunities. All links go to
          genuine listings — no fake jobs are generated.
        </p>
      </div>

      {/* Search form */}
      <div className="card space-y-5">
        {/* Query */}
        <div>
          <label htmlFor="search-query" className="label">Search</label>
          <div className="flex gap-2">
            <input
              id="search-query"
              type="text"
              className="input-field flex-1"
              placeholder="Job title, skill, or company (e.g. Python Developer, React, Google)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
            />
            <button onClick={handleSearch} className="btn-gradient" disabled={loading}>
              {loading ? <Spinner size="sm" /> : '🔍'}
            </button>
          </div>
        </div>

        {/* Filters row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="search-location" className="label">Location</label>
            <input
              id="search-location"
              type="text"
              className="input-field"
              placeholder="e.g. London, Remote, Mumbai"
              value={locationVal}
              onChange={(e) => setLocationVal(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer pb-2.5">
              <input
                type="checkbox"
                checked={remote}
                onChange={(e) => setRemote(e.target.checked)}
                className="rounded accent-primary-500"
              />
              Remote-friendly only
            </label>
          </div>
        </div>

        {/* Job type chips */}
        <div>
          <p className="label">Job Type</p>
          <div className="flex flex-wrap gap-2">
            {JOB_TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => toggleJobType(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                  jobTypes.includes(f.value)
                    ? 'bg-gradient-purple text-white border-transparent shadow-purple'
                    : 'bg-navy-500 text-slate-400 border-white/[0.08] hover:text-white hover:border-white/[0.15]'
                }`}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resume matching (optional) */}
        <div>
          <p className="label">Resume Matching (optional)</p>
          {!resumeKeywords.length ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Select a resume and analysis to match opportunities against your skills,
                or browse without matching.
              </p>
              <div className="flex flex-wrap gap-3 items-center">
                <select
                  className="input-field max-w-[200px] text-xs"
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                >
                  <option value="">— Select resume —</option>
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
                </select>
                {selectedResumeId && analyses.length > 0 && (
                  <select
                    className="input-field max-w-[200px] text-xs"
                    value={selectedAnalysis || ''}
                    onChange={(e) => applyAnalysis(e.target.value)}
                  >
                    <option value="">— Select analysis —</option>
                    {analyses.map((a) => (
                      <option key={a.id} value={a.id}>Analysis #{a.id} ({Math.round(a.overall_score * 100)}%)</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-navy-500 border border-white/[0.07] p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex flex-wrap gap-1.5">
                  {resumeKeywords.slice(0, 8).map((kw) => (
                    <span key={kw} className="badge-blue text-[10px]">{kw}</span>
                  ))}
                  {resumeKeywords.length > 8 && (
                    <span className="text-[10px] text-slate-500">+{resumeKeywords.length - 8} more</span>
                  )}
                </div>
                <button
                  onClick={() => setResumeKeywords([])}
                  className="text-xs text-slate-500 hover:text-coral-400 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && <Alert variant="error" message={error} />}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {/* Results */}
      {!loading && results && (
        <div className="space-y-6">
          {/* Board search links */}
          {results.board_results.length > 0 && (
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="section-title">Search on Job Boards</h2>
                <span className="text-xs text-slate-500">{results.board_results.length} boards</span>
              </div>
              <p className="text-xs text-slate-500">
                Click any board to see real, live search results for your query.
                These links open the board&apos;s own search page — no listings are fabricated.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.board_results.map((b) => (
                  <BoardCard key={b.board} board={{ ...b, icon: '🔗' }} />
                ))}
              </div>
            </div>
          )}

          {/* Resume-matched roles */}
          {results.has_resume_keywords && results.role_matches.length > 0 && (
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="section-title">Recommended Roles for Your Skills</h2>
                <span className="text-xs text-slate-500">{results.role_matches.length} matches</span>
              </div>
              <p className="text-xs text-slate-500">
                Based on your resume keywords. Match % reflects skill alignment —
                not a probability of being hired.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.role_matches.map((rec) => (
                  <RoleCard
                    key={rec.title}
                    rec={rec}
                    expanded={!!expandedRoles[rec.title]}
                    onToggle={toggleRole}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No role matches with resume keywords */}
          {results.has_resume_keywords && results.role_matches.length === 0 && (
            <div className="card">
              <EmptyState
                icon="🔍"
                title="No role matches found"
                description="No roles in our taxonomy matched your resume skills. Try the board search links above to explore broader opportunities."
              />
            </div>
          )}

          {/* Limitations */}
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 space-y-1">
            <p className="text-xs font-semibold text-amber-400">Important</p>
            {results.limitations.map((l, i) => (
              <p key={i} className="text-xs text-amber-300/80">• {l}</p>
            ))}
          </div>
        </div>
      )}

      {/* Not yet searched — empty state */}
      {!loading && !results && !error && (
        <div className="card">
          <EmptyState
            icon="🔍"
            title="Start your job search"
            description="Enter a job title, skill, or company above. Filter by type, location, and remote options. Optionally match against your resume."
          />
        </div>
      )}
    </div>
  )
}
