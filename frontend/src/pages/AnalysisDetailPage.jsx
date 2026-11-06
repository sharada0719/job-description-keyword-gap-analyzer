import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAnalysisDetail } from '../hooks/useAnalysis.js'
import { analysisApi } from '../api/analysis.js'
import { jobsApi } from '../api/jobs.js'
import Spinner from '../components/common/Spinner.jsx'
import Alert from '../components/common/Alert.jsx'
import ScoreSummaryCard from '../components/analysis/ScoreSummaryCard.jsx'
import KeywordCloud from '../components/analysis/KeywordCloud.jsx'
import SuggestionList from '../components/analysis/SuggestionList.jsx'
import AtsReportCard from '../components/analysis/AtsReportCard.jsx'
import AtsSuccessModal from '../components/analysis/AtsSuccessModal.jsx'
import JobRecommendations from '../components/analysis/JobRecommendations.jsx'
import CoverLetterModal from '../components/analysis/CoverLetterModal.jsx'
import ScoreRadarChart from '../components/charts/ScoreRadarChart.jsx'
import KeywordBarChart from '../components/charts/KeywordBarChart.jsx'
import { formatDate } from '../utils/formatters.js'

const TABS = ['Overview', 'Skills', 'ATS', 'Suggestions', 'Roles', 'Cover Letter']

export default function AnalysisDetailPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { analysis, loading, error } = useAnalysisDetail(id)

  const [activeTab,    setActiveTab]    = useState('Overview')
  const [showAtsModal, setShowAtsModal] = useState(false)
  const [showCoverLetter, setShowCoverLetter] = useState(false)
  const [jobDetails,   setJobDetails]   = useState(null)

  // Show ATS success popup once per analysis per session
  useEffect(() => {
    if (!analysis?.ats_report) return
    const flag = `ats_popup_${analysis.id}`
    if (analysis.ats_report.passed && !sessionStorage.getItem(flag)) {
      setShowAtsModal(true)
    }
  }, [analysis])

  // Fetch job description details for the Cover Letter tab
  useEffect(() => {
    if (activeTab !== 'Cover Letter' || !analysis?.job_description_id || jobDetails) return
    jobsApi.get(analysis.job_description_id).then(setJobDetails).catch(() => {})
  }, [activeTab, analysis]) // eslint-disable-line react-hooks/exhaustive-deps

  function closeAtsModal() {
    setShowAtsModal(false)
    if (analysis?.id) sessionStorage.setItem(`ats_popup_${analysis.id}`, '1')
  }

  function handleFindJobs() {
    navigate('/jobs/search', {
      state: {
        resumeKeywords: analysis?.resume_keywords || [],
        analysisId: analysis?.id,
        query: analysis?.job_keywords?.[0] || '',
      },
    })
  }

  async function handleDelete() {
    if (!window.confirm('Delete this analysis?')) return
    try {
      await analysisApi.delete(id)
      navigate('/analysis')
    } catch { alert('Delete failed.') }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Alert message={error} variant="error" />
        <Link to="/analysis" className="text-sm text-primary-400 hover:underline">← Back to history</Link>
      </div>
    )
  }
  if (!analysis) return null

  const ats = analysis.ats_report

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link to="/analysis" className="text-xs text-slate-500 hover:text-primary-400 transition-colors">
            ← Analysis History
          </Link>
          <h1 className="mt-1.5 text-2xl font-bold text-white">Analysis #{analysis.id}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{formatDate(analysis.created_at)}</p>
        </div>
        <button onClick={handleDelete} className="btn-danger text-xs px-3 py-1.5">
          🗑 Delete
        </button>
      </div>

      {/* Score summary — always visible */}
      <ScoreSummaryCard analysis={analysis} />

      {/* ATS below-threshold banner */}
      {ats && !ats.passed && (
        <Alert
          variant="warning"
          message={`ATS score ${Math.round(ats.score * 100)}% is below the ${Math.round(ats.threshold * 100)}% threshold. Check the ATS tab for recommendations.`}
        />
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-navy-800 p-1 rounded-xl border border-white/[0.06] overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-[80px] px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap ${
              activeTab === tab
                ? 'bg-gradient-purple text-white shadow-purple'
                : 'text-slate-400 hover:text-white hover:bg-navy-500'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Overview ────────────────────────────────────────────────────── */}
      {activeTab === 'Overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="section-title mb-4">Score Radar</h3>
              <ScoreRadarChart analysis={analysis} />
            </div>
            <div className="card">
              <h3 className="section-title mb-4">Top Matched Keywords</h3>
              <KeywordBarChart matchedKeywords={analysis.matched_keywords} />
            </div>
          </div>
          {/* Summary stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Job Keywords',     val: analysis.job_keywords.length,     color: 'text-blue-400' },
              { label: 'Resume Keywords',  val: analysis.resume_keywords.length,  color: 'text-primary-400' },
              { label: 'Matched',          val: analysis.matched_keywords.length, color: 'text-emerald-400' },
              { label: 'Not Found',        val: analysis.missing_keywords.length, color: 'text-coral-400' },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-navy-500 border border-white/[0.07] rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${color}`}>{val}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          {/* Disclaimers */}
          <p className="text-xs text-slate-600 text-center">
            Job-match % is not a probability of selection · ATS score is not a guarantee of an interview · A resume can be ATS-compatible with a low job match
          </p>
        </div>
      )}

      {/* ── Skills ──────────────────────────────────────────────────────── */}
      {activeTab === 'Skills' && (
        <div className="card">
          <h3 className="section-title mb-5">Keyword Analysis</h3>
          <KeywordCloud
            matchedKeywords={analysis.matched_keywords}
            missingKeywords={analysis.missing_keywords}
          />
        </div>
      )}

      {/* ── ATS ─────────────────────────────────────────────────────────── */}
      {activeTab === 'ATS' && (
        <AtsReportCard atsReport={ats} />
      )}

      {/* ── Suggestions ─────────────────────────────────────────────────── */}
      {activeTab === 'Suggestions' && (
        <div className="card">
          <h3 className="section-title mb-5">Improvement Suggestions</h3>
          <SuggestionList suggestions={analysis.suggestions} />
        </div>
      )}

      {/* ── Roles ───────────────────────────────────────────────────────── */}
      {activeTab === 'Roles' && (
        <div className="space-y-6">
          {/* Find Matching Jobs button — opens Job Search with prefilled skills */}
          <div className="flex justify-center">
            <button onClick={handleFindJobs} className="btn-gradient py-3 px-6">
              🔍 Find Matching Jobs
            </button>
          </div>
          <p className="text-xs text-slate-500 text-center -mt-3">
            Opens Job Search with your resume skills prefilled for matching.
          </p>
          <JobRecommendations analysisId={analysis.id} />
        </div>
      )}

      {/* ── Cover Letter ─────────────────────────────────────────────────── */}
      {activeTab === 'Cover Letter' && (
        <div className="card space-y-6">
          <div>
            <h3 className="section-title">AI Cover Letter Generator</h3>
            <p className="text-xs text-slate-500 mt-1">
              Generate a personalized cover letter using Google Gemini AI. The
              letter is based on your actual resume and the job description from
              this analysis — no qualifications are invented.
            </p>
          </div>

          {/* Job context preview */}
          <div className="rounded-xl bg-navy-500 border border-white/[0.07] p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 text-xs">Job Title:</span>
              <span className="text-white font-medium">{jobDetails?.title || 'Loading…'}</span>
            </div>
            {jobDetails?.company && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500 text-xs">Company:</span>
                <span className="text-white font-medium">{jobDetails.company}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 text-xs">Resume:</span>
              <span className="text-white font-medium">#{analysis.resume_id}</span>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => setShowCoverLetter(true)}
              className="btn-gradient py-3 px-6"
            >
              ✉️ Generate Cover Letter
            </button>
          </div>
          <p className="text-xs text-slate-500 text-center -mt-3">
            Powered by Google Gemini AI · Requires GEMINI_API_KEY in backend .env
          </p>
        </div>
      )}

      {/* ATS success popup */}
      <AtsSuccessModal
        open={showAtsModal}
        atsReport={ats}
        jobMatchScore={analysis.overall_score}
        onClose={closeAtsModal}
      />

      {/* Cover Letter modal */}
      <CoverLetterModal
        open={showCoverLetter}
        resumeId={analysis.resume_id}
        jobDescriptionId={analysis.job_description_id}
        jobTitle={jobDetails?.title || ''}
        companyName={jobDetails?.company || ''}
        onClose={() => setShowCoverLetter(false)}
      />
    </div>
  )
}
