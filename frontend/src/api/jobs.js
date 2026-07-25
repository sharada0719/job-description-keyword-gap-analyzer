import apiClient from './client.js'

export const jobsApi = {
  create: (data) =>
    apiClient.post('/jobs/', data).then((r) => r.data),

  list: (skip = 0, limit = 50) =>
    apiClient.get('/jobs/', { params: { skip, limit } }).then((r) => r.data),

  get: (id) =>
    apiClient.get(`/jobs/${id}`).then((r) => r.data),

  update: (id, data) =>
    apiClient.patch(`/jobs/${id}`, data).then((r) => r.data),

  delete: (id) =>
    apiClient.delete(`/jobs/${id}`).then((r) => r.data),
}
