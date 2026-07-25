import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Alert from '../components/common/Alert.jsx'
import Spinner from '../components/common/Spinner.jsx'
import { validateEmail, validatePassword, validateRequired } from '../utils/validators.js'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate     = useNavigate()

  const [form,     setForm]     = useState({ email: '', full_name: '', password: '' })
  const [errors,   setErrors]   = useState({})
  const [apiError, setApiError] = useState('')
  const [loading,  setLoading]  = useState(false)

  function set(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  function validate() {
    const e = {}
    const nameErr  = validateRequired(form.full_name, 'Full name')
    const emailErr = validateEmail(form.email)
    const passErr  = validatePassword(form.password)
    if (nameErr)  e.full_name = nameErr
    if (emailErr) e.email     = emailErr
    if (passErr)  e.password  = passErr
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setApiError('')
    try {
      await register(form.email, form.full_name, form.password)
      navigate('/dashboard')
    } catch (err) {
      setApiError(
        err?.response?.data?.message || 'Registration failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-5xl" aria-hidden="true">🔍</span>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="mt-2 text-sm text-gray-500">Start analysing your resume today</p>
        </div>

        <div className="card">
          <Alert message={apiError} variant="error" className="mb-4" />

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="full_name" className="label">Full Name</label>
              <input
                id="full_name" type="text" autoComplete="name"
                className="input-field"
                value={form.full_name}
                onChange={set('full_name')}
              />
              {errors.full_name && (
                <p className="mt-1 text-xs text-red-600">{errors.full_name}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email" type="email" autoComplete="email"
                className="input-field"
                value={form.email}
                onChange={set('email')}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password" type="password" autoComplete="new-password"
                className="input-field"
                value={form.password}
                onChange={set('password')}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}
              <p className="mt-1 text-xs text-gray-400">Minimum 8 characters.</p>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Spinner size="sm" /> : 'Create Account'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
