/**
 * Generic async data-fetching hook.
 * Usage:  const { data, loading, error, execute } = useApi(apiFn, autoFetch)
 */
import { useCallback, useEffect, useState } from 'react'

export function useApi(apiFn, { immediate = false, args = [] } = {}) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError]     = useState(null)

  const execute = useCallback(
    async (...callArgs) => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiFn(...(callArgs.length ? callArgs : args))
        setData(result)
        return result
      } catch (err) {
        const message =
          err?.response?.data?.message ||
          err?.response?.data?.detail ||
          err?.message ||
          'An unexpected error occurred.'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiFn]
  )

  useEffect(() => {
    if (immediate) execute(...args)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate])

  return { data, loading, error, execute, setData }
}
