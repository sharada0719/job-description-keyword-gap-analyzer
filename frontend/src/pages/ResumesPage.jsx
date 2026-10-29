import { useRef, useState, useMemo } from 'react'
import { resumesApi } from '../api/resumes.js'
import { useResumes } from '../hooks/useResumes.js'
import Spinner from '../components/common/Spinner.jsx'
import Alert from '../components/common/Alert.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import ConfirmDialog from '../components/common/ConfirmDialog.jsx'
import { formatDate } from '../utils/formatters.js'
import { validateFileType, validateFileSize, validateRequired } from '../utils/validators.js'

function formatFileSize(bytes) {
  if (bytes == null) return '—'
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = Object.assign(document.createElement('a'), {
    href: url, download: filename, style: 'display:none',
  })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function FileTypeBadge({ type }) {
  const label = type?.toUpperCase() || '?'
  const cls =
    type?.toLowerCase() === 'pdf'  ? 'badge-red' :
    type?.toLowerCase()?.startsWith('doc') ? 'badge-blue' : 'badge-gray'
  return <span className={cls}>{label}</span>
}

export default function ResumesPage() {
  const { resumes, loading, error, refetch, deleteResume } = useResumes()

  const [uploading,   setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadOk,    setUploadOk]    = useState('')
  const [title,       setTitle]       = useState('')
  const [file,        setFile]        = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [dragOver,    setDragOver]    = useState(false)
  const fileRef = useRef()

  const [confirmResume, setConfirmResume] = useState(null)
  const [deleteError,   setDeleteError]   = useState('')
  const [downloadingId, setDownloadingId] = useState(null)
  const [search,        setSearch]        = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return resumes
    return resumes.filter(
      (r) =>
        r.original_filename.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        formatDate(r.created_at).toLowerCase().includes(q)
    )
  }, [resumes, search])

  function validateForm() {
    const e = {}
    const titleErr = validateRequired(title, 'Title')
    const typeErr  = validateFileType(file)
    const sizeErr  = validateFileSize(file)
    if (titleErr) e.title = titleErr
    if (typeErr)  e.file  = typeErr
    if (sizeErr)  e.file  = sizeErr
    setFieldErrors(e)
    return !Object.keys(e).length
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
      setUploadError(err?.response?.data?.message || err?.response?.data?.detail || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  async function handleDownload(resume) {
    setDownloadingId(resume.id)
    try {
      const { blob } = await resumesApi.download(resume.id)
      triggerDownload(blob, resume.original_filename)
    } catch { alert('Download failed.') }
    finally { setDownloadingId(null) }
  }

  async function handleView(resume) {
    if (resume.file_type?.toLowerCase() !== 'pdf') {
      await handleDownload(resume); return
    }
    setDownloadingId(resume.id)
    try {
      const { blob } = await resumesApi.download(resume.id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch { alert('Could not open the file.') }
    finally { setDownloadingId(null) }
  }

  async function handleDeleteConfirmed() {
    if (!confirmResume) return
    setDeleteError('')
    try { await deleteResume(confirmResume.id) }
    catch { setDeleteError('Delete failed. Please try again.') }
    finally { setConfirmResume(null) }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <p className="text-xs text-primary-400 font-medium uppercase tracking-wider mb-1">Resumes</p>
        <h1 className="page-title">My Resumes</h1>
      </div>

      {/* Upload card */}
      <div className="card space-y-5">
        <h2 className="section-title">Upload Resume</h2>
        <Alert message={uploadError} variant="error" />
        <Alert message={uploadOk}    variant="success" />

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
            {fieldErrors.title && <p className="mt-1 text-xs text-coral-400">{fieldErrors.title}</p>}
          </div>

          {/* Drag-and-drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer
              ${dragOver
                ? 'border-primary-500 bg-primary-500/10'
                : file
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : 'border-white/[0.12] hover:border-white/25'
              }`}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
            aria-label="Upload resume file"
          >
            <input
              id="resume-file"
              type="file"
              ref={fileRef}
              accept=".pdf,.docx,.doc"
              className="sr-only"
              onChange={(e) => { setFile(e.target.files[0] || null); setUploadOk('') }}
            />
            {file ? (
              <>
                <div className="text-3xl mb-2">📄</div>
                <p className="text-sm font-medium text-emerald-400">{file.name}</p>
                <p className="text-xs text-slate-500 mt-1">{formatFileSize(file.size)} · Click to change</p>
              </>
            ) : (
              <>
                <div className="text-3xl mb-2">⬆️</div>
                <p className="text-sm font-medium text-slate-300">
                  Drag &amp; drop or <span className="text-primary-400">browse</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">PDF or DOCX · max 5 MB</p>
              </>
            )}
          </div>
          {fieldErrors.file && <p className="text-xs text-coral-400">{fieldErrors.file}</p>}

          <button type="submit" className="btn-gradient" disabled={uploading}>
            {uploading ? <><Spinner size="sm" /> Uploading…</> : '📤 Upload Resume'}
          </button>
        </form>
      </div>

      {/* Resume list */}
      <div className="card">
        <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
          <h2 className="section-title">
            Uploaded Resumes
            {resumes.length > 0 && (
              <span className="ml-2 text-xs font-normal text-slate-500">({resumes.length})</span>
            )}
          </h2>
          {resumes.length > 0 && (
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-500 text-xs pointer-events-none">🔍</span>
              <input
                type="search"
                className="input-field pl-8 w-48 text-xs"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search resumes"
              />
            </div>
          )}
        </div>

        {deleteError && <Alert message={deleteError} variant="error" className="mb-4" />}
        {loading && <div className="flex justify-center py-8"><Spinner /></div>}
        {!loading && error && <Alert message={error} variant="error" />}
        {!loading && !error && resumes.length === 0 && (
          <EmptyState icon="📄" title="No resumes yet" description="Upload your first resume above." />
        )}
        {!loading && !error && resumes.length > 0 && filtered.length === 0 && (
          <EmptyState
            icon="🔍" title="No results"
            description={`No resumes match "${search}".`}
            action={<button onClick={() => setSearch('')} className="btn-secondary text-xs">Clear search</button>}
          />
        )}

        {!loading && filtered.length > 0 && (
          <ul className="divide-y divide-white/[0.05]" role="list">
            {filtered.map((r) => {
              const acting = downloadingId === r.id
              return (
                <li key={r.id} className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-white truncate">{r.title}</p>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                        <span className="truncate max-w-[180px]" title={r.original_filename}>
                          📎 {r.original_filename}
                        </span>
                        <FileTypeBadge type={r.file_type} />
                        {r.file_size != null && <span>💾 {formatFileSize(r.file_size)}</span>}
                        <span>📅 {formatDate(r.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1.5">
                      <button
                        onClick={() => handleView(r)} disabled={acting}
                        className="badge-blue cursor-pointer hover:bg-blue-500/25 transition-colors disabled:opacity-50"
                        title={r.file_type?.toLowerCase() === 'pdf' ? 'Open' : 'Download to view'}
                      >
                        {acting ? <Spinner size="sm" /> : '👁 View'}
                      </button>
                      <button
                        onClick={() => handleDownload(r)} disabled={acting}
                        className="badge-gray cursor-pointer hover:bg-navy-300/30 transition-colors disabled:opacity-50"
                      >
                        ⬇ Download
                      </button>
                      <button
                        onClick={() => setConfirmResume(r)} disabled={acting}
                        className="badge-red cursor-pointer hover:bg-coral-500/25 transition-colors disabled:opacity-50"
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {confirmResume && (
        <ConfirmDialog
          title="Delete Resume?"
          description={`"${confirmResume.title}" and all its analyses will be permanently deleted.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmResume(null)}
        />
      )}
    </div>
  )
}
