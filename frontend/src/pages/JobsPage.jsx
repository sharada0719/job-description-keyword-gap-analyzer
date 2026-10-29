import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { jobsApi } from '../api/jobs.js'
import { useJobs } from '../hooks/useJobs.js'
import Spinner from '../components/common/Spinner.jsx'
import Alert from '../components/common/Alert.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import ConfirmDialog from '../components/common/ConfirmDialog.jsx'
import { formatDate, truncate } from '../utils/formatters.js'
import { validateRequired } from '../utils/validators.js'

const BLANK = { title: '', company: '', raw_text: '' }

function Modal({ title: heading, children, onClose, footer }) {
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-8"
      onClick={onClose}
      role="dialog" aria-modal="true"
    >
      <div
        className="bg-navy-600 border border-white/[0.1] rounded-2xl shadow-card-lg w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.07]">
          <h2 className="section-title">{heading}</h2>
          <button onClick={onClose} className="btn-ghost w-8 h-8 rounded-lg">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-white/[0.07] flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  )
}

function ViewModal({ job, onClose }) {
  return (
    <Modal title={job.title} onClose={onClose} footer={<button onClick={onClose} className="btn-secondary">Close</button>}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mb-4">
        {job.company && <span>🏢 {job.company}</span>}
        <span>📅 {formatDate(job.created_at)}</span>
      </div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Job Description</p>
      <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">{job.raw_text}</pre>
    </Modal>
  )
}

function EditModal({ job, onSaved, onClose }) {
  const [form,        setForm]        = useState({ title: job.title, company: job.company || '', raw_text: job.raw_text })
  const [fieldErrors, setFieldErrors] = useState({})
  const [apiError,    setApiError]    = useState('')
  const [saving,      setSaving]      = useState(false)

  function set(field) { return (e) => setForm((p) => ({ ...p, [field]: e.target.value })) }
  function validate() {
    const e = {}
    const t = validateRequired(form.title, 'Job Title')
    const d = validateRequired(form.raw_text, 'Description')
    if (t) e.title    = t
    if (d) e.raw_text = d
    setFieldErrors(e)
    return !Object.keys(e).length
  }
  async function handleSave(ev) {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const updated = await jobsApi.update(job.id, {
        title: form.title.trim(), company: form.company.trim() || null, raw_text: form.raw_text.trim(),
      })
      onSaved(updated)
    } catch (err) {
      setApiError(err?.response?.data?.message || 'Update failed.')
    } finally { setSaving(false) }
  }

  return (
    <Modal
      title="Edit Job Description"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="btn-secondary" disabled={saving}>Cancel</button>
          <button onClick={handleSave} className="btn-gradient" disabled={saving}>
            {saving ? <><Spinner size="sm" /> Saving…</> : '💾 Save Changes'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSave} noValidate className="space-y-4">
        <Alert message={apiError} variant="error" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Job Title *</label>
            <input type="text" className="input-field" value={form.title} onChange={set('title')} placeholder="Senior Software Engineer" />
            {fieldErrors.title && <p className="mt-1 text-xs text-coral-400">{fieldErrors.title}</p>}
          </div>
          <div>
            <label className="label">Company</label>
            <input type="text" className="input-field" value={form.company} onChange={set('company')} placeholder="Acme Corp" />
          </div>
        </div>
        <div>
          <label className="label">Job Description Text *</label>
          <textarea rows={9} className="input-field" value={form.raw_text} onChange={set('raw_text')} placeholder="Paste full job description…" />
          {fieldErrors.raw_text && <p className="mt-1 text-xs text-coral-400">{fieldErrors.raw_text}</p>}
        </div>
      </form>
    </Modal>
  )
}

export default function JobsPage() {
  const navigate = useNavigate()
  const { jobs, loading, error, refetch, deleteJob } = useJobs()

  const [form,        setForm]        = useState(BLANK)
  const [submitting,  setSubmitting]  = useState(false)
  const [formError,   setFormError]   = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [viewJob,     setViewJob]     = useState(null)
  const [editJob,     setEditJob]     = useState(null)
  const [confirmJob,  setConfirmJob]  = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [search,      setSearch]      = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return jobs
    return jobs.filter((j) =>
      j.title.toLowerCase().includes(q) || (j.company && j.company.toLowerCase().includes(q))
    )
  }, [jobs, search])

  function setField(f) { return (e) => setForm((p) => ({ ...p, [f]: e.target.value })) }

  function validateAdd() {
    const e = {}
    const t = validateRequired(form.title, 'Job Title')
    const d = validateRequired(form.raw_text, 'Description')
    if (t) e.title    = t
    if (d) e.raw_text = d
    setFieldErrors(e)
    return !Object.keys(e).length
  }

  async function handleAdd(e) {
    e.preventDefault()
    setFormError(''); setFormSuccess('')
    if (!validateAdd()) return
    setSubmitting(true)
    try {
      await jobsApi.create({ title: form.title.trim(), company: form.company.trim() || null, raw_text: form.raw_text.trim() })
      setForm(BLANK); setFormSuccess('Job description saved.')
      await refetch()
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to save.')
    } finally { setSubmitting(false) }
  }

  async function handleDeleteConfirmed() {
    if (!confirmJob) return
    setDeleteError('')
    try { await deleteJob(confirmJob.id) }
    catch { setDeleteError('Delete failed.') }
    finally { setConfirmJob(null) }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <p className="text-xs text-primary-400 font-medium uppercase tracking-wider mb-1">Jobs</p>
        <h1 className="page-title">Job Descriptions</h1>
      </div>

      {/* Add form */}
      <div className="card space-y-5">
        <h2 className="section-title">Add Job Description</h2>
        <Alert message={formError}   variant="error" />
        <Alert message={formSuccess} variant="success" />
        <form onSubmit={handleAdd} noValidate className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="job-title" className="label">Job Title *</label>
              <input id="job-title" type="text" className="input-field" placeholder="Senior Software Engineer" value={form.title} onChange={setField('title')} />
              {fieldErrors.title && <p className="mt-1 text-xs text-coral-400">{fieldErrors.title}</p>}
            </div>
            <div>
              <label htmlFor="job-company" className="label">Company</label>
              <input id="job-company" type="text" className="input-field" placeholder="Acme Corp" value={form.company} onChange={setField('company')} />
            </div>
          </div>
          <div>
            <label htmlFor="job-text" className="label">Job Description Text *</label>
            <textarea id="job-text" rows={6} className="input-field resize-none" placeholder="Paste the full job description here…" value={form.raw_text} onChange={setField('raw_text')} />
            {fieldErrors.raw_text && <p className="mt-1 text-xs text-coral-400">{fieldErrors.raw_text}</p>}
          </div>
          <button type="submit" className="btn-gradient" disabled={submitting}>
            {submitting ? <><Spinner size="sm" /> Saving…</> : '💼 Save Job Description'}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="card">
        <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
          <h2 className="section-title">
            Saved Jobs
            {jobs.length > 0 && <span className="ml-2 text-xs font-normal text-slate-500">({jobs.length})</span>}
          </h2>
          {jobs.length > 0 && (
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-500 text-xs pointer-events-none">🔍</span>
              <input type="search" className="input-field pl-8 w-48 text-xs" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          )}
        </div>

        {deleteError && <Alert message={deleteError} variant="error" className="mb-4" />}
        {loading && <div className="flex justify-center py-10"><Spinner /></div>}
        {!loading && error && <Alert message={error} variant="error" />}
        {!loading && !error && jobs.length === 0 && <EmptyState icon="💼" title="No job descriptions yet" description="Add your first job description above." />}
        {!loading && !error && jobs.length > 0 && filtered.length === 0 && (
          <EmptyState icon="🔍" title="No results" description={`No jobs match "${search}".`}
            action={<button onClick={() => setSearch('')} className="btn-secondary text-xs">Clear</button>} />
        )}

        {!loading && filtered.length > 0 && (
          <ul className="divide-y divide-white/[0.05]" role="list">
            {filtered.map((j) => (
              <li key={j.id} className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-semibold text-white truncate">{j.title}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      {j.company && <span>🏢 {j.company}</span>}
                      <span>📅 {formatDate(j.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1.5 flex-wrap justify-end">
                    <button onClick={() => setViewJob(j)}    className="badge-blue   cursor-pointer hover:bg-blue-500/25 transition-colors">👁 View</button>
                    <button onClick={() => setEditJob(j)}    className="badge-amber  cursor-pointer hover:bg-amber-500/25 transition-colors">✏️ Edit</button>
                    <button onClick={() => navigate('/analysis/new', { state: { jobId: j.id } })} className="badge-green cursor-pointer hover:bg-emerald-500/25 transition-colors">⚡ Analyse</button>
                    <button onClick={() => setConfirmJob(j)} className="badge-red    cursor-pointer hover:bg-coral-500/25 transition-colors">🗑 Delete</button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-600 line-clamp-2">{truncate(j.raw_text, 160)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {viewJob    && <ViewModal job={viewJob} onClose={() => setViewJob(null)} />}
      {editJob    && <EditModal job={editJob} onSaved={() => { refetch(); setEditJob(null) }} onClose={() => setEditJob(null)} />}
      {confirmJob && (
        <ConfirmDialog
          title="Delete Job Description?"
          description={`"${confirmJob.title}" and all its analyses will be permanently deleted.`}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmJob(null)}
        />
      )}
    </div>
  )
}
