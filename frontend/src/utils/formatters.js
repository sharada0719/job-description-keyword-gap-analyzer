/**
 * Shared display formatting helpers.
 */

/** Format a score (0–1) as a percentage string, e.g. 0.853 → "85%" */
export function formatScore(score) {
  if (score == null || isNaN(score)) return '—'
  return `${Math.round(score * 100)}%`
}

/** Return a Tailwind colour class based on a 0–1 score */
export function scoreColour(score) {
  if (score >= 0.75) return 'text-green-600'
  if (score >= 0.5)  return 'text-yellow-600'
  return 'text-red-600'
}

/** Return a Tailwind bg colour class based on a 0–1 score */
export function scoreBgColour(score) {
  if (score >= 0.75) return 'bg-green-100 text-green-800'
  if (score >= 0.5)  return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
}

/** Format an ISO date string as a locale date, e.g. "Jul 23, 2026" */
export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

/** Truncate a string to `maxLen` characters with ellipsis */
export function truncate(str, maxLen = 60) {
  if (!str) return ''
  return str.length <= maxLen ? str : str.slice(0, maxLen) + '…'
}
