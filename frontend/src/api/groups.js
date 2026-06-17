import client from './client'

export const groupsAPI = {
  // ── LIST & CREATE ───────────────────────────────────────────────────────────
  list: () =>
    client.get('/groups/'),

  create: (data) =>
    client.post('/groups/', data),

  // ── DETAIL ─────────────────────────────────────────────────────────────────
  get: (id) =>
    client.get(`/groups/${id}/`),

  update: (id, data) =>
    client.patch(`/groups/${id}/`, data),

  delete: (id) =>
    client.delete(`/groups/${id}/`),

  // ── MEMBERS ────────────────────────────────────────────────────────────────
  getMembers: (id) =>
    client.get(`/groups/${id}/members/`),

  addMember: (id, userId) =>
    client.post(`/groups/${id}/members/add-remove/`, { user_id: userId }),

  removeMember: (id, userId) =>
    client.delete(`/groups/${id}/members/add-remove/`, {
      data: { user_id: userId },
    }),

  // ── SEARCH ─────────────────────────────────────────────────────────────────
  // Used by the assignee dropdown — returns groups + users combined
  search: (query = '') =>
    client.get('/groups/search/', { params: { q: query } }),

  // Returns groups the current user belongs to
  mine: () =>
    client.get('/groups/mine/'),
}