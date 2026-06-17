import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function LoginPage() {
  const { login }  = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()

  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [remember,   setRemember]   = useState(false)
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)

  const from = location.state?.from?.pathname || '/'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Incorrect email or password. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#F4F5F7',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>

      {/* LOGIN CARD */}
      <div style={{
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,.35)',
        width: '100%',
        maxWidth: 480,
        padding: '48px 44px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>

        {/* Logo */}
        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src="/crc-logo.png"
            alt="Chester Racecourse"
            style={{ height: 100, width: 'auto', display: 'block' }}
            onError={e => e.target.style.display = 'none'}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#FFEBE6', border: '1px solid #FF8F73',
            color: '#BF2600', borderRadius: 4,
            padding: '10px 12px', fontSize: 13,
            marginBottom: 16, width: '100%', textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 600,
              color: '#5E6C84', textTransform: 'uppercase',
              letterSpacing: '.07em', marginBottom: 6,
            }}>
              Username / Email
            </label>
            <input
              type="text"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              autoComplete="username"
              required
              autoFocus
              style={{
                width: '100%', padding: '10px 12px',
                border: `2px solid ${error ? '#FF8F73' : '#DFE1E6'}`,
                borderRadius: 4, fontFamily: 'inherit',
                fontSize: 14, color: '#172B4D',
                background: '#fff', outline: 'none',
                transition: 'border-color .15s, box-shadow .15s',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#4C9AFF'
                e.target.style.boxShadow = '0 0 0 2px rgba(76,154,255,.2)'
              }}
              onBlur={e => {
                e.target.style.borderColor = error ? '#FF8F73' : '#DFE1E6'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 600,
              color: '#5E6C84', textTransform: 'uppercase',
              letterSpacing: '.07em', marginBottom: 6,
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              autoComplete="current-password"
              required
              style={{
                width: '100%', padding: '10px 12px',
                border: `2px solid ${error ? '#FF8F73' : '#DFE1E6'}`,
                borderRadius: 4, fontFamily: 'inherit',
                fontSize: 14, color: '#172B4D',
                background: '#fff', outline: 'none',
                transition: 'border-color .15s, box-shadow .15s',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#4C9AFF'
                e.target.style.boxShadow = '0 0 0 2px rgba(76,154,255,.2)'
              }}
              onBlur={e => {
                e.target.style.borderColor = error ? '#FF8F73' : '#DFE1E6'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          {/* Remember me */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <input
              type="checkbox"
              id="rememberMe"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              style={{ width: 15, height: 15, accentColor: '#0052CC', cursor: 'pointer', flexShrink: 0 }}
            />
            <label htmlFor="rememberMe" style={{ fontSize: 13, color: '#172B4D', cursor: 'pointer', userSelect: 'none' }}>
              Remember me
            </label>
          </div>

          {/* Sign in button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px',
              background: loading ? '#0747A6' : '#0052CC',
              color: '#fff', border: 'none', borderRadius: 4,
              fontSize: 15, fontWeight: 600, letterSpacing: '.01em',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background .15s', marginBottom: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#0065FF' }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#0052CC' }}
          >
            {loading
              ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Signing in…</>
              : 'Sign in'
            }
          </button>

          {/* Forgot password */}
          <div style={{ textAlign: 'center', fontSize: 13, color: '#5E6C84' }}>
            <a href="#" style={{ color: '#5E6C84', textDecoration: 'none' }}
              onMouseEnter={e => { e.target.style.color = '#0052CC'; e.target.style.textDecoration = 'underline' }}
              onMouseLeave={e => { e.target.style.color = '#5E6C84'; e.target.style.textDecoration = 'none' }}
            >
              Forgot password?
            </a>
          </div>

        </form>
      </div>

      {/* Footer note */}
      <p style={{
        marginTop: 28, textAlign: 'center', fontSize: 12,
        color: '#5E6C84', lineHeight: 1.7, maxWidth: 420,
      }}>
        You're already registered with your email address if you've been in touch with our Support team.<br />
        You can request your password <a href="#" style={{ color: '#0052CC', textDecoration: 'underline' }}>here</a>.
      </p>

    </div>
  )
}