import apiClient from './client.js'

export const analysisApi = {
  run: (data) =>
    apiClient.post('/analyses/', data).then((r) => r.data),

  list: (skip = 0, limit = 50) =>
    apiClient.get('/analyses/', { params: { skip, limit } }).then((r) => r.data),

  get: (id) =>
    apiClient.get(`/analyses/${id}`).then((r) => r.data),

  delete: (id) =>
    apiClient.delete(`/analyses/${id}`).then((r) => r.data),
}
