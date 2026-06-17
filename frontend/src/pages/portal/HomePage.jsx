import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { ticketsAPI } from '../../api/tickets'

// ── 8 HOME PAGE GROUPS — exact order and icons from template ─────────────────
// Phase 2: these will be managed dynamically by admin
const HOME_GROUPS = [
  { id: 'epos',       name: 'EPOS & IT',                   desc: 'Till system issues, EPOS errors, payment terminal problems.',          icon: '🖥',  iconBg: '#DEEBFF', prefix: 'EPOS' },
  { id: 'it',         name: 'IT (Networks & Connectivity)', desc: 'Wi-Fi issues, VPN access, network drives, internet connectivity.',     icon: '🌐',  iconBg: '#E6FCFF', prefix: 'IT'   },
  { id: 'stock',      name: 'Stock',                       desc: 'Stock queries, delivery discrepancies, inventory management issues.',   icon: '📦',  iconBg: '#FFFAE6', prefix: 'ST'   },
  { id: 'cellar',     name: 'Cellar',                      desc: 'Cellar equipment, beer line issues, temperature or storage problems.',  icon: '🍺',  iconBg: '#E3FCEF', prefix: 'CR'   },
  { id: 'finance',    name: 'Finance',                     desc: 'Invoices, expenses, payroll queries, financial reporting issues.',      icon: '💵',  iconBg: '#EAE6FF', prefix: 'FN'   },
  { id: 'staffing',   name: 'Staffing',                    desc: 'Rota queries, HR requests, new starters, contract or leave issues.',   icon: '👥',  iconBg: '#FFF0E0', prefix: 'SF'   },
  { id: 'operations', name: 'Operations',                  desc: 'General operations, facilities, maintenance and site-related issues.',  icon: '⚙️', iconBg: '#FFEBE6', prefix: 'OPS'  },
  { id: 'general',    name: 'General',                     desc: 'Any other queries not covered by the above departments.',              icon: '💬',  iconBg: '#F1F2F4', prefix: 'CRC'  },
]

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

const ANNOUNCEMENTS = [
  {
    id: 1, tag: 'Maintenance',
    title: 'Scheduled system maintenance – 7 Jun 2026',
    body: 'EPOS systems will be unavailable between 01:00–04:00 AM on Saturday 7 June. Please notify your team.',
    date: 'Posted 3 Jun 2026',
  },
  {
    id: 2, tag: 'New Feature',
    title: 'Chester Help Desk portal is now live',
    body: 'You can now raise and track support tickets across all departments directly from this portal.',
    date: 'Posted 5 Jun 2026',
  },
]

export default function HomePage() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const [search, setSearch] = useState('')

  const { data: recentTickets } = useQuery({
    queryKey: ['my-tickets-recent'],
    queryFn:  () => ticketsAPI.list().then(r => (r.data.results || r.data).slice(0, 5)),
  })

  function handleGroupClick(homeGroup) {
    navigate('/tickets/create', {
      state: {
        lockedGroup: { name: homeGroup.name, prefix: homeGroup.prefix, icon: homeGroup.icon },
        fromCard: true,
      },
    })
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>

      {/* ── HERO ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0747A6 0%, #0052CC 60%, #0065FF 100%)',
        color: '#fff',
        padding: '48px 24px 56px',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: 26, fontWeight: 700, margin: '0 0 8px',
          color: '#fff', fontFamily: "'Inter', -apple-system, sans-serif",
        }}>
          Welcome to Chester Help Desk, {user?.first_name} 👋
        </h1>
        <p style={{
          fontSize: 15, color: 'rgba(255,255,255,.85)',
          margin: '0 0 28px', fontFamily: "'Inter', -apple-system, sans-serif",
        }}>
          How can we help you today? Search for solutions or raise a new request below.
        </p>

        {/* Search bar */}
        <div style={{ maxWidth: 560, margin: '0 auto', position: 'relative' }}>
          <input
            type="text"
            autoComplete="off"
            placeholder="Search for help articles, common issues…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              display: 'block',
              width: '100%',
              padding: '12px 48px 12px 16px',
              borderRadius: 8,
              border: 'none',
              fontSize: 15,
              fontFamily: "'Inter', -apple-system, sans-serif",
              outline: 'none',
              color: '#172B4D',
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 16px rgba(0,0,0,.2)',
              boxSizing: 'border-box',
            }}
            onFocus={e => {
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.3), 0 0 0 2px #4C9AFF'
              e.currentTarget.style.backgroundColor = '#ffffff'
            }}
            onBlur={e => {
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.2)'
              e.currentTarget.style.backgroundColor = '#ffffff'
            }}
          />
          <svg
            width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="#5E6C84" strokeWidth="2"
            style={{
              position: 'absolute', right: 14, top: '50%',
              transform: 'translateY(-50%)', pointerEvents: 'none',
            }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      {/* ── MAIN ── */}
      <main style={{ maxWidth: 1040, margin: '0 auto', padding: '36px 24px 60px', width: '100%' }}>

        {/* Section header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 16,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            What do you need help with?
          </h2>
          <button
            onClick={() => navigate('/tickets/create')}
            style={{
              background: 'var(--brand)', color: '#fff',
              border: 'none', borderRadius: 4,
              padding: '9px 18px', fontSize: 14, fontWeight: 500,
              cursor: 'pointer', transition: 'background .15s',
              fontFamily: "'Inter', -apple-system, sans-serif",
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
          >
            + Raise a Request
          </button>
        </div>

        {/* ── GROUP CARDS ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 40,
        }}>
          {HOME_GROUPS.map(group => (
            <div
              key={group.id}
              onClick={() => handleGroupClick(group)}
              style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 20,
                display: 'flex', flexDirection: 'column', gap: 10,
                cursor: 'pointer',
                transition: 'box-shadow .18s, border-color .18s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                e.currentTarget.style.borderColor = '#4C9AFF'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.borderColor = 'var(--border)'
              }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: 4,
                background: group.iconBg,
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 22, flexShrink: 0,
              }}>
                {group.icon}
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3, margin: 0 }}>
                {group.name}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0, flex: 1 }}>
                {group.desc}
              </p>
            </div>
          ))}
        </div>

        {/* ── MY RECENT REQUESTS ── */}
        <div style={{
          background: '#fff', border: '1px solid var(--border)',
          borderRadius: 8, overflow: 'hidden', marginBottom: 40,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderBottom: '1px solid var(--border)',
          }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--text)' }}>
              My Recent Requests
            </h2>
            <button
              onClick={() => navigate('/my-tickets')}
              style={{
                fontSize: 13, color: 'var(--brand)',
                background: 'none', border: 'none',
                cursor: 'pointer', padding: 0,
                fontFamily: "'Inter', -apple-system, sans-serif",
              }}
            >
              View all
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Reference', 'Summary', 'Department', 'Raised', 'Priority', 'Status'].map(h => (
                  <th key={h} style={{
                    fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '.05em',
                    padding: '10px 20px', textAlign: 'left',
                    background: 'var(--surface-2)',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(recentTickets || []).length === 0 ? (
                <tr>
                  <td colSpan={6} style={{
                    padding: '24px 20px', textAlign: 'center',
                    fontSize: 13, color: 'var(--text-muted)',
                  }}>
                    No requests yet — raise your first request above
                  </td>
                </tr>
              ) : (recentTickets || []).map(ticket => {
                const s = STATUS_BADGES[ticket.status] || {}
                const dotColor = DOT_COLOURS[ticket.priority] || '#97A0AF'
                return (
                  <tr
                    key={ticket.id}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => Array.from(e.currentTarget.cells).forEach(c => c.style.background = '#F8F9FD')}
                    onMouseLeave={e => Array.from(e.currentTarget.cells).forEach(c => c.style.background = '')}
                  >
                    <td style={{ padding: '12px 20px', fontSize: 13, verticalAlign: 'middle' }}>
                      <a style={{ color: 'var(--brand)', fontWeight: 500, textDecoration: 'none' }}>
                        {ticket.key}
                      </a>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 13, verticalAlign: 'middle', maxWidth: 260 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ticket.summary}
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-muted)', verticalAlign: 'middle' }}>
                      {ticket.assigned_group?.name || ticket.group?.name || '—'}
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-muted)', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      {new Date(ticket.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td style={{ padding: '12px 20px', verticalAlign: 'middle' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0, display: 'inline-block' }} />
                        {ticket.priority?.charAt(0).toUpperCase() + ticket.priority?.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px', verticalAlign: 'middle' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '3px 8px', borderRadius: 20,
                        fontSize: 11, fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '.04em',
                        background: s.bg, color: s.color,
                      }}>
                        {s.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── ANNOUNCEMENTS ── */}
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
          Announcements
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {ANNOUNCEMENTS.map(a => (
            <div key={a.id} style={{
              background: '#fff', border: '1px solid var(--border)',
              borderRadius: 8, padding: '18px 20px',
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '.08em', color: 'var(--brand)', marginBottom: 6,
              }}>
                {a.tag}
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                {a.title}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                {a.body}
              </p>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 8 }}>
                {a.date}
              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  )
}