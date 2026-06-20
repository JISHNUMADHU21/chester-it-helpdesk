import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { announcementAPI } from '../../api/config'
import AnnouncementDetailModal from '../announcements/AnnouncementDetailModal'

const TAG_STYLES = {
  maintenance: { bg: '#FFF0E0', color: '#974F0C', label: 'Maintenance' },
  new_feature: { bg: '#E3FCEF', color: '#006644', label: 'New Feature' },
  update:      { bg: '#DEEBFF', color: '#0747A6', label: 'Update'      },
  alert:       { bg: '#FFEBE6', color: '#BF2600', label: 'Alert'       },
  info:        { bg: '#F1F2F4', color: '#5E6C84', label: 'Info'        },
}

export default function Navbar() {
  const { user, logout, isManager } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [menuOpen,         setMenuOpen]         = useState(false)
  const [announceOpen,     setAnnounceOpen]     = useState(false)
  const [viewTarget,       setViewTarget]       = useState(null)

  const initials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
    : '?'

  // Live announcements for the dropdown
  const { data: announcementsData } = useQuery({
    queryKey: ['announcements'],
    queryFn:  () => announcementAPI.list().then(r => r.data.results || r.data),
    staleTime: 60000,
  })
  const announcements = announcementsData || []

  function openAnnouncementDetail(a) {
    setViewTarget(a)
    setAnnounceOpen(false)
  }

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, position: 'relative' }}>

        {/* ── Notification bell — placeholder, non-functional ── */}
        <button
          title="Notifications (coming soon)"
          style={{
            background: 'none', border: 'none', cursor: 'default', padding: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '50%', opacity: 0.75, position: 'relative',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>

        {/* ── Announcement (megaphone) icon with dropdown ── */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setAnnounceOpen(o => !o)}
            title="Announcements"
            style={{
              background: announceOpen ? 'rgba(255,255,255,.18)' : 'none',
              border: 'none', cursor: 'pointer', padding: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%', transition: 'background .15s', position: 'relative',
            }}
            onMouseEnter={e => { if (!announceOpen) e.currentTarget.style.background = 'rgba(255,255,255,.12)' }}
            onMouseLeave={e => { if (!announceOpen) e.currentTarget.style.background = 'none' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11l18-5v12L3 14v-3z"/>
              <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
            </svg>
            {announcements.length > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2,
                width: 8, height: 8, borderRadius: '50%',
                background: '#FF5630', border: '1.5px solid var(--brand)',
              }} />
            )}
          </button>

          {announceOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setAnnounceOpen(false)} />
              <div style={{
                position: 'absolute', top: 'calc(100% + 12px)', right: 0,
                background: '#fff', border: '1px solid var(--border)',
                borderRadius: 8, boxShadow: 'var(--shadow-md)',
                width: 360, zIndex: 100, overflow: 'hidden',
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Announcements</span>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{announcements.length}</span>
                </div>

                <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                  {announcements.length === 0 ? (
                    <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-faint)' }}>
                      No announcements right now
                    </div>
                  ) : announcements.map(a => {
                    const ts = TAG_STYLES[a.tag] || TAG_STYLES.info
                    return (
                      <div key={a.id}
                        onClick={() => openAnnouncementDetail(a)}
                        style={{
                          padding: '12px 16px', cursor: 'pointer',
                          borderBottom: '1px solid var(--border)', transition: 'background .12s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', padding: '2px 7px', borderRadius: 3, background: ts.bg, color: ts.color }}>
                            {ts.label}
                          </span>
                          {a.attachments?.length > 0 && (
                            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>📎 {a.attachments.length}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                          {a.title}
                        </div>
                        <div style={{
                          fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4,
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        }}>
                          {a.body}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6 }}>
                          {new Date(a.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Divider before profile */}
        <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,.3)', flexShrink: 0 }} />

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
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {user?.first_name} {user?.last_name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</div>
              </div>
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

      {/* Announcement detail modal — opened from dropdown */}
      {viewTarget && (
        <AnnouncementDetailModal
          announcement={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}
    </nav>
  )
}