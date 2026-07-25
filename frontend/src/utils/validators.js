/** Simple client-side validators — return error string or null */

export function validateEmail(email) {
  if (!email) return 'Email is required.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.'
  return null
}

export function validatePassword(password) {
  if (!password) return 'Password is required.'
  if (password.length < 8) return 'Password must be at least 8 characters.'
  return null
}

export function validateRequired(value, label = 'This field') {
  if (!value || !String(value).trim()) return `${label} is required.`
  return null
}

export function validateFileType(file, allowed = ['pdf', 'docx']) {
  if (!file) return 'Please select a file.'
  const ext = file.name.split('.').pop().toLowerCase()
  if (!allowed.includes(ext)) return `Only ${allowed.join(', ')} files are supported.`
  return null
}

export function validateFileSize(file, maxMB = 5) {
  if (!file) return null
  if (file.size > maxMB * 1024 * 1024) return `File must be smaller than ${maxMB} MB.`
  return null
}
