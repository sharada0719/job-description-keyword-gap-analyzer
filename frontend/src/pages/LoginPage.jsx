/**
 * AuthPage — unified Sign In / Register split-screen page (CareerLens AI dark theme).
 *
 * Routes: /login (default) and /register (redirected)
 * Logic preserved exactly — only styling changed to the dark theme.
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

const FEATURES = [
  { icon: '🤖', text: 'AI-Powered Resume Analysis' },
  { icon: '🎯', text: 'ATS Compatibility Score' },
  { icon: '🔑', text: 'Smart Keyword Extraction' },
  { icon: '📊', text: 'Resume vs Job Description Matching' },
  { icon: '🧠', text: 'Semantic Similarity Analysis' },
]

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
      navigate('/dashboard', { replace: true })
      onSuccess?.()
    } catch (err) {
      setApiError(err?.response?.data?.message || err?.response?.data?.detail || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Alert message={apiError} variant="error" />

      <Field
        id="signin-email" label="Email Address" type="email" autoComplete="email"
        value={email} onChange={(e) => { setEmail(e.target.value); setApiError('') }}
        error={errors.email} placeholder="you@example.com"
      />
      <Field
        id="signin-password" label="Password" type="password" autoComplete="current-password"
        value={password} onChange={(e) => { setPassword(e.target.value); setApiError('') }}
        error={errors.password} placeholder="••••••••"
      />

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
          className="h-4 w-4 rounded accent-primary-500" />
        <span className="text-sm text-slate-400">Remember me</span>
      </label>

      <button type="submit" disabled={loading} className="btn-gradient w-full justify-center py-2.5">
        {loading ? <><Spinner size="sm" /> Signing in…</> : 'Sign In'}
      </button>
    </form>
  )
}

const ROLES = [
  { value: '',          label: 'Select your role…' },
  { value: 'student',   label: '🎓 Student'       },
  { value: 'jobseeker', label: '💼 Job Seeker'     },
  { value: 'recruiter', label: '🏢 Recruiter'      },
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
    const nameErr    = validateRequired(form.full_name, 'Full name')
    const emailErr   = validateEmail(form.email)
    const passErr    = validatePassword(form.password)
    if (nameErr)  e.full_name = nameErr
    if (emailErr) e.email     = emailErr
    if (passErr)  e.password  = passErr
    if (!form.confirm)              e.confirm = 'Please confirm your password.'
    else if (form.confirm !== form.password) e.confirm = 'Passwords do not match.'
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
      <Field id="reg-password" label="Password" type="password" autoComplete="new-password"
        value={form.password} onChange={set('password')} error={errors.password} placeholder="Minimum 8 characters" />
      <Field id="reg-confirm" label="Confirm Password" type="password" autoComplete="new-password"
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
        {loading ? <><Spinner size="sm" /> Creating account…</> : 'Create Account'}
      </button>
    </form>
  )
}

export default function AuthPage() {
  const location = useLocation()
  const [activeTab,    setActiveTab]    = useState(location.pathname === '/register' ? 'register' : 'signin')
  const [successMsg, setSuccessMsg] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const target = activeTab === 'signin' ? '/login' : '/register'
    if (location.pathname !== target) navigate(target, { replace: true })
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  function switchToSignIn() {
    setActiveTab('signin')
    setSuccessMsg('Account created successfully. Please sign in.')
  }

  return (
    <div className="min-h-screen flex bg-navy-900">

      {/* ── LEFT PANEL — Branding ─────────────────────────────────────────── */}
      <div className="hidden md:flex md:w-[52%] xl:w-[55%] relative overflow-hidden
                      bg-navy-800 flex-col justify-between p-10 xl:p-14">

        {/* Decorative gradient orbs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full
                        bg-primary-600/[0.08] blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full
                        bg-blue-500/[0.08] blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[500px] h-[500px] rounded-full
                        bg-primary-600/[0.04] blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-purple flex items-center justify-center text-xl shadow-purple">
              🔍
            </div>
            <div>
              <span className="text-white font-bold text-lg tracking-tight">CareerLens</span>
              <span className="block text-[10px] text-primary-400 font-medium mt-0.5">AI Platform</span>
            </div>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-12">
          <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
            Analyze Your Resume.<br />
            <span className="text-gradient">Land Your Dream Job.</span>
          </h1>
          <p className="mt-5 text-slate-400 text-base xl:text-lg leading-relaxed max-w-sm">
            Upload your resume, compare against job descriptions, get an ATS
            compatibility score, and discover matching opportunities — all
            powered by AI.
          </p>

          <ul className="mt-8 space-y-3.5">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-navy-600 border border-white/[0.08]
                                 flex items-center justify-center text-base">
                  {f.icon}
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-slate-600">Smart Resume &amp; Job Description Analysis Platform</p>
        </div>
      </div>

      {/* ── RIGHT PANEL — Auth forms ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 sm:px-10">

        {/* Mobile logo */}
        <div className="md:hidden flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-purple flex items-center justify-center text-2xl shadow-purple">
            🔍
          </div>
          <h2 className="mt-3 text-lg font-bold text-white">CareerLens AI</h2>
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
                      ? 'bg-navy-500 text-white shadow-card'
                      : 'text-slate-500 hover:text-slate-300'
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

            {/* Active form */}
            {activeTab === 'signin' ? <SignInForm /> : <RegisterForm onRegistered={switchToSignIn} />}

            {/* Cross-tab hint */}
            <p className="mt-5 text-center text-sm text-slate-500">
              {activeTab === 'signin' ? (
                <>
                  Don't have an account?{' '}
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
