/**
 * ResetPasswordPage — standalone page opened from the password-reset email link.
 *
 * URL: /reset-password?token=<signed-jwt>
 *
 * Validates the token server-side when the user submits the new password.
 * The token is not validated locally (no jwt decoding on the frontend) — it is
 * just passed to the backend as an opaque string.
 */
import { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { authApi } from '../api/auth.js'
import Alert from '../components/common/Alert.jsx'
import Spinner from '../components/common/Spinner.jsx'
import { validatePassword } from '../utils/validators.js'

function EyeIcon({ visible }) {
  return visible ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7
           a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878
           l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59
           3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025
           10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7
           -1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function PasswordField({ id, label, value, onChange, error, placeholder, autoComplete }) {
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`input-field pr-10 ${error ? 'border-coral-500/50' : ''}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          <EyeIcon visible={visible} />
        </button>
      </div>
      {error && (
        <p className="mt-1 text-xs text-coral-400 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()
  const token = searchParams.get('token') || ''

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [errors,    setErrors]    = useState({})
  const [apiError,  setApiError]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)

  // No token in URL
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-900 px-4">
        <div className="card max-w-md w-full text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-xl font-bold text-white">Invalid Reset Link</h1>
          <p className="text-sm text-slate-400">
            This password-reset link is missing or invalid. Please request a new one.
          </p>
          <Link to="/login" className="btn-gradient inline-flex justify-center w-full">
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  function validate() {
    const e = {}
    const passErr = validatePassword(password)
    if (passErr) e.password = passErr
    if (!confirm)                       e.confirm = 'Please confirm your password.'
    else if (confirm !== password)      e.confirm = 'Passwords do not match.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    setApiError('')
    if (!validate()) return
    setLoading(true)
    try {
      await authApi.resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setApiError(
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        'Invalid or expired reset link. Please request a new password reset.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-purple flex items-center justify-center text-3xl shadow-purple mx-auto mb-3">
            📄
          </div>
          <h1 className="text-lg font-bold text-white">Job Description Keyword Gap Analyzer</h1>
        </div>

        <div className="card">
          {done ? (
            <div className="space-y-4 text-center">
              <div className="text-4xl">✅</div>
              <h2 className="text-xl font-bold text-white">Password Reset!</h2>
              <p className="text-sm text-slate-400">
                Your password has been updated. You can now sign in with your new password.
              </p>
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="btn-gradient w-full justify-center"
              >
                Sign In
              </button>
            </div>
          ) : (
            <>
              <div className="mb-5">
                <h2 className="text-xl font-bold text-white">Set New Password</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Enter and confirm your new password below.
                </p>
              </div>
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {apiError && <Alert variant="error" message={apiError} />}
                <PasswordField
                  id="rp-password" label="New Password" autoComplete="new-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  error={errors.password} placeholder="Minimum 8 characters"
                />
                <PasswordField
                  id="rp-confirm" label="Confirm New Password" autoComplete="new-password"
                  value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  error={errors.confirm} placeholder="Re-enter your password"
                />
                <button type="submit" disabled={loading} className="btn-gradient w-full justify-center py-2.5">
                  {loading ? <><Spinner size="sm" /> Resetting…</> : 'Reset Password'}
                </button>
              </form>
              <p className="mt-4 text-center text-xs text-slate-600">
                Remembered your password?{' '}
                <Link to="/login" className="text-primary-400 hover:underline">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
