import React, { useRef, useState } from 'react'
import { resumesApi } from '../api/resumes.js'
import { useResumes } from '../hooks/useResumes.js'
import Spinner from '../components/common/Spinner.jsx'
import Alert from '../components/common/Alert.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import ConfirmDialog from '../components/common/ConfirmDialog.jsx'
import { formatDate } from '../utils/formatters.js'
import { validateFileType, validateFileSize, validateRequired } from '../utils/validators.js'

export default function ResumesPage() {
  const { resumes, loading, error, refetch, deleteResume } = useResumes()

  const [uploading,   setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [title,       setTitle]       = useState('')
  const [file,        setFile]        = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [confirmId,   setConfirmId]   = useState(null)
  const fileRef = useRef()

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
    if (!validateForm()) return
    setUploading(true)
    setUploadError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', title)
      await resumesApi.upload(fd)
      setTitle('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      await refetch()
    } catch (err) {
      setUploadError(err?.response?.data?.message || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteResume(id)
    } catch {
      // silently handled; could show toast
    } finally {
      setConfirmId(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">My Resumes</h1>

      {/* Upload form */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Upload Resume</h2>
        <Alert message={uploadError} variant="error" className="mb-4" />
        <form onSubmit={handleUpload} noValidate className="space-y-4">
          <div>
            <label htmlFor="resume-title" className="label">Title</label>
            <input
              id="resume-title" type="text" className="input-field"
              placeholder="e.g. Software Engineer Resume 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {fieldErrors.title && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.title}</p>
            )}
          </div>
          <div>
            <label htmlFor="resume-file" className="label">File (PDF or DOCX, max 5 MB)</label>
            <input
              id="resume-file" type="file" ref={fileRef}
              accept=".pdf,.docx,.doc"
              className="input-field"
              onChange={(e) => setFile(e.target.files[0] || null)}
            />
            {fieldErrors.file && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.file}</p>
            )}
          </div>
          <button type="submit" className="btn-primary" disabled={uploading}>
            {uploading ? <><Spinner size="sm" /> Uploading…</> : '📤 Upload Resume'}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Uploaded Resumes</h2>
        {loading && <div className="flex justify-center py-8"><Spinner /></div>}
        {error   && <Alert message={error} variant="error" />}
        {!loading && !error && resumes.length === 0 && (
          <EmptyState icon="📄" title="No resumes yet" description="Upload your first resume above." />
        )}
        {!loading && resumes.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {resumes.map((r) => (
              <li key={r.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                  <p className="text-xs text-gray-400">
                    {r.original_filename} · {r.file_type.toUpperCase()} · {formatDate(r.created_at)}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {confirmId === r.id ? (
                    <ConfirmDialog
                      message="Delete this resume?"
                      onConfirm={() => handleDelete(r.id)}
                      onCancel={() => setConfirmId(null)}
                    />
                  ) : (
                    <button
                      onClick={() => setConfirmId(r.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
