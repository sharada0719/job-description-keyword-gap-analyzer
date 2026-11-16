import apiClient from './client.js'

export const analysisApi = {
  run: (data, { signal } = {}) =>
    apiClient.post('/analyses/', data, { signal }).then((r) => r.data),

  list: (skip = 0, limit = 50, { signal } = {}) =>
    apiClient.get('/analyses/', { params: { skip, limit }, signal }).then((r) => r.data),

  get: (id, { signal } = {}) =>
    apiClient.get(`/analyses/${id}`, { signal }).then((r) => r.data),

  delete: (id) =>
    apiClient.delete(`/analyses/${id}`).then((r) => r.data),
}
