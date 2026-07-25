/**
 * AuthPage — unified Sign In / Register split-screen page.
 *
 * Routes that land here:  /login  (default)  and  /register  (redirected)
 *
 * What this file does:
 *   - Renders the split-screen SaaS layout
 *   - Left panel: branding + feature highlights
 *   - Right panel: tab switcher with Sign In and Register forms
 *
 * What this file does NOT do:
 *   - Modify any backend auth logic
 *   - Change token storage or AuthContext
 *   - Change any other page or module
 */
import React, { useEffect, useState } from 'react'
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

// ─── Feature list shown on the left panel ────────────────────────────────────
const FEATURES = [
  { icon: '🤖', text: 'AI-Powered Resume Analysis' },
  { icon: '🎯', text: 'ATS Compatibility Score' },
  { icon: '🔑', text: 'Smart Keyword Extraction' },
  { icon: '📊', text: 'Resume vs Job Description Matching' },
  { icon: '🧠', text: 'Semantic Similarity Analysis' },
]

// ─── Tiny reusable input ─────────────────────────────────────────────────────
function Field({ id, label, type = 'text', autoComplete, value, onChange, error, placeholder }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`block w-full rounded-xl border px-4 py-2.5 text-sm text-gray-900
          placeholder-gray-400 bg-white shadow-sm transition-colors
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          ${error ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
        aria-describedby={error ? `${id}-err` : undefined}
      />
      {error && (
        <p id={`${id}-err`} className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      )}
    </div>
  )
}

// ─── Sign In form ─────────────────────────────────────────────────────────────
function SignInForm({ onSuccess }) {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [rememberMe,  setRememberMe]  = useState(false)
  const [errors,      setErrors]      = useState({})
  const [apiError,    setApiError]    = useState('')
  const [loading,     setLoading]     = useState(false)

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
      // Remember Me: already handled by localStorage in AuthContext.
      // If unchecked, tokens are still stored for this session — a full
      // sessionStorage vs localStorage split is a post-MVP enhancement.
      navigate('/dashboard', { replace: true })
      onSuccess?.()
    } catch (err) {
      setApiError(
        err?.response?.data?.message ||
        err?.response?.data?.detail  ||
        'Invalid email or password. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Alert message={apiError} variant="error" className="rounded-xl text-sm" />

      <Field
        id="signin-email"
        label="Email Address"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setApiError('') }}
        error={errors.email}
        placeholder="you@example.com"
      />

      <Field
        id="signin-password"
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => { setPassword(e.target.value); setApiError('') }}
        error={errors.password}
        placeholder="••••••••"
      />

      {/* Remember Me */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary-600
                     focus:ring-primary-500 cursor-pointer"
        />
        <span className="text-sm text-gray-600">Remember me</span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl
                   bg-primary-600 hover:bg-primary-700 active:bg-primary-800
                   text-white text-sm font-semibold shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                   disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
      >
        {loading ? (
          <>
            <Spinner size="sm" className="border-white border-t-transparent" />
            Signing in…
          </>
        ) : (
          'Sign In'
        )}
      </button>
    </form>
  )
}

// ─── Register form ────────────────────────────────────────────────────────────
const ROLES = [
  { value: '',          label: 'Select your role…' },
  { value: 'student',   label: '🎓 Student'         },
  { value: 'jobseeker', label: '💼 Job Seeker'       },
  { value: 'recruiter', label: '🏢 Recruiter'        },
]

function RegisterForm({ onRegistered }) {
  const [form,     setForm]     = useState({
    full_name: '', email: '', password: '', confirm: '', role: '',
  })
  const [errors,   setErrors]   = useState({})
  const [apiError, setApiError] = useState('')
  const [loading,  setLoading]  = useState(false)

  function set(field) {
    return (e) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
      setApiError('')
    }
  }

  function validate() {
    const e = {}
    const nameErr    = validateRequired(form.full_name, 'Full name')
    const emailErr   = validateEmail(form.email)
    const passErr    = validatePassword(form.password)
    if (nameErr)  e.full_name = nameErr
    if (emailErr) e.email     = emailErr
    if (passErr)  e.password  = passErr
    if (!form.confirm)
      e.confirm = 'Please confirm your password.'
    else if (form.confirm !== form.password)
      e.confirm = 'Passwords do not match.'
    // Role is informational only (not sent to backend) — no hard validation
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    setApiError('')
    if (!validate()) return
    setLoading(true)
    try {
      // Call the API directly — we intentionally do NOT auto-login here.
      // The backend registers the user and returns tokens, but we discard
      // the tokens and ask the user to sign in manually so they see the
      // "Account created" confirmation message.
      await authApi.register({
        email:     form.email,
        full_name: form.full_name,
        password:  form.password,
      })
      onRegistered()   // switches tab + shows success banner
    } catch (err) {
      const detail = err?.response?.data?.message || err?.response?.data?.detail
      setApiError(detail || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Alert message={apiError} variant="error" className="rounded-xl text-sm" />

      <Field
        id="reg-name"
        label="Full Name"
        autoComplete="name"
        value={form.full_name}
        onChange={set('full_name')}
        error={errors.full_name}
        placeholder="Jane Smith"
      />

      <Field
        id="reg-email"
        label="Email Address"
        type="email"
        autoComplete="email"
        value={form.email}
        onChange={set('email')}
        error={errors.email}
        placeholder="you@example.com"
      />

      <Field
        id="reg-password"
        label="Password"
        type="password"
        autoComplete="new-password"
        value={form.password}
        onChange={set('password')}
        error={errors.password}
        placeholder="Minimum 8 characters"
      />

      <Field
        id="reg-confirm"
        label="Confirm Password"
        type="password"
        autoComplete="new-password"
        value={form.confirm}
        onChange={set('confirm')}
        error={errors.confirm}
        placeholder="Re-enter your password"
      />

      {/* Role dropdown — informational, not sent to backend */}
      <div>
        <label htmlFor="reg-role" className="block text-sm font-medium text-gray-700 mb-1.5">
          Role <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </label>
        <select
          id="reg-role"
          value={form.role}
          onChange={set('role')}
          className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5
                     text-sm text-gray-900 shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                     transition-colors"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value} disabled={!r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl
                   bg-primary-600 hover:bg-primary-700 active:bg-primary-800
                   text-white text-sm font-semibold shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                   disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
      >
        {loading ? (
          <>
            <Spinner size="sm" className="border-white border-t-transparent" />
            Creating account…
          </>
        ) : (
          'Create Account'
        )}
      </button>
    </form>
  )
}

// ─── Main AuthPage ────────────────────────────────────────────────────────────
export default function AuthPage() {
  const location = useLocation()

  // Start on Register tab if the user navigated to /register
  const [activeTab,    setActiveTab]    = useState(
    location.pathname === '/register' ? 'register' : 'signin'
  )
  const [successMsg, setSuccessMsg] = useState('')

  // Keep URL in sync with active tab (cosmetic — does not break any route)
  const navigate = useNavigate()
  useEffect(() => {
    const target = activeTab === 'signin' ? '/login' : '/register'
    if (location.pathname !== target) {
      navigate(target, { replace: true })
    }
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  function switchToSignIn() {
    setActiveTab('signin')
    setSuccessMsg('Account created successfully. Please sign in.')
  }

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT PANEL — Branding ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative overflow-hidden
                      bg-gradient-to-b from-[#3B82F6] via-[#2563EB] to-[#1D4ED8]
                      flex-col justify-between p-10 xl:p-14">

        {/* Subtle decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full
                        bg-white/[0.04] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full
                        bg-white/[0.04] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[600px] h-[600px] rounded-full
                        bg-white/[0.02] pointer-events-none" />

        {/* Logo / wordmark */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center
                            text-2xl shadow-lg backdrop-blur-sm">
              🔍
            </div>
            <span className="text-white font-bold text-xl tracking-tight">
              JD Gap Analyzer
            </span>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-12">
          <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
            Job Description<br />
            <span className="text-primary-200">Keyword Gap</span><br />
            Analyzer
          </h1>
          <p className="mt-5 text-primary-100 text-base xl:text-lg leading-relaxed max-w-sm">
            Analyze your resume, identify missing keywords, compare against job
            descriptions, and improve your ATS score with AI-powered insights.
          </p>

          {/* Feature list */}
          <ul className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-sm text-primary-100">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white/15
                                 flex items-center justify-center text-base">
                  {f.icon}
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer note */}
        <div className="relative z-10">
          <p className="text-primary-300 text-xs">
            Smart Resume &amp; Job Description Analysis Platform
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — Auth forms ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center
                      bg-gray-50 px-6 py-10 sm:px-10">

        {/* Mobile logo (shown only on small screens) */}
        <div className="lg:hidden flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center
                          justify-center text-2xl shadow-lg">
            🔍
          </div>
          <h2 className="mt-3 text-xl font-bold text-gray-900">Job Gap Analyzer</h2>
        </div>

        {/* Auth card */}
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

            {/* Success banner (after registration) */}
            {successMsg && (
              <Alert
                variant="success"
                message={successMsg}
                className="mb-5 rounded-xl text-sm"
              />
            )}

            {/* Tab switcher */}
            <div className="flex rounded-xl bg-gray-100 p-1 mb-6" role="tablist">
              {[
                { id: 'signin',   label: 'Sign In'  },
                { id: 'register', label: 'Register' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => { setActiveTab(tab.id); setSuccessMsg('') }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${activeTab === tab.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Heading */}
            <div className="mb-6">
              {activeTab === 'signin' ? (
                <>
                  <h2 className="text-xl font-bold text-gray-900">Welcome back</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Sign in to continue to your dashboard.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-gray-900">Create your account</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Start analysing your resume against job descriptions today.
                  </p>
                </>
              )}
            </div>

            {/* Active form */}
            <div>
              {activeTab === 'signin' ? (
                <SignInForm />
              ) : (
                <RegisterForm onRegistered={switchToSignIn} />
              )}
            </div>

            {/* Cross-tab hint */}
            <p className="mt-5 text-center text-sm text-gray-500">
              {activeTab === 'signin' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    onClick={() => { setActiveTab('register'); setSuccessMsg('') }}
                    className="font-medium text-primary-600 hover:text-primary-700
                               hover:underline focus:outline-none"
                  >
                    Register here
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={() => { setActiveTab('signin'); setSuccessMsg('') }}
                    className="font-medium text-primary-600 hover:text-primary-700
                               hover:underline focus:outline-none"
                  >
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
