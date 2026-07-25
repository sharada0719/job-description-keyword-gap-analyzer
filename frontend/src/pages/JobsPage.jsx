import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { jobsApi } from '../api/jobs.js'
import { useJobs } from '../hooks/useJobs.js'
import Spinner from '../components/common/Spinner.jsx'
import Alert from '../components/common/Alert.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import ConfirmDialog from '../components/common/ConfirmDialog.jsx'
import { formatDate } from '../utils/formatters.js'
import { validateRequired } from '../utils/validators.js'

// ─── Blank form shape ─────────────────────────────────────────────────────────
const BLANK = { title: '', company: '', raw_text: '' }

// ─── View Modal ───────────────────────────────────────────────────────────────
function ViewModal({ job, onClose }) {
  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="view-modal-title"
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="min-w-0">
            <h2 id="view-modal-title" className="text-lg font-bold text-gray-900 truncate">
              {job.title}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              {job.company && (
                <span className="text-sm text-gray-500">🏢 {job.company}</span>
              )}
              <span className="text-xs text-gray-400">📅 {formatDate(job.created_at)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                       text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Job Description
          </p>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
            {job.raw_text}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ job, onSaved, onClose }) {
  const [form,        setForm]        = useState({
    title:    job.title,
    company:  job.company || '',
    raw_text: job.raw_text,
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [apiError,    setApiError]    = useState('')
  const [saving,      setSaving]      = useState(false)

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function set(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  function validate() {
    const e = {}
    const titleErr = validateRequired(form.title, 'Job Title')
    const textErr  = validateRequired(form.raw_text, 'Job Description Text')
    if (titleErr) e.title    = titleErr
    if (textErr)  e.raw_text = textErr
    setFieldErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave(ev) {
    ev.preventDefault()
    setApiError('')
    if (!validate()) return
    setSaving(true)
    try {
      const updated = await jobsApi.update(job.id, {
        title:    form.title.trim(),
        company:  form.company.trim() || null,
        raw_text: form.raw_text.trim(),
      })
      onSaved(updated)   // hand the fresh object back to JobsPage
    } catch (err) {
      setApiError(
        err?.response?.data?.message ||
        err?.response?.data?.detail  ||
        'Update failed. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 id="edit-modal-title" className="text-lg font-bold text-gray-900">
            Edit Job Description
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center
                       text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Form — scrollable */}
        <form
          onSubmit={handleSave}
          noValidate
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
        >
          <Alert message={apiError} variant="error" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div>
              <label htmlFor="edit-title" className="label">Job Title *</label>
              <input
                id="edit-title"
                type="text"
                className="input-field"
                value={form.title}
                onChange={set('title')}
                placeholder="e.g. Senior Software Engineer"
              />
              {fieldErrors.title && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.title}</p>
              )}
            </div>
            {/* Company */}
            <div>
              <label htmlFor="edit-company" className="label">Company</label>
              <input
                id="edit-company"
                type="text"
                className="input-field"
                value={form.company}
                onChange={set('company')}
                placeholder="e.g. Acme Corp"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="edit-text" className="label">Job Description Text *</label>
            <textarea
              id="edit-text"
              rows={10}
              className="input-field resize-y"
              value={form.raw_text}
              onChange={set('raw_text')}
              placeholder="Paste the full job description here…"
            />
            {fieldErrors.raw_text && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.raw_text}</p>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary" disabled={saving}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
            disabled={saving}
          >
            {saving ? (
              <><Spinner size="sm" /> Saving…</>
            ) : (
              '💾 Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main JobsPage ────────────────────────────────────────────────────────────
export default function JobsPage() {
  const navigate = useNavigate()
  const { jobs, loading, error, refetch, deleteJob } = useJobs()

  // ── Add-form state
  const [form,        setForm]        = useState(BLANK)
  const [submitting,  setSubmitting]  = useState(false)
  const [formError,   setFormError]   = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  // ── Modal state
  const [viewJob,    setViewJob]    = useState(null)   // job object to view
  const [editJob,    setEditJob]    = useState(null)   // job object to edit
  const [confirmJob, setConfirmJob] = useState(null)   // job object to delete
  const [deleteError, setDeleteError] = useState('')

  // ── Search
  const [search, setSearch] = useState('')

  // ── Instant client-side filter by title or company
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return jobs
    return jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        (j.company && j.company.toLowerCase().includes(q))
    )
  }, [jobs, search])

  // ─── Add form helpers ───────────────────────────────────────────────────────
  function setField(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  function validateAdd() {
    const e = {}
    const titleErr = validateRequired(form.title, 'Job Title')
    const textErr  = validateRequired(form.raw_text, 'Job Description Text')
    if (titleErr) e.title    = titleErr
    if (textErr)  e.raw_text = textErr
    setFieldErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleAdd(e) {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    if (!validateAdd()) return
    setSubmitting(true)
    try {
      await jobsApi.create({
        title:    form.title.trim(),
        company:  form.company.trim() || null,
        raw_text: form.raw_text.trim(),
      })
      setForm(BLANK)
      setFormSuccess('Job description saved successfully.')
      await refetch()
    } catch (err) {
      setFormError(
        err?.response?.data?.message ||
        err?.response?.data?.detail  ||
        'Failed to save job description.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Edit save callback ──────────────────────────────────────────────────────
  function handleEditSaved(updatedJob) {
    // Refresh list so the card reflects the new data immediately
    refetch()
    setEditJob(null)
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────
  async function handleDeleteConfirmed() {
    if (!confirmJob) return
    setDeleteError('')
    try {
      await deleteJob(confirmJob.id)
    } catch (err) {
      setDeleteError(
        err?.response?.data?.message || 'Delete failed. Please try again.'
      )
    } finally {
      setConfirmJob(null)
    }
  }

  // ─── Run Analysis — navigate with pre-selected job id ───────────────────────
  function handleRunAnalysis(job) {
    navigate('/analysis/new', { state: { jobId: job.id } })
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Job Descriptions</h1>

      {/* ── Add form ─────────────────────────────────────────────────────── */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Add Job Description
        </h2>

        <Alert message={formError}   variant="error"   className="mb-4" />
        <Alert message={formSuccess} variant="success" className="mb-4" />

        <form onSubmit={handleAdd} noValidate className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="job-title" className="label">Job Title *</label>
              <input
                id="job-title"
                type="text"
                className="input-field"
                placeholder="e.g. Senior Software Engineer"
                value={form.title}
                onChange={setField('title')}
              />
              {fieldErrors.title && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.title}</p>
              )}
            </div>
            <div>
              <label htmlFor="job-company" className="label">Company</label>
              <input
                id="job-company"
                type="text"
                className="input-field"
                placeholder="e.g. Acme Corp"
                value={form.company}
                onChange={setField('company')}
              />
            </div>
          </div>

          <div>
            <label htmlFor="job-text" className="label">Job Description Text *</label>
            <textarea
              id="job-text"
              rows={7}
              className="input-field resize-none"
              placeholder="Paste the full job description here…"
              value={form.raw_text}
              onChange={setField('raw_text')}
            />
            {fieldErrors.raw_text && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.raw_text}</p>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? (
              <><Spinner size="sm" /> Saving…</>
            ) : (
              '💼 Save Job Description'
            )}
          </button>
        </form>
      </div>

      {/* ── Saved jobs list ──────────────────────────────────────────────── */}
      <div className="card">
        {/* List header + search */}
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Saved Jobs
            {jobs.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-400">
                ({jobs.length})
              </span>
            )}
          </h2>

          {jobs.length > 0 && (
            <div className="relative">
              <span className="absolute inset-y-0 left-2.5 flex items-center
                               pointer-events-none text-gray-400 text-sm">
                🔍
              </span>
              <input
                type="search"
                className="input-field pl-8 w-56 text-sm"
                placeholder="Search title or company…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search job descriptions"
              />
            </div>
          )}
        </div>

        {deleteError && (
          <Alert message={deleteError} variant="error" className="mb-4" />
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        )}

        {/* API error */}
        {!loading && error && <Alert message={error} variant="error" />}

        {/* Empty — no jobs at all */}
        {!loading && !error && jobs.length === 0 && (
          <EmptyState
            icon="💼"
            title="No job descriptions yet"
            description="Add your first job description using the form above."
          />
        )}

        {/* Empty — search returned nothing */}
        {!loading && !error && jobs.length > 0 && filtered.length === 0 && (
          <EmptyState
            icon="🔍"
            title="No results"
            description={`No jobs match "${search}".`}
            action={
              <button
                onClick={() => setSearch('')}
                className="btn-secondary text-sm"
              >
                Clear search
              </button>
            }
          />
        )}

        {/* Job cards */}
        {!loading && filtered.length > 0 && (
          <ul className="divide-y divide-gray-100" role="list">
            {filtered.map((j) => (
              <li key={j.id} className="py-4">
                {/* Card header — title / company / date */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {j.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      {j.company && <span>🏢 {j.company}</span>}
                      <span>📅 {formatDate(j.created_at)}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex-shrink-0 flex items-center gap-1.5 flex-wrap justify-end">
                    {/* View */}
                    <button
                      onClick={() => setViewJob(j)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs
                                 font-medium text-primary-700 bg-primary-50 hover:bg-primary-100
                                 transition-colors"
                      title="View full description"
                    >
                      👁 <span className="hidden sm:inline">View</span>
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => setEditJob(j)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs
                                 font-medium text-amber-700 bg-amber-50 hover:bg-amber-100
                                 transition-colors"
                      title="Edit this job description"
                    >
                      ✏️ <span className="hidden sm:inline">Edit</span>
                    </button>

                    {/* Run Analysis */}
                    <button
                      onClick={() => handleRunAnalysis(j)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs
                                 font-medium text-green-700 bg-green-50 hover:bg-green-100
                                 transition-colors"
                      title="Run a keyword-gap analysis using this job"
                    >
                      ⚡ <span className="hidden sm:inline">Analyse</span>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => setConfirmJob(j)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs
                                 font-medium text-red-700 bg-red-50 hover:bg-red-100
                                 transition-colors"
                      title="Delete this job description"
                    >
                      🗑 <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>

                {/* Description preview — first 180 chars */}
                <p className="mt-2 text-xs text-gray-500 line-clamp-2 leading-relaxed">
                  {j.raw_text}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}

      {viewJob && (
        <ViewModal job={viewJob} onClose={() => setViewJob(null)} />
      )}

      {editJob && (
        <EditModal
          job={editJob}
          onSaved={handleEditSaved}
          onClose={() => setEditJob(null)}
        />
      )}

      {confirmJob && (
        <ConfirmDialog
          title="Delete Job Description?"
          description={`"${confirmJob.title}" and all its analyses will be permanently deleted. This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmJob(null)}
        />
      )}
    </div>
  )
}
