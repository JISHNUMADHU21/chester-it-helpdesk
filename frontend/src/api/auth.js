import client from './client'

export const authAPI = {
  // ── AUTH ──────────────────────────────────────────────────────────────────
  login: (email, password) =>
    client.post('/auth/login/', { email, password }),

  logout: (refreshToken) =>
    client.post('/auth/logout/', { refresh: refreshToken }),

  refreshToken: (refreshToken) =>
    client.post('/auth/token/refresh/', { refresh: refreshToken }),

  // ── CURRENT USER ──────────────────────────────────────────────────────────
  me: () =>
    client.get('/auth/me/'),

  updateMe: (data) =>
    client.patch('/auth/me/', data),

  updateAvatar: (formData) =>
    client.patch('/auth/me/avatar/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  changePassword: (currentPassword, newPassword, confirmPassword) =>
    client.post('/auth/me/change-password/', {
      current_password:  currentPassword,
      new_password:      newPassword,
      confirm_password:  confirmPassword,
    }),

  // ── USER MANAGEMENT (admin+) ──────────────────────────────────────────────
  listUsers: (params) =>
    client.get('/users/', { params }),

  getUser: (id) =>
    client.get(`/users/${id}/`),

  createUser: (data) =>
    client.post('/users/', data),

  updateUser: (id, data) =>
    client.patch(`/users/${id}/`, data),

  deleteUser: (id) =>
    client.delete(`/users/${id}/`),

  searchUsers: (q) =>
    client.get('/users/search/', { params: { q } }),
}