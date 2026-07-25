import { useCallback, useEffect, useState } from 'react'
import { resumesApi } from '../api/resumes.js'

export function useResumes() {
  const [resumes, setResumes]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const fetchResumes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await resumesApi.list()
      setResumes(data)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load resumes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchResumes() }, [fetchResumes])

  const deleteResume = useCallback(async (id) => {
    await resumesApi.delete(id)
    setResumes((prev) => prev.filter((r) => r.id !== id))
  }, [])

  return { resumes, loading, error, refetch: fetchResumes, deleteResume }
}
