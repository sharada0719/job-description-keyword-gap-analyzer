import apiClient from './client.js'

export const applicationsApi = {
  create: (data) =>
    apiClient.post('/applications/', data).then((r) => r.data),

  list: (skip = 0, limit = 100) =>
    apiClient.get('/applications/', { params: { skip, limit } }).then((r) => r.data),

  get: (id) =>
    apiClient.get(`/applications/${id}`).then((r) => r.data),

  update: (id, data) =>
    apiClient.put(`/applications/${id}`, data).then((r) => r.data),

  updateStatus: (id, status) =>
    apiClient.patch(`/applications/${id}/status`, { application_status: status }).then((r) => r.data),

  delete: (id) =>
    apiClient.delete(`/applications/${id}`).then((r) => r.data),

  stats: () =>
    apiClient.get('/applications/stats').then((r) => r.data),
}
