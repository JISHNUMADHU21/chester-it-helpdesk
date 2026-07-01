import client from './client'

export const ticketsAPI = {
  // ── LIST & CREATE ─────────────────────────────────────────────────────────
  list: (params = {}) =>
    client.get('/tickets/', { params }),

  create: (data) =>
    client.post('/tickets/', data),

  // ── DETAIL ───────────────────────────────────────────────────────────────
  get: (id) =>
    client.get(`/tickets/${id}/`),

  update: (id, data) =>
    client.patch(`/tickets/${id}/`, data),

  // ── ACTIONS ──────────────────────────────────────────────────────────────
  claim: (id) =>
    client.post(`/tickets/${id}/claim/`),

  assign: (id, data) =>
    client.post(`/tickets/${id}/assign/`, data),

  changeStatus: (id, status) =>
    client.post(`/tickets/${id}/status/`, { status }),

  // ── COMMENTS ─────────────────────────────────────────────────────────────
  getComments: (id) =>
    client.get(`/tickets/${id}/comments/`),

  addComment: (id, body, mentionIds = []) =>
    client.post(`/tickets/${id}/comments/`, {
      body,
      mention_ids: mentionIds,
    }),

  // ── ATTACHMENTS ──────────────────────────────────────────────────────────
  getAttachments: (id) =>
    client.get(`/tickets/${id}/attachments/`),

  uploadAttachment: (id, formData) =>
    client.post(`/tickets/${id}/attachments/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // ── LINKS ────────────────────────────────────────────────────────────────
  addLink: (id, targetTicketId, relationship) =>
    client.post(`/tickets/${id}/links/`, {
      target_ticket: targetTicketId,
      relationship,
    }),

  // ── LABELS ───────────────────────────────────────────────────────────────
  // Used by admin management pages — shows all labels including inactive
  // ones, so they can be reactivated later (not just hard-deleted).
  listLabels: () =>
    client.get('/labels/'),

  // Used by user-facing selection lists (e.g. Create Ticket page) — only
  // active labels, scoped to a specific group (or "All Groups" labels,
  // which always show regardless of group).
  listActiveLabelsByGroup: (groupId) =>
    client.get('/labels/', { params: { group: groupId, active_only: true } }),

  getLabel: (id) =>
    client.get(`/labels/${id}/`),

  createLabel: (data) =>
    client.post('/labels/', data),

  updateLabel: (id, data) =>
    client.patch(`/labels/${id}/`, data),

  deleteLabel: (id) =>
    client.delete(`/labels/${id}/`),
}