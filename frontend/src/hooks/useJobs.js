import { useCallback, useEffect, useState } from 'react'
import { jobsApi } from '../api/jobs.js'

export function useJobs() {
  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await jobsApi.list()
      setJobs(data)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load job descriptions.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const deleteJob = useCallback(async (id) => {
    await jobsApi.delete(id)
    setJobs((prev) => prev.filter((j) => j.id !== id))
  }, [])

  return { jobs, loading, error, refetch: fetchJobs, deleteJob }
}
