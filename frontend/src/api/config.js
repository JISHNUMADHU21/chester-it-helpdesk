import client from './client'

// ── STATUS ────────────────────────────────────────────────────────────────────
export const statusAPI = {
  list:   ()         => client.get('/config/statuses/'),
  get:    (id)       => client.get(`/config/statuses/${id}/`),
  create: (data)     => client.post('/config/statuses/', data),
  update: (id, data) => client.patch(`/config/statuses/${id}/`, data),
  delete: (id)       => client.delete(`/config/statuses/${id}/`),
}

// ── PRIORITY ──────────────────────────────────────────────────────────────────
export const priorityAPI = {
  list:   ()         => client.get('/config/priorities/'),

  // Used by user-facing selection lists (e.g. Create Ticket page) — only
  // active records, never shows anything the admin has deactivated.
  listActive: ()      => client.get('/config/priorities/', { params: { active_only: true } }),

  get:    (id)       => client.get(`/config/priorities/${id}/`),
  create: (data)     => client.post('/config/priorities/', data),
  update: (id, data) => client.patch(`/config/priorities/${id}/`, data),
  delete: (id)       => client.delete(`/config/priorities/${id}/`),
}

// ── URGENCY ───────────────────────────────────────────────────────────────────
export const urgencyAPI = {
  list:   ()         => client.get('/config/urgencies/'),

  // Used by user-facing selection lists (e.g. Create Ticket page) — only
  // active records, never shows anything the admin has deactivated.
  listActive: ()      => client.get('/config/urgencies/', { params: { active_only: true } }),

  get:    (id)       => client.get(`/config/urgencies/${id}/`),
  create: (data)     => client.post('/config/urgencies/', data),
  update: (id, data) => client.patch(`/config/urgencies/${id}/`, data),
  delete: (id)       => client.delete(`/config/urgencies/${id}/`),
}

// ── WORK TYPE ─────────────────────────────────────────────────────────────────
export const workTypeAPI = {
  list:       (params) => client.get('/config/work-types/', { params }),

  // Used by admin management pages — shows inactive records too, so they
  // can be reactivated later (not just hard-deleted).
  listByGroup: (groupId) => client.get('/config/work-types/', { params: { group: groupId } }),

  // Used by user-facing selection lists (e.g. Create Ticket page) — only
  // active records, never shows anything the admin has deactivated.
  listActiveByGroup: (groupId) => client.get('/config/work-types/', { params: { group: groupId, active_only: true } }),

  get:        (id)       => client.get(`/config/work-types/${id}/`),
  create:     (data)     => client.post('/config/work-types/', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
  update:     (id, data) => client.patch(`/config/work-types/${id}/`, data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
  delete:     (id)       => client.delete(`/config/work-types/${id}/`),
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export const componentAPI = {
  list:        (params)   => client.get('/config/components/', { params }),

  // Used by admin management pages — shows inactive records too.
  listByGroup: (groupId)  => client.get('/config/components/', { params: { group: groupId } }),

  // Used by user-facing selection lists (e.g. Create Ticket page) — only
  // active records.
  listActiveByGroup: (groupId) => client.get('/config/components/', { params: { group: groupId, active_only: true } }),

  get:         (id)       => client.get(`/config/components/${id}/`),
  create:      (data)     => client.post('/config/components/', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
  update:      (id, data) => client.patch(`/config/components/${id}/`, data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
  delete:      (id)       => client.delete(`/config/components/${id}/`),
}

// ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────────
export const announcementAPI = {
  list:   ()         => client.get('/config/announcements/'),
  get:    (id)       => client.get(`/config/announcements/${id}/`),
  create: (data)     => client.post('/config/announcements/', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
  update: (id, data) => client.patch(`/config/announcements/${id}/`, data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
  delete: (id)       => client.delete(`/config/announcements/${id}/`),
}

// ── ANNOUNCEMENT ATTACHMENTS ──────────────────────────────────────────────────
export const announcementAttachmentAPI = {
  list:   (announcementId)             => client.get(`/config/announcements/${announcementId}/attachments/`),
  create: (announcementId, formData)   => client.post(
    `/config/announcements/${announcementId}/attachments/`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  ),
  createLink: (announcementId, data)   => client.post(
    `/config/announcements/${announcementId}/attachments/`,
    data,
  ),
  delete: (announcementId, attachmentId) => client.delete(
    `/config/announcements/${announcementId}/attachments/${attachmentId}/`,
  ),
}

// ── HOME PAGE LAYOUT ──────────────────────────────────────────────────────────
export const homePageAPI = {
  get:    ()       => client.get('/config/homepage-layout/'),
  update: (layout) => client.put('/config/homepage-layout/', { layout }),
}