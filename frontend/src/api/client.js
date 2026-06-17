import axios from 'axios'

// ── AXIOS INSTANCE ────────────────────────────────────────────────────────────
const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// ── REQUEST INTERCEPTOR ───────────────────────────────────────────────────────
// Automatically attach JWT access token to every request
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ── RESPONSE INTERCEPTOR ──────────────────────────────────────────────────────
// Handle 401 errors — try to refresh the token, or redirect to login
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) {
        // No refresh token — redirect to login
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const response = await axios.post('/api/auth/token/refresh/', {
          refresh: refreshToken,
        })
        const newAccessToken = response.data.access
        localStorage.setItem('access_token', newAccessToken)
        original.headers.Authorization = `Bearer ${newAccessToken}`
        return client(original)
      } catch {
        // Refresh failed — clear tokens and redirect to login
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  },
)

export default client