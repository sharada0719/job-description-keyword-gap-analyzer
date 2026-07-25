import { useCallback, useEffect, useState } from 'react'
import { analysisApi } from '../api/analysis.js'

export function useAnalysisList() {
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const fetchAnalyses = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await analysisApi.list()
      setAnalyses(data)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load analyses.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAnalyses() }, [fetchAnalyses])

  const deleteAnalysis = useCallback(async (id) => {
    await analysisApi.delete(id)
    setAnalyses((prev) => prev.filter((a) => a.id !== id))
  }, [])

  return { analyses, loading, error, refetch: fetchAnalyses, deleteAnalysis }
}

export function useAnalysisDetail(id) {
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    analysisApi
      .get(id)
      .then(setAnalysis)
      .catch((err) =>
        setError(err?.response?.data?.message || 'Failed to load analysis.')
      )
      .finally(() => setLoading(false))
  }, [id])

  return { analysis, loading, error }
}
