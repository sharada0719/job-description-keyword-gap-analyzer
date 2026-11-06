import { useState, useEffect, useRef } from 'react'
import { coverLetterApi } from '../../api/coverLetter.js'
import Spinner from '../common/Spinner.jsx'
import Alert from '../common/Alert.jsx'

/**
 * Cover Letter Generator modal.
 *
 * Opens with resume_id and job_description_id; fetches the cover letter from
 * the backend (which calls Gemini).  The generated text is editable.
 *
 * Actions: Copy, Download TXT, Regenerate, Close.
 */
export default function CoverLetterModal({
  open,
  resumeId,
  jobDescriptionId,
  jobTitle,
  companyName,
  onClose,
}) {
  const [state,        setState]        = useState('idle') // idle | generating | done | error
  const [coverLetter,  setCoverLetter]  = useState('')
  const [errorMsg,     setErrorMsg]     = useState('')
  const [copied,       setCopied]       = useState(false)
  const textareaRef = useRef(null)

  // ── Generate on open ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    // Reset state when opening
    setState('idle')
    setCoverLetter('')
    setErrorMsg('')
    setCopied(false)
  }, [open])

  // ── Auto-generate when modal opens with valid IDs ────────────────────────
  useEffect(() => {
    if (open && resumeId && jobDescriptionId && state === 'idle') {
      handleGenerate()
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Escape to close ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const fn = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [open, onClose])

  async function handleGenerate() {
    setState('generating')
    setErrorMsg('')
    try {
      const result = await coverLetterApi.generate({
        resume_id: resumeId,
        job_description_id: jobDescriptionId,
      })
      setCoverLetter(result.cover_letter)
      setState('done')
    } catch (err) {
      setErrorMsg(
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        'Failed to generate cover letter. Please ensure GEMINI_API_KEY is set in the backend .env file.'
      )
      setState('error')
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(coverLetter).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleDownload() {
    const blob = new Blob([coverLetter], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `cover-letter-${jobTitle?.toLowerCase().replace(/\s+/g, '-') || 'generated'}.txt`,
      style: 'display:none',
    })
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cover-letter-title"
    >
      <div
        className="bg-navy-600 border border-white/[0.1] rounded-2xl shadow-card-lg w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-purple flex items-center justify-center text-lg flex-shrink-0">
              ✉️
            </div>
            <div>
              <h2 id="cover-letter-title" className="text-base font-bold text-white">
                AI Cover Letter Generator
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {jobTitle || 'Job'}{companyName ? ` at ${companyName}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost w-8 h-8 rounded-lg flex-shrink-0"
            aria-label="Close cover letter dialog"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Generating */}
          {state === 'generating' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Spinner size="lg" />
              <p className="text-sm text-slate-400">
                Generating your personalized cover letter with Gemini AI…
              </p>
              <p className="text-xs text-slate-600">
                This may take a few seconds. The AI analyzes your resume and the
                job description to create a tailored letter.
              </p>
            </div>
          )}

          {/* Error */}
          {state === 'error' && (
            <div className="space-y-4">
              <Alert variant="error" message={errorMsg} />
              <div className="flex justify-center">
                <button onClick={handleGenerate} className="btn-gradient">
                  🔄 Try Again
                </button>
              </div>
            </div>
          )}

          {/* Done — editable cover letter */}
          {state === 'done' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="text-primary-400">💡</span>
                You can edit the cover letter below before copying or downloading.
              </div>
              <textarea
                ref={textareaRef}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                className="input-field min-h-[400px] text-sm leading-relaxed font-sans resize-y"
                placeholder="Your generated cover letter will appear here…"
                aria-label="Editable cover letter"
              />
            </div>
          )}

          {/* Idle (shouldn't normally show, but handles edge cases) */}
          {state === 'idle' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <p className="text-sm text-slate-400">Ready to generate.</p>
              <button onClick={handleGenerate} className="btn-gradient">
                ✉️ Generate Cover Letter
              </button>
            </div>
          )}
        </div>

        {/* Footer — actions */}
        {state === 'done' && (
          <div className="px-6 py-4 border-t border-white/[0.07] flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-2">
              <button onClick={handleCopy} className="btn-secondary text-xs">
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
              <button onClick={handleDownload} className="btn-secondary text-xs">
                ⬇ Download TXT
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={handleGenerate} className="btn-secondary text-xs">
                🔄 Regenerate
              </button>
              <button onClick={onClose} className="btn-gradient text-xs">
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
