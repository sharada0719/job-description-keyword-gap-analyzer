import { useEffect, useState, useCallback } from 'react'
import { applicationsApi } from '../api/applications.js'
import Spinner from '../components/common/Spinner.jsx'
import Alert from '../components/common/Alert.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import ConfirmDialog from '../components/common/ConfirmDialog.jsx'
import { formatDate } from '../utils/formatters.js'

const COLUMNS = [
  { status: 'saved',     label: 'Saved',     color: 'text-slate-400',  dot: 'bg-slate-500' },
  { status: 'applied',   label: 'Applied',   color: 'text-blue-400',   dot: 'bg-blue-500' },
  { status: 'interview', label: 'Interview', color: 'text-amber-400', dot: 'bg-amber-500' },
  { status: 'offered',   label: 'Offered',   color: 'text-emerald-400', dot: 'bg-emerald-500' },
  { status: 'rejected',  label: 'Rejected',  color: 'text-coral-400',  dot: 'bg-coral-500' },
]

const STATUSES = COLUMNS.map((c) => c.status)

function isValidEmail(email) {
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidUrl(url) {
  return url && /^https?:\/\/.+/.test(url)
}

// ── Job Card ──────────────────────────────────────────────────────────────────
function JobCard({ app, onStatusChange, onEditNotes, onDelete }) {

  return (
    <div className="bg-navy-500 border border-white/[0.07] rounded-xl p-4 space-y-3 hover:border-white/[0.12] transition-colors">
      {/* Title + company */}
      <div>
        <h4 className="text-sm font-semibold text-white">{app.job_title}</h4>
        {app.company_name && (
          <p className="text-xs text-slate-500 mt-0.5">🏢 {app.company_name}</p>
        )}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
        {app.job_location && <span>📍 {app.job_location}</span>}
        <span>📅 {formatDate(app.created_at)}</span>
      </div>

      {/* Apply button — email-conditional */}
      {isValidEmail(app.contact_email) ? (
        <a
          href={`mailto:${app.contact_email}?subject=Application for ${encodeURIComponent(app.job_title)}`}
          className="block w-full text-center py-1.5 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/25 hover:bg-blue-500/25 transition-colors"
        >
          ✉️ Apply via Email
        </a>
      ) : isValidUrl(app.job_url) ? (
        <a
          href={app.job_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center py-1.5 rounded-lg text-xs font-medium bg-primary-500/15 text-primary-400 border border-primary-500/25 hover:bg-primary-500/25 transition-colors"
        >
          🔗 Apply on Website ↗
        </a>
      ) : null}

      {/* Notes preview */}
      {app.notes && (
        <p className="text-xs text-slate-600 line-clamp-2 italic">📝 {app.notes}</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.05]">
        {/* Status dropdown */}
        <select
          value={app.application_status}
          onChange={(e) => onStatusChange(app.id, e.target.value)}
          className="text-xs bg-navy-400 border border-white/[0.1] rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
        >
          {COLUMNS.map((c) => (
            <option key={c.status} value={c.status}>{c.label}</option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onEditNotes(app)}
            className="px-2 py-1 rounded-lg text-xs text-slate-500 hover:text-primary-400 hover:bg-navy-400 transition-colors"
            title="Edit notes"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(app)}
            className="px-2 py-1 rounded-lg text-xs text-slate-500 hover:text-coral-400 hover:bg-navy-400 transition-colors"
            title="Delete"
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Notes Modal ───────────────────────────────────────────────────────────────
function NotesModal({ app, onClose, onSave }) {
  const [notes, setNotes] = useState(app?.notes || '')
  const [jobLocation, setJobLocation] = useState(app?.job_location || '')
  const [companyName, setCompanyName] = useState(app?.company_name || '')
  const [contactEmail, setContactEmail] = useState(app?.contact_email || '')
  const [jobUrl, setJobUrl] = useState(app?.job_url || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await onSave({
        company_name: companyName || null,
        job_location: jobLocation || null,
        contact_email: contactEmail || null,
        job_url: jobUrl || null,
        notes: notes || null,
      })
    } catch (err) {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!app) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notes-modal-title"
    >
      <div
        className="bg-navy-600 border border-white/[0.1] rounded-2xl shadow-card-lg w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.07]">
          <div>
            <h2 id="notes-modal-title" className="section-title">{app.job_title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Edit application details</p>
          </div>
          <button onClick={onClose} className="btn-ghost w-8 h-8 rounded-lg">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <Alert variant="error" message={error} />}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label text-xs">Company</label>
              <input className="input-field" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name" />
            </div>
            <div>
              <label className="label text-xs">Location</label>
              <input className="input-field" value={jobLocation} onChange={(e) => setJobLocation(e.target.value)} placeholder="City or Remote" />
            </div>
          </div>
          <div>
            <label className="label text-xs">Contact Email</label>
            <input className="input-field" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="hr@company.com" />
          </div>
          <div>
            <label className="label text-xs">Job URL</label>
            <input className="input-field" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <label className="label text-xs">Notes</label>
            <textarea
              rows={5}
              className="input-field"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Application notes, interview feedback, etc."
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/[0.07] flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary" disabled={saving}>Cancel</button>
          <button onClick={handleSave} className="btn-gradient" disabled={saving}>
            {saving ? <Spinner size="sm" /> : '💾 Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon }) {
  return (
    <div className="bg-navy-500 border border-white/[0.07] rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{icon} {label}</p>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ApplicationTrackerPage() {
  const [apps,        setApps]        = useState([])
  const [stats,       setStats]       = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [editApp,     setEditApp]     = useState(null)
  const [deleteApp,   setDeleteApp]   = useState(null)
  const [actionError, setActionError] = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [appData, statsData] = await Promise.all([
        applicationsApi.list(),
        applicationsApi.stats(),
      ])
      setApps(appData)
      setStats(statsData)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load applications.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function handleStatusChange(id, newStatus) {
    try {
      await applicationsApi.updateStatus(id, newStatus)
      setApps((prev) => prev.map((a) => a.id === id ? { ...a, application_status: newStatus } : a))
      const newStats = await applicationsApi.stats()
      setStats(newStats)
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to update status.')
    }
  }

  async function handleDelete() {
    if (!deleteApp) return
    try {
      await applicationsApi.delete(deleteApp.id)
      setApps((prev) => prev.filter((a) => a.id !== deleteApp.id))
      setDeleteApp(null)
      const newStats = await applicationsApi.stats()
      setStats(newStats)
    } catch (err) {
      setActionError('Delete failed.')
    }
  }

  async function handleSaveNotes(updates) {
    await applicationsApi.update(editApp.id, updates)
    setApps((prev) => prev.map((a) => a.id === editApp.id ? { ...a, ...updates } : a))
    setEditApp(null)
  }

  // Group by status
  const byStatus = STATUSES.reduce((acc, s) => {
    acc[s] = apps.filter((a) => a.application_status === s)
    return acc
  }, {})

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs text-primary-400 font-medium uppercase tracking-wider mb-1">Tracker</p>
        <h1 className="page-title">My Job Applications</h1>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total"      value={stats.total}     color="text-white"      icon="📊" />
          <StatCard label="Saved"      value={stats.saved}     color="text-slate-400"   icon="💾" />
          <StatCard label="Applied"    value={stats.applied}   color="text-blue-400"   icon="📤" />
          <StatCard label="Interviews" value={stats.interview} color="text-amber-400"  icon="🎯" />
          <StatCard label="Offers"     value={stats.offered}   color="text-emerald-400" icon="🏆" />
          <StatCard label="Rejected"  value={stats.rejected}  color="text-coral-400"  icon="✕" />
        </div>
      )}

      {error   && <Alert variant="error" message={error} />}
      {actionError && <Alert variant="error" message={actionError} className="mb-4" />}

      {/* Empty state */}
      {apps.length === 0 && !error && (
        <div className="card">
          <EmptyState
            icon="📋"
            title="No applications yet"
            description="Save jobs from the Job Search or Recommendations to track them here."
          />
        </div>
      )}

      {/* Kanban board */}
      {apps.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {COLUMNS.map((col) => (
            <div key={col.status} className="space-y-3">
              {/* Column header */}
              <div className="flex items-center gap-2 px-1">
                <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                <h3 className={`text-sm font-semibold ${col.color}`}>{col.label}</h3>
                <span className="text-xs text-slate-600 ml-auto">{byStatus[col.status].length}</span>
              </div>
              {/* Cards */}
              <div className="space-y-3 min-h-[100px]">
                {byStatus[col.status].map((app) => (
                  <JobCard
                    key={app.id}
                    app={app}
                    onStatusChange={handleStatusChange}
                    onEditNotes={setEditApp}
                    onDelete={setDeleteApp}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notes modal */}
      {editApp && (
        <NotesModal app={editApp} onClose={() => setEditApp(null)} onSave={handleSaveNotes} />
      )}

      {/* Delete confirmation */}
      {deleteApp && (
        <ConfirmDialog
          title="Delete Application?"
          description={`"${deleteApp.job_title}" will be permanently deleted.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteApp(null)}
        />
      )}
    </div>
  )
}
