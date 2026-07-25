import React, { useRef, useState, useMemo } from 'react'
import { resumesApi } from '../api/resumes.js'
import { useResumes } from '../hooks/useResumes.js'
import Spinner from '../components/common/Spinner.jsx'
import Alert from '../components/common/Alert.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import ConfirmDialog from '../components/common/ConfirmDialog.jsx'
import { formatDate } from '../utils/formatters.js'
import { validateFileType, validateFileSize, validateRequired } from '../utils/validators.js'

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Human-readable file size: 1 024 → "1.0 KB" */
function formatFileSize(bytes) {
  if (bytes == null) return '—'
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Trigger a file download in the browser using a Blob object URL. */
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href        = url
  a.download    = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── File-type badge ────────────────────────────────────────────────────────────
const TYPE_STYLES = {
  pdf:  'bg-red-100  text-red-700',
  docx: 'bg-blue-100 text-blue-700',
  doc:  'bg-blue-100 text-blue-700',
}

function FileTypeBadge({ type }) {
  const label = type?.toUpperCase() || '?'
  const style = TYPE_STYLES[type?.toLowerCase()] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${style}`}>
      {label}
    </span>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ResumesPage() {
  const { resumes, loading, error, refetch, deleteResume } = useResumes()

  // ── Upload form state
  const [uploading,   setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadOk,    setUploadOk]    = useState('')
  const [title,       setTitle]       = useState('')
  const [file,        setFile]        = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const fileRef = useRef()

  // ── Delete confirmation state
  const [confirmResume, setConfirmResume] = useState(null)   // the resume object to delete
  const [deleteError,   setDeleteError]   = useState('')

  // ── Per-row action state
  const [downloadingId, setDownloadingId] = useState(null)
  // ── View notice (shown when a DOCX is opened via the View button)
  const [viewNoticeId, setViewNoticeId] = useState(null)

  // ── Search
  const [search, setSearch] = useState('')

  // ── Filtered list (client-side, instant)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return resumes
    return resumes.filter(
      (r) =>
        r.original_filename.toLowerCase().includes(q) ||
        formatDate(r.created_at).toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q)
    )
  }, [resumes, search])

  // ── Upload ─────────────────────────────────────────────────────────────────
  function validateForm() {
    const e = {}
    const titleErr = validateRequired(title, 'Title')
    const typeErr  = validateFileType(file)
    const sizeErr  = validateFileSize(file)
    if (titleErr) e.title = titleErr
    if (typeErr)  e.file  = typeErr
    if (sizeErr)  e.file  = sizeErr
    setFieldErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleUpload(e) {
    e.preventDefault()
    setUploadOk('')
    setUploadError('')
    if (!validateForm()) return

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', title)
      await resumesApi.upload(fd)
      setTitle('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      setUploadOk('Resume uploaded successfully.')
      await refetch()
    } catch (err) {
      setUploadError(
        err?.response?.data?.message ||
        err?.response?.data?.detail  ||
        'Upload failed. Please try again.'
      )
    } finally {
      setUploading(false)
    }
  }

  // ── Download ───────────────────────────────────────────────────────────────
  async function handleDownload(resume) {
    setDownloadingId(resume.id)
    try {
      const { blob } = await resumesApi.download(resume.id)
      triggerDownload(blob, resume.original_filename)
    } catch (err) {
      alert(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Download failed. The file may not be available.'
      )
    } finally {
      setDownloadingId(null)
    }
  }

  // ── View (open in new tab) ─────────────────────────────────────────────────
  async function handleView(resume) {
    if (resume.file_type?.toLowerCase() !== 'pdf') {
      // Non-PDF: fall back to download
      await handleDownload(resume)
      return
    }
    setDownloadingId(resume.id)
    try {
      const { blob } = await resumesApi.download(resume.id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      // Revoke after a short delay to give the new tab time to load
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch (err) {
      alert(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Could not open the file.'
      )
    } finally {
      setDownloadingId(null)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDeleteConfirmed() {
    if (!confirmResume) return
    setDeleteError('')
    try {
      await deleteResume(confirmResume.id)
    } catch (err) {
      setDeleteError(
        err?.response?.data?.message || 'Delete failed. Please try again.'
      )
    } finally {
      setConfirmResume(null)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">My Resumes</h1>

      {/* ── Upload form ─────────────────────────────────────────────────── */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Upload Resume</h2>

        <Alert message={uploadError} variant="error"   className="mb-4" />
        <Alert message={uploadOk}    variant="success" className="mb-4" />

        <form onSubmit={handleUpload} noValidate className="space-y-4">
          <div>
            <label htmlFor="resume-title" className="label">Title</label>
            <input
              id="resume-title"
              type="text"
              className="input-field"
              placeholder="e.g. Software Engineer Resume 2026"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setUploadOk('') }}
            />
            {fieldErrors.title && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.title}</p>
            )}
          </div>

          <div>
            <label htmlFor="resume-file" className="label">
              File <span className="text-gray-400 font-normal">(PDF or DOCX, max 5 MB)</span>
            </label>
            <input
              id="resume-file"
              type="file"
              ref={fileRef}
              accept=".pdf,.docx,.doc"
              className="input-field"
              onChange={(e) => { setFile(e.target.files[0] || null); setUploadOk('') }}
            />
            {fieldErrors.file && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.file}</p>
            )}
          </div>

          <button type="submit" className="btn-primary" disabled={uploading}>
            {uploading ? (
              <><Spinner size="sm" className="mr-2" /> Uploading…</>
            ) : (
              '📤 Upload Resume'
            )}
          </button>
        </form>
      </div>

      {/* ── Uploaded resumes list ────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <h2 className="text-base font-semibold text-gray-900">
            Uploaded Resumes
            {resumes.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-400">
                ({resumes.length})
              </span>
            )}
          </h2>

          {/* Search box — only visible when there are resumes */}
          {resumes.length > 0 && (
            <div className="relative">
              <span className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none text-gray-400 text-sm">
                🔍
              </span>
              <input
                type="search"
                className="input-field pl-8 w-52 text-sm"
                placeholder="Search filename or date…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search resumes"
              />
            </div>
          )}
        </div>

        {deleteError && (
          <Alert message={deleteError} variant="error" className="mb-4" />
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}

        {/* API error */}
        {!loading && error && (
          <Alert message={error} variant="error" />
        )}

        {/* Empty state */}
        {!loading && !error && resumes.length === 0 && (
          <EmptyState
            icon="📄"
            title="No resumes yet"
            description="Upload your first resume using the form above."
          />
        )}

        {/* No search results */}
        {!loading && !error && resumes.length > 0 && filtered.length === 0 && (
          <EmptyState
            icon="🔍"
            title="No results"
            description={`No resumes match "${search}".`}
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

        {/* Resume cards */}
        {!loading && filtered.length > 0 && (
          <ul className="divide-y divide-gray-100" role="list">
            {filtered.map((r) => {
              const isActing = downloadingId === r.id
              return (
                <li key={r.id} className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: info */}
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {r.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span className="truncate max-w-[200px]" title={r.original_filename}>
                          📎 {r.original_filename}
                        </span>
                        <FileTypeBadge type={r.file_type} />
                        {r.file_size != null && (
                          <span>💾 {formatFileSize(r.file_size)}</span>
                        )}
                        <span>📅 {formatDate(r.created_at)}</span>
                      </div>
                    </div>

                    {/* Right: action buttons */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      {/* View */}
                      <button
                        onClick={() => handleView(r)}
                        disabled={isActing}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg
                                   text-primary-700 bg-primary-50 hover:bg-primary-100
                                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title={r.file_type?.toLowerCase() === 'pdf' ? 'Open in browser' : 'Download to view'}
                        aria-label={`View ${r.title}`}
                      >
                        {isActing ? <Spinner size="sm" /> : '👁'}
                        <span className="hidden sm:inline">View</span>
                      </button>

                      {/* Download */}
                      <button
                        onClick={() => handleDownload(r)}
                        disabled={isActing}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg
                                   text-gray-700 bg-gray-100 hover:bg-gray-200
                                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Download original file"
                        aria-label={`Download ${r.title}`}
                      >
                        {isActing ? <Spinner size="sm" /> : '⬇'}
                        <span className="hidden sm:inline">Download</span>
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setConfirmResume(r)}
                        disabled={isActing}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg
                                   text-red-700 bg-red-50 hover:bg-red-100
                                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Delete resume"
                        aria-label={`Delete ${r.title}`}
                      >
                        🗑
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* ── Delete confirmation modal ────────────────────────────────────── */}
      {confirmResume && (
        <ConfirmDialog
          title="Delete Resume?"
          description={`"${confirmResume.title}" will be permanently deleted along with all its analyses. This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmResume(null)}
        />
      )}
    </div>
  )
}
