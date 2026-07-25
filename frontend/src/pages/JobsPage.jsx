import React, { useState } from 'react'
import { jobsApi } from '../api/jobs.js'
import { useJobs } from '../hooks/useJobs.js'
import Spinner from '../components/common/Spinner.jsx'
import Alert from '../components/common/Alert.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import ConfirmDialog from '../components/common/ConfirmDialog.jsx'
import { formatDate, truncate } from '../utils/formatters.js'
import { validateRequired } from '../utils/validators.js'

const BLANK = { title: '', company: '', raw_text: '' }

export default function JobsPage() {
  const { jobs, loading, error, refetch, deleteJob } = useJobs()

  const [form,       setForm]       = useState(BLANK)
  const [submitting, setSubmitting] = useState(false)
  const [formError,  setFormError]  = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [confirmId,  setConfirmId]  = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  function set(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  function validate() {
    const e = {}
    const titleErr = validateRequired(form.title, 'Title')
    const textErr  = validateRequired(form.raw_text, 'Job description text')
    if (titleErr) e.title    = titleErr
    if (textErr)  e.raw_text = textErr
    setFieldErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setFormError('')
    try {
      await jobsApi.create(form)
      setForm(BLANK)
      await refetch()
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to save job description.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    try { await deleteJob(id) }
    catch { /* intentional */ }
    finally { setConfirmId(null) }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Job Descriptions</h1>

      {/* Add form */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Add Job Description</h2>
        <Alert message={formError} variant="error" className="mb-4" />
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="job-title" className="label">Job Title *</label>
              <input
                id="job-title" type="text" className="input-field"
                placeholder="e.g. Senior Software Engineer"
                value={form.title} onChange={set('title')}
              />
              {fieldErrors.title && <p className="mt-1 text-xs text-red-600">{fieldErrors.title}</p>}
            </div>
            <div>
              <label htmlFor="job-company" className="label">Company</label>
              <input
                id="job-company" type="text" className="input-field"
                placeholder="e.g. Acme Corp"
                value={form.company} onChange={set('company')}
              />
            </div>
          </div>
          <div>
            <label htmlFor="job-text" className="label">Job Description Text *</label>
            <textarea
              id="job-text" rows={7} className="input-field resize-none"
              placeholder="Paste the full job description here…"
              value={form.raw_text} onChange={set('raw_text')}
            />
            {fieldErrors.raw_text && <p className="mt-1 text-xs text-red-600">{fieldErrors.raw_text}</p>}
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? <><Spinner size="sm" /> Saving…</> : '💼 Save Job Description'}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Saved Jobs</h2>
        {loading && <div className="flex justify-center py-8"><Spinner /></div>}
        {error   && <Alert message={error} variant="error" />}
        {!loading && !error && jobs.length === 0 && (
          <EmptyState icon="💼" title="No job descriptions yet" description="Add your first job description above." />
        )}
        {!loading && jobs.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {jobs.map((j) => (
              <li key={j.id} className="py-3 space-y-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <button
                      onClick={() => setExpandedId(expandedId === j.id ? null : j.id)}
                      className="text-sm font-medium text-gray-900 hover:text-primary-600 text-left"
                    >
                      {j.title}
                    </button>
                    {j.company && (
                      <span className="ml-2 text-xs text-gray-400">{j.company}</span>
                    )}
                    <p className="text-xs text-gray-400">{formatDate(j.created_at)}</p>
                  </div>
                  {confirmId === j.id ? (
                    <ConfirmDialog
                      message="Delete?"
                      onConfirm={() => handleDelete(j.id)}
                      onCancel={() => setConfirmId(null)}
                    />
                  ) : (
                    <button onClick={() => setConfirmId(j.id)} className="flex-shrink-0 text-red-500 hover:text-red-700 text-xs font-medium">
                      Delete
                    </button>
                  )}
                </div>
                {expandedId === j.id && (
                  <p className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 rounded p-3 mt-2 max-h-40 overflow-y-auto">
                    {j.raw_text}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
