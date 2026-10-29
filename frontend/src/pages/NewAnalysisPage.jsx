import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { analysisApi } from '../api/analysis.js'
import { useResumes } from '../hooks/useResumes.js'
import { useJobs } from '../hooks/useJobs.js'
import Spinner from '../components/common/Spinner.jsx'
import Alert from '../components/common/Alert.jsx'

export default function NewAnalysisPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { resumes, loading: resumesLoading } = useResumes()
  const { jobs,    loading: jobsLoading }    = useJobs()

  const preselectedJobId = location.state?.jobId ? String(location.state.jobId) : ''

  const [resumeId, setResumeId] = useState('')
  const [jobId,    setJobId]    = useState(preselectedJobId)
  const [running,  setRunning]  = useState(false)
  const [error,    setError]    = useState('')

  const isLoading = resumesLoading || jobsLoading
  const canRun    = resumeId && jobId && !running

  async function handleRun(e) {
    e.preventDefault()
    if (!resumeId || !jobId) { setError('Please select both a resume and a job description.'); return }
    setRunning(true); setError('')
    try {
      const result = await analysisApi.run({
        resume_id: parseInt(resumeId, 10),
        job_description_id: parseInt(jobId, 10),
      })
      navigate(`/analysis/${result.id}`)
    } catch (err) {
      setError(err?.response?.data?.message || 'Analysis failed. Please try again.')
    } finally { setRunning(false) }
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <p className="text-xs text-primary-400 font-medium uppercase tracking-wider mb-1">Analysis</p>
        <h1 className="page-title">New Analysis</h1>
        <p className="text-sm text-slate-500 mt-1">
          Select a resume and job description to run an AI keyword-gap analysis.
        </p>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : (
          <form onSubmit={handleRun} noValidate className="space-y-5">
            <Alert message={error} variant="error" />

            <div>
              <label htmlFor="resume-select" className="label">Resume</label>
              {resumes.length === 0 ? (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-sm text-amber-300">
                  No resumes found.{' '}
                  <Link to="/resumes" className="underline text-amber-400 hover:text-amber-300">Upload one first →</Link>
                </div>
              ) : (
                <select
                  id="resume-select"
                  className="input-field"
                  value={resumeId}
                  onChange={(e) => setResumeId(e.target.value)}
                >
                  <option value="">— Select a resume —</option>
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label htmlFor="job-select" className="label">Job Description</label>
              {jobs.length === 0 ? (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-sm text-amber-300">
                  No job descriptions found.{' '}
                  <Link to="/jobs" className="underline text-amber-400 hover:text-amber-300">Add one first →</Link>
                </div>
              ) : (
                <select
                  id="job-select"
                  className="input-field"
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                >
                  <option value="">— Select a job description —</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}{j.company ? ` — ${j.company}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              type="submit"
              className="btn-gradient w-full justify-center py-3 text-base"
              disabled={!canRun || resumes.length === 0 || jobs.length === 0}
            >
              {running ? (
                <><Spinner size="sm" /> Analysing — this may take a moment…</>
              ) : (
                '⚡ Run Analysis'
              )}
            </button>

            {running && (
              <p className="text-xs text-slate-500 text-center">
                AI keyword extraction and semantic matching in progress…
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
