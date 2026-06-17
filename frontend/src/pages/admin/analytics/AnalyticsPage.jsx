import { useQuery } from '@tanstack/react-query'
import { ticketsAPI } from '../../../api/tickets'
import { useAuth } from '../../../context/AuthContext'

function StatCard({ label, value, sub, color = 'var(--text)' }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{sub}</div>}
    </div>
  )
}

function ProgressBar({ label, value, max, color = 'var(--brand)' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{value} <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>({pct}%)</span></span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 4, transition: 'width .4s' }} />
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { user, isAdmin, isSuperAdmin } = useAuth()

  const { data: allTickets, isLoading } = useQuery({
    queryKey: ['analytics-tickets'],
    queryFn:  () => ticketsAPI.list().then(r => r.data.results || r.data),
  })

  const tickets = allTickets || []

  const total      = tickets.length
  const open       = tickets.filter(t => !['resolved', 'cancelled'].includes(t.status)).length
  const resolved   = tickets.filter(t => t.status === 'resolved').length
  const escalated  = tickets.filter(t => t.status === 'escalated').length
  const pending    = tickets.filter(t => t.status === 'pending').length
  const inProgress = tickets.filter(t => t.status === 'in_progress').length
  const unassigned = tickets.filter(t => !t.assigned_user).length

  // Group breakdown
  const groupCounts = {}
  tickets.forEach(t => {
    const name = t.assigned_group?.name || t.group?.name || 'Unknown'
    groupCounts[name] = (groupCounts[name] || 0) + 1
  })
  const sortedGroups = Object.entries(groupCounts).sort((a, b) => b[1] - a[1])

  // Priority breakdown
  const priorityCounts = { highest: 0, high: 0, medium: 0, low: 0, lowest: 0 }
  tickets.forEach(t => { if (t.priority && priorityCounts[t.priority] !== undefined) priorityCounts[t.priority]++ })

  const PRIORITY_COLOURS = { highest: '#E2483D', high: '#E2483D', medium: '#E97F33', low: '#4C9AFF', lowest: '#4C9AFF' }

  // Resolution rate
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0

  // Average resolution time (rough)
  const resolvedTickets = tickets.filter(t => t.status === 'resolved')
  const avgHours = resolvedTickets.length > 0
    ? Math.round(resolvedTickets.reduce((sum, t) => {
        const diff = new Date(t.updated_at) - new Date(t.created_at)
        return sum + diff / (1000 * 60 * 60)
      }, 0) / resolvedTickets.length)
    : 0

  if (isLoading) return <div className="page-loader"><div className="spinner spinner-lg" /></div>

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Admin › Analytics</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Analytics</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          {isAdmin || isSuperAdmin ? 'System-wide ticket analytics' : 'Analytics for your groups and tickets'}
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Tickets"    value={total}          sub="All time"                      />
        <StatCard label="Open"             value={open}           sub="Pending + In Progress"          color="#0747A6" />
        <StatCard label="Resolved"         value={resolved}       sub={resolutionRate + '% resolution rate'} color="#006644" />
        <StatCard label="Escalated"        value={escalated}      sub="Needs attention"               color="#DE350B" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <StatCard label="Pending"          value={pending}        sub="Awaiting action"               color="#974F0C" />
        <StatCard label="In Progress"      value={inProgress}     sub="Currently being worked on"     color="#0052CC" />
        <StatCard label="Unassigned"       value={unassigned}     sub="No agent assigned"             color="#FF991F" />
        <StatCard label="Avg Resolution"   value={avgHours + 'h'} sub="Average time to resolve"       />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Tickets by department */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 20px' }}>Tickets by Department</h3>
          {sortedGroups.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: '20px 0' }}>No data yet</p>
          ) : sortedGroups.map(([name, count]) => (
            <ProgressBar key={name} label={name} value={count} max={total} />
          ))}
        </div>

        {/* Tickets by priority */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 20px' }}>Tickets by Priority</h3>
          {Object.entries(priorityCounts).map(([priority, count]) => (
            <ProgressBar key={priority}
              label={priority.charAt(0).toUpperCase() + priority.slice(1)}
              value={count} max={total}
              color={PRIORITY_COLOURS[priority]}
            />
          ))}
        </div>

        {/* Status breakdown */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 20px' }}>Status Breakdown</h3>
          {[
            { label: 'Pending',     value: pending,    color: '#974F0C' },
            { label: 'In Progress', value: inProgress, color: '#0747A6' },
            { label: 'Escalated',   value: escalated,  color: '#DE350B' },
            { label: 'Resolved',    value: resolved,   color: '#006644' },
            { label: 'Cancelled',   value: tickets.filter(t => t.status === 'cancelled').length, color: '#5E6C84' },
          ].map(row => (
            <ProgressBar key={row.label} label={row.label} value={row.value} max={total} color={row.color} />
          ))}
        </div>

        {/* Recent activity */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 16px' }}>Recent Tickets</h3>
          {tickets.slice(0, 6).map(t => {
            const statusColours = {
              pending: '#974F0C', in_progress: '#0747A6', escalated: '#DE350B',
              resolved: '#006644', cancelled: '#5E6C84', reopened: '#5E6C84',
            }
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand)', marginRight: 8 }}>{t.key}</span>
                  <span style={{ fontSize: 12, color: 'var(--text)', maxWidth: 200, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'bottom' }}>{t.summary}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: statusColours[t.status] || 'var(--text-muted)', flexShrink: 0 }}>
                  {t.status?.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}