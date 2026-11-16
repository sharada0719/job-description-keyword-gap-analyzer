import { useCallback, useEffect, useRef, useState } from 'react'
import { analysisApi } from '../api/analysis.js'

/**
 * Extract a human-readable error message from an Axios error.
 */
function extractError(err, fallback) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.detail ||
    err?.message ||
    fallback
  )
}

export function useAnalysisList() {
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const abortRef = useRef(null)

  const fetchAnalyses = useCallback(async () => {
    // Cancel any in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    try {
      const data = await analysisApi.list(0, 50, { signal: controller.signal })
      setAnalyses(data)
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return
      setError(extractError(err, 'Failed to load analyses.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalyses()
    return () => abortRef.current?.abort()
  }, [fetchAnalyses])

  const deleteAnalysis = useCallback(async (id) => {
    setDeleteError(null)
    try {
      await analysisApi.delete(id)
      setAnalyses((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      const msg = extractError(err, 'Failed to delete analysis.')
      setDeleteError(msg)
      throw err  // Re-throw so callers can also handle if needed
    }
  }, [])

  return { analyses, loading, error, deleteError, refetch: fetchAnalyses, deleteAnalysis }
}

export function useAnalysisDetail(id) {
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const abortRef = useRef(null)

  useEffect(() => {
    if (!id) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    analysisApi
      .get(id, { signal: controller.signal })
      .then(setAnalysis)
      .catch((err) => {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return
        setError(extractError(err, 'Failed to load analysis.'))
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [id])

  return { analysis, loading, error }
}
