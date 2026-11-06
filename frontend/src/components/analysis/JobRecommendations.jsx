import { useState } from 'react'
import { recommendationsApi } from '../../api/recommendations.js'
import { applicationsApi } from '../../api/applications.js'
import Spinner from '../common/Spinner.jsx'
import Alert from '../common/Alert.jsx'

const TAG_STYLES = {
  internship:         'badge-purple',
  'full-time':        'badge-blue',
  'fresher-friendly': 'badge-green',
  'graduate-trainee': 'badge-amber',
}

function TagBadge({ tag }) {
  const cls = TAG_STYLES[tag]
  if (!cls) return null
  const labels = {
    internship:         'Internship',
    'full-time':        'Full-time',
    'fresher-friendly': 'Fresher-friendly',
    'graduate-trainee': 'Graduate',
  }
  return <span className={cls}>{labels[tag] ?? tag}</span>
}

function RoleCard({ rec }) {
  const [expanded, setExpanded] = useState(false)
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
  const [saveError, setSaveError] = useState('')
  const scoreColor =
    rec.score >= 0.7 ? 'text-emerald-400' :
    rec.score >= 0.4 ? 'text-amber-400' : 'text-slate-400'

  async function handleSave() {
    setSaveState('saving')
    setSaveError('')
    try {
      // Save the role as a tracked application. Role recommendations are
      // suggested job roles — NOT specific job listings — so we don't invent
      // company names, locations, or treat search-link URLs as application URLs.
      await applicationsApi.create({
        job_title:       rec.title,
        job_description: rec.description,
      })
      setSaveState('saved')
    } catch (err) {
      if (err?.response?.status === 409) {
        setSaveState('saved')  // Already saved — treat as success
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
          <h4 className="text-sm font-semibold text-white truncate">{rec.title}</h4>
          <p className="text-xs text-slate-500 mt-0.5 leading-snug">{rec.description}</p>
        </div>
        <span className={`text-xs font-bold flex-shrink-0 ${scoreColor}`}>
          {Math.round(rec.score * 100)}%
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {rec.tags.map((t) => <TagBadge key={t} tag={t} />)}
      </div>

      {rec.matched_skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {rec.matched_skills.map((s) => (
            <span key={s} className="badge-gray">{s}</span>
          ))}
        </div>
      )}

      {/* Save to Tracker + search links */}
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
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
          aria-expanded={expanded}
        >
          {expanded ? '▲ Hide' : '▼ Job boards'}
        </button>
      </div>

      {saveError && <p className="text-xs text-coral-400">{saveError}</p>}

      {expanded && (
        <div className="flex flex-wrap gap-2">
          {rec.search_links.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs font-medium
                         bg-navy-400 border border-white/[0.08]
                         text-slate-300 hover:text-white hover:bg-navy-300
                         transition-colors"
            >
              {link.label} ↗
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export default function JobRecommendations({ analysisId }) {
  const [state,          setState]         = useState('idle')
  const [data,           setData]          = useState(null)
  const [errorMsg,       setErrorMsg]      = useState('')
  const [location,       setLocation]      = useState('')
  const [showInternships, setShowInternships] = useState(true)
  const [showFulltime,    setShowFulltime]    = useState(true)

  async function handleFetch() {
    setState('loading')
    setErrorMsg('')
    try {
      const result = await recommendationsApi.get({
        analysis_id:         analysisId,
        location:            location.trim() || undefined,
        include_internships: showInternships,
        include_fulltime:    showFulltime,
        max_results:         8,
      })
      setData(result)
      setState('done')
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to load recommendations.')
      setState('error')
    }
  }

  return (
    <div className="card space-y-5">
      <div>
        <h3 className="section-title">Job &amp; Internship Recommendations</h3>
        <p className="text-xs text-slate-500 mt-1">
          Based on skills detected in your resume. All links go to legitimate job boards —
          no fake listings are generated.
        </p>
      </div>

      {state !== 'done' && (
        <div className="space-y-4">
          <div>
            <label className="label text-xs" htmlFor="rec-location">Location preference (optional)</label>
            <input
              id="rec-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. London, Remote, Mumbai"
              className="input-field max-w-xs text-sm"
            />
          </div>
          <div className="flex gap-5 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showInternships}
                onChange={(e) => setShowInternships(e.target.checked)}
                className="rounded accent-primary-500"
              />
              Internships
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showFulltime}
                onChange={(e) => setShowFulltime(e.target.checked)}
                className="rounded accent-primary-500"
              />
              Full-time / Graduate
            </label>
          </div>
          <button
            onClick={handleFetch}
            disabled={state === 'loading' || (!showInternships && !showFulltime)}
            className="btn-gradient disabled:opacity-50"
          >
            {state === 'loading' ? <><Spinner size="sm" /> Finding roles…</> : '🔍 Find Matching Roles'}
          </button>
        </div>
      )}

      {state === 'error' && <Alert variant="error" message={errorMsg} />}

      {state === 'done' && data && (
        <div className="space-y-4">
          {data.recommendations.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">No specific role matches found. Browse boards directly:</p>
              <div className="flex flex-wrap gap-2">
                {data.top_boards.map((b) => (
                  <a key={b.label} href={b.url} target="_blank" rel="noopener noreferrer"
                    className="badge-gray hover:border-white/20 transition-colors cursor-pointer">
                    {b.label} ↗
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.recommendations.map((rec) => (
                  <RoleCard key={rec.title} rec={rec} />
                ))}
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Explore all opportunities</p>
                <div className="flex flex-wrap gap-2">
                  {data.top_boards.map((b) => (
                    <a key={b.label} href={b.url} target="_blank" rel="noopener noreferrer"
                      className="badge-gray hover:border-white/20 transition-colors cursor-pointer">
                      {b.label} ↗
                    </a>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 space-y-1">
                <p className="text-xs font-semibold text-amber-400">Important</p>
                {data.limitations.map((l, i) => (
                  <p key={i} className="text-xs text-amber-300/80">• {l}</p>
                ))}
              </div>

              <button
                onClick={() => { setState('idle'); setData(null) }}
                className="text-xs text-slate-500 hover:text-slate-300 underline transition-colors"
              >
                Adjust preferences and search again
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
