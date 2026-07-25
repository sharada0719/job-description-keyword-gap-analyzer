import apiClient from './client.js'

export const resumesApi = {
  upload: (formData) =>
    apiClient
      .post('/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),

  list: (skip = 0, limit = 50) =>
    apiClient.get('/resumes/', { params: { skip, limit } }).then((r) => r.data),

  get: (id) =>
    apiClient.get(`/resumes/${id}`).then((r) => r.data),

  delete: (id) =>
    apiClient.delete(`/resumes/${id}`).then((r) => r.data),
}
