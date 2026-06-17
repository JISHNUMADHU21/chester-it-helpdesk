import client from './client'

export const notificationsAPI = {
  list: (unreadOnly = false) =>
    client.get('/notifications/', {
      params: unreadOnly ? { unread: 'true' } : {},
    }),

  unreadCount: () =>
    client.get('/notifications/unread-count/'),

  get: (id) =>
    client.get(`/notifications/${id}/`),

  markRead: (id) =>
    client.post(`/notifications/${id}/read/`),

  markAllRead: () =>
    client.post('/notifications/mark-all-read/'),
}