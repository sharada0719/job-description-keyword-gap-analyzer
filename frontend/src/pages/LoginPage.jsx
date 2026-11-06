/**
 * AuthPage — unified Sign In / Register split-screen page.
 * Official project name: Job Description Keyword Gap Analyzer
 *
 * Parts:
 *   - Left panel: branding, headline, description, feature list
 *   - Right panel: tab-switched Sign In / Register forms
 *   - Password visibility toggle on all password fields
 *   - Forgot Password modal (request) + inline forgot-password flow
 */
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { authApi } from '../api/auth.js'
import Alert from '../components/common/Alert.jsx'
import Spinner from '../components/common/Spinner.jsx'
import {
  validateEmail,
  validatePassword,
  validateRequired,
} from '../utils/validators.js'

/* ── Feature list ─────────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: '🤖', text: 'AI-Powered Resume Analysis' },
  { icon: '🎯', text: 'ATS Compatibility Score' },
  { icon: '🔑', text: 'Smart Keyword Extraction' },
  { icon: '📊', text: 'Resume vs Job Description Matching' },
  { icon: '🧠', text: 'Semantic Similarity Analysis' },
  { icon: '✉️', text: 'AI Cover Letter Generation' },
  { icon: '📋', text: 'Job Recommendations & Application Tracking' },
]

/* ── Eye icon (show/hide password) ───────────────────────────────────────── */
function EyeIcon({ visible }) {
  return visible ? (
    /* Eye-off: password visible, clicking will hide */
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7
           a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878
           l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59
           3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025
           10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    /* Eye: password hidden, clicking will show */
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7
           -1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

/* ── Reusable text / email field ─────────────────────────────────────────── */
function Field({ id, label, type = 'text', autoComplete, value, onChange, error, placeholder }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`input-field ${error ? 'border-coral-500/50' : ''}`}
        aria-describedby={error ? `${id}-err` : undefined}
      />
      {error && (
        <p id={`${id}-err`} className="mt-1 text-xs text-coral-400 flex items-center gap-1">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      )}
    </div>
  )
}

/* ── Password field with show/hide toggle ────────────────────────────────── */
function PasswordField({ id, label, autoComplete, value, onChange, error, placeholder }) {
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
          aria-describedby={error ? `${id}-err` : undefined}
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
        <p id={`${id}-err`} className="mt-1 text-xs text-coral-400 flex items-center gap-1">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      )}
    </div>
  )
}

/* ── Forgot Password Modal ────────────────────────────────────────────────── */
function ForgotPasswordModal({ onClose }) {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)   // {status, message}
  const [error,   setError]   = useState('')

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  async function handleSubmit(ev) {
    ev.preventDefault()
    const emailErr = validateEmail(email)
    if (emailErr) { setError(emailErr); return }
    setLoading(true)
    setError('')
    try {
      const res = await authApi.forgotPassword(email)
      setResult(res)
    } catch (err) {
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-pw-title"
    >
      <div
        className="bg-navy-600 border border-white/[0.1] rounded-2xl shadow-card-lg w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 id="forgot-pw-title" className="text-base font-bold text-white">Forgot Password?</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your email address and we&apos;ll send you a reset link.
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost w-7 h-7 rounded-lg text-sm">✕</button>
        </div>

        {result ? (
          /* Done state */
          <div className="space-y-4">
            {result.status === 'unavailable' ? (
              <Alert variant="warning" message={result.message} />
            ) : (
              <Alert variant="success" message={result.message} />
            )}
            <button onClick={onClose} className="btn-gradient w-full justify-center">
              Back to Sign In
            </button>
          </div>
        ) : (
          /* Input form */
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {error && <Alert variant="error" message={error} />}
            <div>
              <label htmlFor="fp-email" className="label">Email Address</label>
              <input
                id="fp-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                placeholder="you@example.com"
                className="input-field"
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-gradient flex-1 justify-center">
                {loading ? <><Spinner size="sm" /> Sending…</> : 'Send Reset Link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

/* ── Sign In Form ─────────────────────────────────────────────────────────── */
function SignInForm() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [errors,     setErrors]     = useState({})
  const [apiError,   setApiError]   = useState('')
  const [loading,    setLoading]    = useState(false)
  const [showForgot, setShowForgot] = useState(false)

  function validate() {
    const e = {}
    const emailErr = validateEmail(email)
    const passErr  = validatePassword(password)
    if (emailErr) e.email    = emailErr
    if (passErr)  e.password = passErr
    setErrors(e)
    return !emailErr && !passErr
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    setApiError('')
    if (!validate()) return
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setApiError(err?.response?.data?.message || err?.response?.data?.detail || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Alert message={apiError} variant="error" />

        <Field
          id="signin-email" label="Email Address" type="email" autoComplete="email"
          value={email} onChange={(e) => { setEmail(e.target.value); setApiError('') }}
          error={errors.email} placeholder="you@example.com"
        />

        <div>
          <PasswordField
            id="signin-password" label="Password" autoComplete="current-password"
            value={password} onChange={(e) => { setPassword(e.target.value); setApiError('') }}
            error={errors.password} placeholder="••••••••"
          />
          <div className="flex items-center justify-end mt-1.5">
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-xs text-primary-400 hover:text-primary-300 hover:underline focus:outline-none transition-colors"
            >
              Forgot Password?
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded accent-primary-500" />
          <span className="text-sm text-slate-400">Remember me</span>
        </label>

        <button type="submit" disabled={loading} className="btn-gradient w-full justify-center py-2.5">
          {loading ? <><Spinner size="sm" /> Signing in…</> : 'Sign In →'}
        </button>
      </form>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </>
  )
}

/* ── Register Form ────────────────────────────────────────────────────────── */
const ROLES = [
  { value: '',          label: 'Select your role…' },
  { value: 'student',   label: '🎓 Student'        },
  { value: 'jobseeker', label: '💼 Job Seeker'      },
  { value: 'recruiter', label: '🏢 Recruiter'       },
]

function RegisterForm({ onRegistered }) {
  const [form,     setForm]     = useState({ full_name: '', email: '', password: '', confirm: '', role: '' })
  const [errors,   setErrors]   = useState({})
  const [apiError, setApiError] = useState('')
  const [loading,  setLoading]  = useState(false)

  function set(field) {
    return (e) => { setForm((prev) => ({ ...prev, [field]: e.target.value })); setApiError('') }
  }

  function validate() {
    const e = {}
    const nameErr  = validateRequired(form.full_name, 'Full name')
    const emailErr = validateEmail(form.email)
    const passErr  = validatePassword(form.password)
    if (nameErr)  e.full_name = nameErr
    if (emailErr) e.email     = emailErr
    if (passErr)  e.password  = passErr
    if (!form.confirm)                        e.confirm = 'Please confirm your password.'
    else if (form.confirm !== form.password)  e.confirm = 'Passwords do not match.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    setApiError('')
    if (!validate()) return
    setLoading(true)
    try {
      await authApi.register({ email: form.email, full_name: form.full_name, password: form.password })
      onRegistered()
    } catch (err) {
      const detail = err?.response?.data?.message || err?.response?.data?.detail
      setApiError(detail || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Alert message={apiError} variant="error" />

      <Field id="reg-name" label="Full Name" autoComplete="name"
        value={form.full_name} onChange={set('full_name')} error={errors.full_name} placeholder="Jane Smith" />
      <Field id="reg-email" label="Email Address" type="email" autoComplete="email"
        value={form.email} onChange={set('email')} error={errors.email} placeholder="you@example.com" />
      <PasswordField id="reg-password" label="Password" autoComplete="new-password"
        value={form.password} onChange={set('password')} error={errors.password} placeholder="Minimum 8 characters" />
      <PasswordField id="reg-confirm" label="Confirm Password" autoComplete="new-password"
        value={form.confirm} onChange={set('confirm')} error={errors.confirm} placeholder="Re-enter your password" />

      <div>
        <label htmlFor="reg-role" className="label">
          Role <span className="text-slate-600 font-normal text-xs">(optional)</span>
        </label>
        <select id="reg-role" value={form.role} onChange={set('role')} className="input-field">
          {ROLES.map((r) => (
            <option key={r.value} value={r.value} disabled={!r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      <button type="submit" disabled={loading} className="btn-gradient w-full justify-center py-2.5">
        {loading ? <><Spinner size="sm" /> Creating account…</> : 'Create Account →'}
      </button>
    </form>
  )
}

/* ── Main AuthPage ────────────────────────────────────────────────────────── */
export default function AuthPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab,   setActiveTab]   = useState(location.pathname === '/register' ? 'register' : 'signin')
  const [successMsg,  setSuccessMsg]  = useState('')

  useEffect(() => {
    const target = activeTab === 'signin' ? '/login' : '/register'
    if (location.pathname !== target) navigate(target, { replace: true })
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex bg-navy-900">

      {/* ── LEFT PANEL ──────────────────────────────────────────────────── */}
      <div className="hidden md:flex md:w-[52%] xl:w-[56%] relative overflow-hidden
                      bg-navy-800 flex-col justify-between p-10 xl:p-14">
        {/* Background orbs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary-600/[0.08] blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-blue-500/[0.08] blur-3xl pointer-events-none" />

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #7C3AED 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-purple flex items-center justify-center text-2xl shadow-purple flex-shrink-0">
              📄
            </div>
            <div>
              <span className="text-white font-bold text-sm leading-tight block">
                Job Description Keyword<br />Gap Analyzer
              </span>
            </div>
          </div>
        </div>

        {/* Hero */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-10">
          <h1 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight tracking-tight">
            Job Description<br />
            Keyword Gap<br />
            <span className="text-gradient">Analyzer</span>
          </h1>
          <p className="mt-3 text-lg font-semibold text-primary-300">
            Analyze Your Resume. Land Your Dream Job.
          </p>
          <p className="mt-4 text-slate-400 text-sm xl:text-base leading-relaxed max-w-sm">
            Identify missing skills, measure ATS compatibility, and discover
            relevant career opportunities with AI-powered resume analysis.
          </p>

          <ul className="mt-8 space-y-2.5">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-navy-700 border border-white/[0.08]
                                 flex items-center justify-center text-base shadow-inset">
                  {f.icon}
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-slate-600">
            AI-Powered Resume &amp; Career Analytics Platform
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 sm:px-10 overflow-y-auto">

        {/* Mobile logo */}
        <div className="md:hidden flex flex-col items-center mb-8 text-center px-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-purple flex items-center justify-center text-3xl shadow-purple mb-3">
            📄
          </div>
          <h1 className="text-xl font-bold text-white leading-tight">
            Job Description Keyword Gap Analyzer
          </h1>
          <p className="text-xs text-primary-400 mt-1">Analyze Your Resume. Land Your Dream Job.</p>
        </div>

        <div className="w-full max-w-md">
          <div className="card">
            {successMsg && (
              <Alert variant="success" message={successMsg} className="mb-5" />
            )}

            {/* Tab switcher */}
            <div className="flex rounded-xl bg-navy-800 p-1 mb-6" role="tablist">
              {[
                { id: 'signin',   label: 'Sign In'  },
                { id: 'register', label: 'Register' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => { setActiveTab(tab.id); setSuccessMsg('') }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-purple text-white shadow-purple'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Heading */}
            <div className="mb-5">
              {activeTab === 'signin' ? (
                <>
                  <h2 className="text-xl font-bold text-white">Welcome back</h2>
                  <p className="text-sm text-slate-500 mt-1">Sign in to continue to your dashboard.</p>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-white">Create your account</h2>
                  <p className="text-sm text-slate-500 mt-1">Start analysing your resume against job descriptions today.</p>
                </>
              )}
            </div>

            {activeTab === 'signin' ? (
              <SignInForm />
            ) : (
              <RegisterForm onRegistered={() => {
                setActiveTab('signin')
                setSuccessMsg('Account created successfully. Please sign in.')
              }} />
            )}

            {/* Cross-tab hint */}
            <p className="mt-5 text-center text-sm text-slate-500">
              {activeTab === 'signin' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button onClick={() => { setActiveTab('register'); setSuccessMsg('') }}
                    className="font-medium text-primary-400 hover:text-primary-300 hover:underline focus:outline-none">
                    Register here
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button onClick={() => { setActiveTab('signin'); setSuccessMsg('') }}
                    className="font-medium text-primary-400 hover:text-primary-300 hover:underline focus:outline-none">
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
