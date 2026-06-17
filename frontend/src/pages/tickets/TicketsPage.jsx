import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ticketsAPI } from '../../api/tickets'
import { groupsAPI } from '../../api/groups'
import { useAuth } from '../../context/AuthContext'
import MultiSelect from '../../components/ui/MultiSelect'

const STATUS_STYLES = {
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

const STATUS_OPTIONS = [
  { value: 'pending',     label: 'Pending'     },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'escalated',   label: 'Escalated'   },
  { value: 'resolved',    label: 'Resolved'    },
  { value: 'cancelled',   label: 'Cancelled'   },
  { value: 'reopened',    label: 'Reopened'    },
]

const PRIORITY_OPTIONS = [
  { value: 'highest', label: 'Highest' },
  { value: 'high',    label: 'High'    },
  { value: 'medium',  label: 'Medium'  },
  { value: 'low',     label: 'Low'     },
  { value: 'lowest',  label: 'Lowest'  },
]

function getTimeToResolution(ticket) {
  const created = new Date(ticket.created_at)
  const updated = new Date(ticket.updated_at)
  const now     = new Date()
  if (ticket.status === 'resolved' || ticket.status === 'cancelled') {
    const diffMs = updated - created
    const diffH  = Math.floor(diffMs / (1000 * 60 * 60))
    const diffD  = Math.floor(diffH / 24)
    const remH   = diffH % 24
    return { label: diffD > 0 ? `Resolved in ${diffD}d ${remH}h` : `Resolved in ${diffH}h`, style: 'done' }
  }
  const diffMs = now - created
  const diffH  = Math.floor(diffMs / (1000 * 60 * 60))
  const diffD  = Math.floor(diffH / 24)
  const remH   = diffH % 24
  if (ticket.status === 'escalated') return { label: diffD > 0 ? `${diffD}d ${remH}h elapsed` : `${diffH}h elapsed`, style: 'overdue' }
  return { label: diffD > 0 ? `${diffD}d ${remH}h elapsed` : `${diffH}h elapsed`, style: diffD >= 3 ? 'warning' : 'ok' }
}

const TTR_COLOURS = { overdue: '#BF2600', warning: '#974F0C', ok: '#006644', done: '#97A0AF' }

function loadFilters(userId, page) {
  try {
    const raw = localStorage.getItem(`filters_${page}_${userId}`)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveFilters(userId, page, filters) {
  try {
    localStorage.setItem(`filters_${page}_${userId}`, JSON.stringify(filters))
  } catch {}
}

export default function TicketsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId   = user?.id || 'guest'
  const PAGE_KEY = 'all_tickets'

  const saved = loadFilters(userId, PAGE_KEY)

  const [search,          setSearch]          = useState(saved?.search          || '')
  const [statusFilters,   setStatusFilters]   = useState(saved?.statusFilters   || [])
  const [deptFilters,     setDeptFilters]     = useState(saved?.deptFilters     || [])
  const [priorityFilters, setPriorityFilters] = useState(saved?.priorityFilters || [])

  useEffect(() => {
    saveFilters(userId, PAGE_KEY, { search, statusFilters, deptFilters, priorityFilters })
  }, [search, statusFilters, deptFilters, priorityFilters, userId])

  const { data: ticketData, isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn:  () => ticketsAPI.list().then(r => r.data.results || r.data),
  })

  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn:  () => groupsAPI.list().then(r => r.data.results),
  })

  const groups     = groupsData || []
  const allTickets = ticketData || []

  const deptOptions = groups.map(g => ({ value: g.prefix, label: `${g.icon} ${g.name}` }))

  const tickets = allTickets.filter(t => {
    const matchSearch   = !search || t.key.toLowerCase().includes(search.toLowerCase()) || t.summary.toLowerCase().includes(search.toLowerCase())
    const matchStatus   = statusFilters.length === 0   || statusFilters.includes(t.status)
    const matchDept     = deptFilters.length === 0     || deptFilters.includes(t.group?.prefix) || deptFilters.includes(t.assigned_group?.prefix)
    const matchPriority = priorityFilters.length === 0 || priorityFilters.includes(t.priority)
    return matchSearch && matchStatus && matchDept && matchPriority
  })

  const totalOpen      = allTickets.filter(t => !['resolved', 'cancelled'].includes(t.status)).length
  const escalatedCount = allTickets.filter(t => t.status === 'escalated').length
  const unassigned     = allTickets.filter(t => !t.assigned_user).length
  const today          = new Date().toDateString()
  const resolvedToday  = allTickets.filter(t => t.status === 'resolved' && new Date(t.updated_at).toDateString() === today).length

  const hasActiveFilters = statusFilters.length > 0 || deptFilters.length > 0 || priorityFilters.length > 0 || search

  return (
    <div style={{ padding: '28px 32px', overflowY: 'auto' }}>

      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
        <span style={{ cursor: 'pointer' }} onClick={() => navigate('/')}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >Home</span>
        <span style={{ margin: '0 4px' }}>›</span>
        <span>Tickets</span>
        <span style={{ margin: '0 4px' }}>›</span>
        <span>All Open Tickets</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>All Open Tickets</h1>
        <button onClick={() => navigate('/tickets/create')}
          style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 4, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
        >+ Create Ticket</button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Open',     value: totalOpen,      color: 'var(--text)', sub: 'Across all departments'    },
          { label: 'Escalated',      value: escalatedCount, color: '#DE350B',     sub: 'Needs immediate attention' },
          { label: 'Unassigned',     value: unassigned,     color: '#FF991F',     sub: 'Awaiting agent assignment' },
          { label: 'Resolved Today', value: resolvedToday,  color: '#006644',     sub: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
        ].map(c => (
          <div key={c.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Filter:</span>
        <input
          type="text"
          placeholder="Search tickets…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '7px 12px', border: '1.5px solid var(--border)', borderRadius: 4,
            fontFamily: 'inherit', fontSize: 13, color: 'var(--text)', backgroundColor: '#fff',
            outline: 'none', width: 220, transition: 'border-color .15s',
          }}
          onFocus={e => e.target.style.borderColor = '#4C9AFF'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <MultiSelect
          options={STATUS_OPTIONS}
          selected={statusFilters}
          onChange={setStatusFilters}
          placeholder="All Statuses"
          width="160px"
        />
        <MultiSelect
          options={deptOptions}
          selected={deptFilters}
          onChange={setDeptFilters}
          placeholder="All Departments"
          width="180px"
        />
        <MultiSelect
          options={PRIORITY_OPTIONS}
          selected={priorityFilters}
          onChange={setPriorityFilters}
          placeholder="All Priorities"
          width="150px"
        />
        {hasActiveFilters && (
          <button
            onClick={() => { setSearch(''); setStatusFilters([]); setDeptFilters([]); setPriorityFilters([]) }}
            style={{ fontSize: 12, color: 'var(--danger)', background: 'none', border: '1.5px solid #FF8F73', borderRadius: 4, padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >✕ Clear filters</button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>All Open Tickets</h2>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '2px 9px' }}>
              {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button style={{ background: 'none', border: '1.5px solid var(--border)', color: 'var(--text)', borderRadius: 4, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            Export
          </button>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <div className="spinner spinner-lg" />
          </div>
        ) : tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎫</div>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No tickets found</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {hasActiveFilters ? 'Try adjusting your filters.' : 'No tickets yet.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Request Type', 'Key', 'Summary', 'Reporter', 'Assignee', 'Status', 'Priority', 'Created', 'Last Updated', 'Time to Resolution'].map(h => (
                    <th key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', padding: '10px 16px', textAlign: 'left', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', userSelect: 'none' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickets.map(ticket => {
                  const s = STATUS_STYLES[ticket.status] || {}
                  const dotColor = DOT_COLOURS[ticket.priority] || '#97A0AF'
                  const assignee = ticket.assigned_user
                  const assigneeInitials = assignee ? `${assignee.first_name?.[0] || ''}${assignee.last_name?.[0] || ''}`.toUpperCase() : '?'
                  const ttr = getTimeToResolution(ticket)

                  return (
                    <tr key={ticket.id} onClick={() => navigate(`/tickets/${ticket.id}`)}
                      style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => Array.from(e.currentTarget.cells).forEach(c => c.style.background = '#F8F9FD')}
                      onMouseLeave={e => Array.from(e.currentTarget.cells).forEach(c => c.style.background = '')}
                    >
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 4, background: '#DEEBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                            {ticket.group?.icon || '💬'}
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', maxWidth: 110, lineHeight: 1.4 }}>
                            {ticket.group?.name || ticket.assigned_group?.name || '—'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{ticket.key}</span>
                      </td>
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle', maxWidth: 260 }}>
                        <span style={{ color: 'var(--brand)', fontWeight: 500, fontSize: 13 }}>{ticket.summary}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text)', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        {ticket.reporter?.full_name || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: assignee ? '#DEEBFF' : '#F1F2F4', color: assignee ? '#0747A6' : 'var(--text-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                            {assignee ? assigneeInitials : '?'}
                          </div>
                          <span style={{ fontSize: 12, whiteSpace: 'nowrap', color: assignee ? 'var(--text)' : 'var(--text-faint)', fontStyle: assignee ? 'normal' : 'italic' }}>
                            {assignee ? assignee.full_name : 'Unassigned'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap', background: s.bg, color: s.color }}>
                          {s.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0, display: 'inline-block' }} />
                          {ticket.priority?.charAt(0).toUpperCase() + ticket.priority?.slice(1)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div>{new Date(ticket.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        <div style={{ color: 'var(--text-faint)' }}>{new Date(ticket.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div>{new Date(ticket.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        <div style={{ color: 'var(--text-faint)' }}>{new Date(ticket.updated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 12, fontWeight: ttr.style === 'done' ? 400 : 600, color: TTR_COLOURS[ttr.style] || 'var(--text-muted)' }}>
                          {ttr.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {tickets.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)', background: '#fff' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Showing 1–{tickets.length} of {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}