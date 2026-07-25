/**
 * Configured Axios instance.
 *
 * - Base URL: VITE_API_URL env var, or '/api/v1' (picked up by the Vite proxy
 *   in dev and by the Nginx proxy in Docker production).
 * - Attaches the JWT access token to every request automatically.
 * - On 401: attempts a silent token refresh once using the stored refresh
 *   token. If the refresh succeeds, the original request is retried with the
 *   new access token. If it fails, tokens are cleared and the user is sent to
 *   /login.
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

// ── Request interceptor — attach access token ─────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor — silent token refresh on 401 ───────────────────────
let _isRefreshing = false
let _failedQueue = []   // requests queued while a refresh is in-flight

function _processQueue(error, token = null) {
  _failedQueue.forEach((p) => {
    if (error) {
      p.reject(error)
    } else {
      p.resolve(token)
    }
  })
  _failedQueue = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Only attempt refresh for 401s that haven't already been retried
    // and are not themselves the refresh call (prevents infinite loop).
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      const refreshToken = localStorage.getItem('refresh_token')

      if (!refreshToken) {
        // No refresh token available — log the user out immediately.
        _clearAndRedirect()
        return Promise.reject(error)
      }

      if (_isRefreshing) {
        // A refresh is already in-flight — queue this request.
        return new Promise((resolve, reject) => {
          _failedQueue.push({ resolve, reject })
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            return apiClient(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      _isRefreshing = true

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        })

        const newAccessToken = data.access_token
        localStorage.setItem('access_token', newAccessToken)
        localStorage.setItem('refresh_token', data.refresh_token)

        apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

        _processQueue(null, newAccessToken)
        return apiClient(originalRequest)
      } catch (refreshError) {
        _processQueue(refreshError, null)
        _clearAndRedirect()
        return Promise.reject(refreshError)
      } finally {
        _isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

function _clearAndRedirect() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

export default apiClient
