import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useState } from 'react'

export default function Navbar() {
  const { user, logout, isManager } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const initials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
    : '?'

  const navLink = (to, label) => {
    const active = location.pathname === to || (to === '/' && location.pathname === '/')
    return (
      <Link
        to={to}
        style={{
          color: active ? '#fff' : 'rgba(255,255,255,.85)',
          fontSize: 13, fontWeight: 500,
          padding: '6px 14px', borderRadius: 3,
          textDecoration: 'none',
          background: active ? 'rgba(255,255,255,.2)' : 'none',
          transition: 'background .15s',
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,.15)' }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'none' }}
      >
        {label}
      </Link>
    )
  }

  return (
    <nav style={{
      background: 'var(--brand)',
      height: 72,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 40px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 2px 8px rgba(0,0,0,.18)',
      flexShrink: 0,
    }}>

      {/* LEFT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>

        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <img
            src="/crc-logo.png"
            alt="Chester Racecourse"
            style={{ height: 56, width: 'auto', display: 'block' }}
            onError={e => e.target.style.display = 'none'}
          />
        </Link>

        {/* Divider */}
        <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,.3)', flexShrink: 0 }} />

        {/* Portal label */}
        <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '.01em', flexShrink: 0 }}>
          IT Help Desk
        </span>

        {/* Divider */}
        <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,.3)', flexShrink: 0 }} />

        {/* Nav links */}
        {navLink('/', 'Home')}
        {navLink('/my-tickets', 'My Requests')}
        {isManager && navLink('/tickets', 'Tickets')}
      </div>

      {/* RIGHT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>

        {/* Avatar + Name button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: '#FFC400', color: '#172B4D',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 14,
            border: '2px solid rgba(255,255,255,.4)',
            overflow: 'hidden', flexShrink: 0,
          }}>
            {user?.avatar
              ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials
            }
          </div>
          <span style={{ color: 'rgba(255,255,255,.9)', fontSize: 13, fontWeight: 500 }}>
            {user?.first_name} {user?.last_name}
          </span>
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setMenuOpen(false)} />
            <div style={{
              position: 'absolute', top: 'calc(100% + 12px)', right: 0,
              background: '#fff', border: '1px solid var(--border)',
              borderRadius: 8, boxShadow: 'var(--shadow-md)',
              minWidth: 200, zIndex: 100, overflow: 'hidden',
            }}>
              {/* User info */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {user?.first_name} {user?.last_name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</div>
              </div>
              {/* Menu items */}
              <div style={{ padding: '4px 0' }}>
                <button
                  onClick={() => { navigate('/profile'); setMenuOpen(false) }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 16px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, color: 'var(--text)',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  👤 My Profile
                </button>
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                <button
                  onClick={logout}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 16px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, color: 'var(--danger)',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  🚪 Sign Out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </nav>
  )
}