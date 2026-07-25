import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { authApi } from '../api/auth.js'
import Alert from '../components/common/Alert.jsx'
import Spinner from '../components/common/Spinner.jsx'
import { validatePassword } from '../utils/validators.js'

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth()

  const [fullName,   setFullName]   = useState(user?.full_name || '')
  const [password,   setPassword]   = useState('')
  const [saving,     setSaving]     = useState(false)
  const [success,    setSuccess]    = useState('')
  const [apiError,   setApiError]   = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  function validate() {
    const e = {}
    if (password && validatePassword(password)) e.password = validatePassword(password)
    setFieldErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setApiError('')
    setSuccess('')
    try {
      const payload = {}
      if (fullName !== user?.full_name) payload.full_name = fullName
      if (password) payload.password = password
      if (Object.keys(payload).length === 0) {
        setSuccess('No changes to save.')
        return
      }
      await authApi.updateProfile(payload)
      await refreshProfile()
      setPassword('')
      setSuccess('Profile updated successfully.')
    } catch (err) {
      setApiError(err?.response?.data?.message || 'Update failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      <div className="card">
        <div className="mb-6 space-y-1">
          <p className="text-sm text-gray-500">Email</p>
          <p className="font-medium text-gray-900">{user?.email}</p>
        </div>

        <Alert message={apiError} variant="error"   className="mb-4" />
        <Alert message={success}  variant="success" className="mb-4" />

        <form onSubmit={handleSave} noValidate className="space-y-4">
          <div>
            <label htmlFor="full-name" className="label">Full Name</label>
            <input
              id="full-name" type="text" className="input-field"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="new-password" className="label">
              New Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span>
            </label>
            <input
              id="new-password" type="password" autoComplete="new-password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
            )}
          </div>

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <><Spinner size="sm" /> Saving…</> : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
