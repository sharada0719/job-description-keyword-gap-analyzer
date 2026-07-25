import apiClient from './client.js'

export const authApi = {
  register: (data) =>
    apiClient.post('/auth/register', data).then((r) => r.data),

  login: (data) =>
    apiClient.post('/auth/login', data).then((r) => r.data),

  refresh: (refreshToken) =>
    apiClient
      .post('/auth/refresh', { refresh_token: refreshToken })
      .then((r) => r.data),

  getMe: () =>
    apiClient.get('/users/me').then((r) => r.data),

  updateProfile: (data) =>
    apiClient.patch('/users/me', data).then((r) => r.data),
}
