import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { authApi } from '../api/auth.js'
import Alert from '../components/common/Alert.jsx'
import Spinner from '../components/common/Spinner.jsx'
import { validatePassword } from '../utils/validators.js'

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth()

  const [fullName,    setFullName]    = useState(user?.full_name || '')
  const [password,    setPassword]    = useState('')
  const [saving,      setSaving]      = useState(false)
  const [success,     setSuccess]     = useState('')
  const [apiError,    setApiError]    = useState('')
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
      <div>
        <p className="text-xs text-primary-400 font-medium uppercase tracking-wider mb-1">Account</p>
        <h1 className="page-title">Profile</h1>
      </div>

      <div className="card space-y-6">
        {/* User info */}
        <div className="flex items-center gap-4 pb-5 border-b border-white/[0.07]">
          <div className="w-14 h-14 rounded-2xl bg-gradient-purple flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {user?.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white">{user?.full_name}</p>
            <p className="text-sm text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>

        <Alert message={apiError} variant="error" />
        <Alert message={success}  variant="success" />

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
              New Password <span className="text-slate-600 font-normal">(leave blank to keep current)</span>
            </label>
            <input
              id="new-password" type="password" autoComplete="new-password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-coral-400">{fieldErrors.password}</p>
            )}
          </div>

          <button type="submit" className="btn-gradient" disabled={saving}>
            {saving ? <><Spinner size="sm" /> Saving…</> : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
