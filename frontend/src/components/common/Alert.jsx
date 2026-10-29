const variants = {
  error:   'bg-coral-500/10 border-coral-500/30 text-coral-400',
  success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  info:    'bg-blue-500/10 border-blue-500/30 text-blue-400',
}

const icons = { error: '⚠', success: '✓', warning: '⚠', info: 'ℹ' }

export default function Alert({ variant = 'error', message, className = '' }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${variants[variant]} ${className}`}
    >
      <span className="flex-shrink-0 mt-0.5 text-base" aria-hidden="true">{icons[variant]}</span>
      <span>{message}</span>
    </div>
  )
}
