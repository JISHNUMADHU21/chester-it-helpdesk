import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { ticketsAPI } from '../../api/tickets'
import { announcementAPI, homePageAPI } from '../../api/config'
import AnnouncementDetailModal from '../../components/announcements/AnnouncementDetailModal'

const LS_KEY = 'chester_homepage_layout'
const MAX_HOME_ANNOUNCEMENTS = 2

const STATUS_BADGES = {
  pending:     { bg: '#FFFAE6', color: '#974F0C', label: 'Pending'     },
  in_progress: { bg: '#DEEBFF', color: '#0747A6', label: 'In Progress' },
  escalated:   { bg: '#FFF0E0', color: '#974F0C', label: 'Escalated'   },
  resolved:    { bg: '#E3FCEF', color: '#006644', label: 'Resolved'    },
  cancelled:   { bg: '#FFEBE6', color: '#BF2600', label: 'Cancelled'   },
  reopened:    { bg: '#F1F2F4', color: '#5E6C84', label: 'Reopened'    },
}

const DOT_COLOURS = {
  highest: '#DE350B', high: '#DE350B', medium: '#FF991F', low: '#0052CC', lowest: '#0052CC',
}

const ICON_BG = {
  EPOS: '#DEEBFF', IT: '#E6FCFF', ST: '#FFFAE6', CR: '#E3FCEF',
  FN: '#EAE6FF', SF: '#FFF0E0', OPS: '#FFEBE6', CRC: '#F1F2F4', CL: '#FFECF8',
}

const TAG_STYLES = {
  maintenance: { color: '#974F0C' },
  new_feature: { color: '#006644' },
  update:      { color: '#0747A6' },
  alert:       { color: '#BF2600' },
  info:        { color: 'var(--brand)' },
}

export default function HomePage() {
  const { user }       = useAuth()
  const navigate       = useNavigate()
  const queryClient    = useQueryClient()
  const [search, setSearch]       = useState('')
  const [viewTarget, setViewTarget] = useState(null)

  const { data: layoutData } = useQuery({
    queryKey: ['homepage-layout'],
    queryFn:  () => homePageAPI.get().then(r => r.data),
    staleTime: 60000,
  })

  const { data: announcementsData } = useQuery({
    queryKey: ['announcements'],
    queryFn:  () => announcementAPI.list().then(r => r.data.results || r.data),
    staleTime: 60000,
  })

  const { data: recentTickets } = useQuery({
    queryKey: ['my-tickets-recent'],
    queryFn:  () => ticketsAPI.list().then(r => (r.data.results || r.data).slice(0, 5)),
  })

  useEffect(() => {
    function onStorage(e) {
      if (e.key === LS_KEY && e.newValue) {
        queryClient.invalidateQueries(['homepage-layout'])
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [queryClient])

  const tiles         = layoutData?.tiles || []
  const visibleGroups = tiles.filter(Boolean)

  // Only show max 2 announcements on the homepage, most recent first
  const allAnnouncements  = announcementsData || []
  const homeAnnouncements = allAnnouncements.slice(0, MAX_HOME_ANNOUNCEMENTS)
  const hasMoreAnnouncements = allAnnouncements.length > MAX_HOME_ANNOUNCEMENTS

  function handleGroupClick(group) {
    navigate('/tickets/create', {
      state: {
        lockedGroup: {
          id:     group.id,
          name:   group.name,
          prefix: group.prefix,
          icon:   group.icon,
        },
        fromCard: true,
      },
    })
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>

      {/* ── HERO ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0747A6 0%, #0052CC 60%, #0065FF 100%)',
        color: '#fff', padding: '48px 24px 56px', textAlign: 'center',
      }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 8px', color: '#fff' }}>
          Welcome to Chester Help Desk, {user?.first_name} 👋
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,.85)', margin: '0 0 28px' }}>
          How can we help you today? Search for solutions or raise a new request below.
        </p>

        <div style={{ maxWidth: 560, margin: '0 auto', position: 'relative' }}>
          <input
            type="text" autoComplete="off"
            placeholder="Search for help articles, common issues…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              display: 'block', width: '100%',
              padding: '12px 48px 12px 16px', borderRadius: 8,
              border: 'none', fontSize: 15, fontFamily: 'inherit',
              outline: 'none', color: '#172B4D', backgroundColor: '#ffffff',
              boxShadow: '0 4px 16px rgba(0,0,0,.2)', boxSizing: 'border-box',
            }}
            onFocus={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.3), 0 0 0 2px #4C9AFF'; e.currentTarget.style.backgroundColor = '#ffffff' }}
            onBlur={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.2)'; e.currentTarget.style.backgroundColor = '#ffffff' }}
          />
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5E6C84" strokeWidth="2"
            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
      </div>

      {/* ── MAIN ── */}
      <main style={{ maxWidth: 1040, margin: '0 auto', padding: '36px 24px 60px', width: '100%' }}>

        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            What do you need help with?
          </h2>
          <button onClick={() => navigate('/tickets/create')}
            style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 4, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
          >+ Raise a Request</button>
        </div>

        {/* ── GROUP CARDS ── */}
        {visibleGroups.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '48px 20px', textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🏗️</div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No departments configured yet. An admin will set up the homepage tiles.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 40 }}>
            {visibleGroups.map(group => {
              const iconBg = ICON_BG[group.prefix] || '#F1F2F4'
              return (
                <div key={group.id}
                  onClick={() => handleGroupClick(group)}
                  style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer', transition: 'box-shadow .18s, border-color .18s' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = '#4C9AFF' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <div style={{ width: 42, height: 42, borderRadius: 4, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, overflow: 'hidden' }}>
                    {group.icon_image_url
                      ? <img src={group.icon_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : group.icon || '💬'
                    }
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3, margin: 0 }}>
                    {group.name}
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0, flex: 1 }}>
                    {group.description}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {/* ── MY RECENT REQUESTS ── */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--text)' }}>My Recent Requests</h2>
            <button onClick={() => navigate('/my-tickets')}
              style={{ fontSize: 13, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
              View all
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Reference', 'Summary', 'Department', 'Raised', 'Priority', 'Status'].map(h => (
                  <th key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', padding: '10px 20px', textAlign: 'left', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(recentTickets || []).length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px 20px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                    No requests yet — raise your first request above
                  </td>
                </tr>
              ) : (recentTickets || []).map(ticket => {
                const s        = STATUS_BADGES[ticket.status] || {}
                const dotColor = DOT_COLOURS[ticket.priority] || '#97A0AF'
                return (
                  <tr key={ticket.id}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => Array.from(e.currentTarget.cells).forEach(c => c.style.background = '#F8F9FD')}
                    onMouseLeave={e => Array.from(e.currentTarget.cells).forEach(c => c.style.background = '')}
                  >
                    <td style={{ padding: '12px 20px', fontSize: 13, verticalAlign: 'middle' }}>
                      <a style={{ color: 'var(--brand)', fontWeight: 500, textDecoration: 'none' }}>{ticket.key}</a>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 13, verticalAlign: 'middle', maxWidth: 260 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.summary}</div>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-muted)', verticalAlign: 'middle' }}>
                      {ticket.assigned_group?.name || ticket.group?.name || '—'}
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-muted)', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      {new Date(ticket.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 20px', verticalAlign: 'middle' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0, display: 'inline-block' }} />
                        {ticket.priority?.charAt(0).toUpperCase() + ticket.priority?.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px', verticalAlign: 'middle' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', background: s.bg, color: s.color }}>
                        {s.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── ANNOUNCEMENTS — max 2 tiles, click to open full detail ── */}
        {homeAnnouncements.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                Announcements
              </h2>
              {hasMoreAnnouncements && (
                <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                  Showing {homeAnnouncements.length} of {allAnnouncements.length}
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {homeAnnouncements.map(a => {
                const tagStyle    = TAG_STYLES[a.tag] || TAG_STYLES.info
                const hasAttach   = a.attachments?.length > 0
                return (
                  <div key={a.id}
                    onClick={() => setViewTarget(a)}
                    style={{
                      background: '#fff', border: '1px solid var(--border)', borderRadius: 8,
                      padding: '18px 20px', cursor: 'pointer', transition: 'box-shadow .15s, border-color .15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = '#4C9AFF' }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)' }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: tagStyle.color, marginBottom: 6 }}>
                      {a.tag_display || a.tag}
                    </div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{a.title}</h3>
                    <p style={{
                      fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                    }}>
                      {a.body}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                        Posted {new Date(a.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      {hasAttach && (
                        <span style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 500 }}>
                          📎 {a.attachments.length}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

      </main>

      {/* ── ANNOUNCEMENT DETAIL MODAL ── */}
      {viewTarget && (
        <AnnouncementDetailModal
          announcement={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}
    </div>
  )
}