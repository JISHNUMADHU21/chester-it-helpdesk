import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ticketsAPI } from '../../api/tickets'
import { groupsAPI } from '../../api/groups'
import { useAuth } from '../../context/AuthContext'

const STATUS_STYLES = {
  pending:     { bg: '#FFFAE6', color: '#974F0C', label: 'Pending'     },
  in_progress: { bg: '#DEEBFF', color: '#0747A6', label: 'In Progress' },
  escalated:   { bg: '#FFF0E0', color: '#974F0C', label: 'Escalated'   },
  resolved:    { bg: '#E3FCEF', color: '#006644', label: 'Resolved'    },
  cancelled:   { bg: '#FFEBE6', color: '#BF2600', label: 'Cancelled'   },
  reopened:    { bg: '#F1F2F4', color: '#5E6C84', label: 'Reopened'    },
}

const URGENCY_STYLES = {
  critical: { bg: '#FFEBE6', color: '#BF2600', border: '#FF8F73' },
  high:     { bg: '#FFF0E0', color: '#974F0C', border: '#FFB900' },
  medium:   { bg: '#FFFAE6', color: '#7A5200', border: '#FFD700' },
  low:      { bg: '#E3FCEF', color: '#006644', border: '#ABF5D1' },
}

const PRIORITY_ICONS = {
  highest: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 9L8 4L13 9" stroke="#E2483D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 13L8 8L13 13" stroke="#E2483D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  high:    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 11L8 6L13 11" stroke="#E2483D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  medium:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><line x1="2" y1="5.5" x2="14" y2="5.5" stroke="#E97F33" strokeWidth="2.2" strokeLinecap="round"/><line x1="2" y1="10.5" x2="14" y2="10.5" stroke="#E97F33" strokeWidth="2.2" strokeLinecap="round"/></svg>,
  low:     <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 5L8 10L13 5" stroke="#4C9AFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  lowest:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3L8 8L13 3" stroke="#4C9AFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 7L8 12L13 7" stroke="#4C9AFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
}

function DetailCard({ title, count, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '13px 18px', borderBottom: open ? '1px solid var(--border)' : 'none',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
          {title}
          {count !== undefined && (
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>{count}</span>
          )}
        </h3>
        <span style={{
          fontSize: 11, color: 'var(--text-faint)',
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform .2s', display: 'inline-block',
        }}>▾</span>
      </div>
      {open && <div style={{ padding: 18 }}>{children}</div>}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-faint)', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
      {children}
    </div>
  )
}

function FieldLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>
      {children}
    </div>
  )
}

export default function TicketDetailPage() {
  const { id }              = useParams()
  const navigate            = useNavigate()
  const { user, isManager } = useAuth()
  const queryClient         = useQueryClient()

  const [comment,         setComment]         = useState('')
  const [statusOpen,      setStatusOpen]      = useState(false)
  const [assigneeOpen,    setAssigneeOpen]    = useState(false)
  const [assigneeSearch,  setAssigneeSearch]  = useState('')
  const [assigneeResults, setAssigneeResults] = useState([])
  const [activeTab,       setActiveTab]       = useState('all')

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn:  () => ticketsAPI.get(id).then(r => r.data),
  })

  const claimMutation = useMutation({
    mutationFn: () => ticketsAPI.claim(id),
    onSuccess:  () => queryClient.invalidateQueries(['ticket', id]),
  })

  const statusMutation = useMutation({
    mutationFn: (status) => ticketsAPI.changeStatus(id, status),
    onSuccess:  () => { queryClient.invalidateQueries(['ticket', id]); setStatusOpen(false) },
  })

  const commentMutation = useMutation({
    mutationFn: () => ticketsAPI.addComment(id, comment),
    onSuccess:  () => { queryClient.invalidateQueries(['ticket', id]); setComment('') },
  })

  const assignMutation = useMutation({
    mutationFn: (data) => ticketsAPI.assign(id, data),
    onSuccess:  () => { queryClient.invalidateQueries(['ticket', id]); setAssigneeOpen(false) },
  })

  async function searchAssignees(q) {
    setAssigneeSearch(q)
    if (!q.trim()) { setAssigneeResults([]); return }
    const res = await groupsAPI.search(q)
    setAssigneeResults(res.data)
  }

  function selectAssignee(result) {
    if (result.type === 'group') {
      assignMutation.mutate({ assigned_group_id: result.id, assigned_user_id: null })
    } else {
      const groupId = result.groups?.[0]?.id
      if (groupId) {
        assignMutation.mutate({ assigned_group_id: groupId, assigned_user_id: result.id })
      }
    }
    setAssigneeOpen(false)
    setAssigneeSearch('')
    setAssigneeResults([])
  }

  if (isLoading) return <div className="page-loader"><div className="spinner spinner-lg" /></div>
  if (!ticket)   return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Ticket not found.</div>

  const canClaim  = !ticket.is_locked
  const canAssign = isManager
  const canStatus = isManager || ticket.assigned_user?.id === user?.id
  const comments  = ticket.comments || []
  const feed      = activeTab === 'comments' ? comments
                  : activeTab === 'history'  ? []
                  : [...comments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const s = STATUS_STYLES[ticket.status] || {}
  const u = ticket.urgency ? (URGENCY_STYLES[ticket.urgency] || {}) : null

  const createdAt = new Date(ticket.created_at)
  const now       = new Date()
  const elapsedH  = Math.floor((now - createdAt) / (1000 * 60 * 60))
  const elapsedD  = Math.floor(elapsedH / 24)
  const slaStatus = ticket.status === 'resolved' ? 'ok' : ticket.status === 'escalated' ? 'overdue' : elapsedD >= 2 ? 'warning' : 'ok'
  const slaColour = { ok: '#006644', warning: '#974F0C', overdue: '#DE350B' }

  const labels      = ticket.ticket_labels?.map(tl => tl.label).filter(Boolean) || []
  const outbound    = ticket.outbound_links || []
  const inbound     = ticket.inbound_links  || []
  const linkedItems = [...outbound, ...inbound]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* TOP BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 28px', background: '#fff', borderBottom: '1px solid var(--border)', flexShrink: 0, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1.5px solid var(--border)', color: 'var(--text-muted)', borderRadius: 4, padding: '6px 12px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >← Back</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#DEEBFF', color: 'var(--brand)', borderRadius: 4, padding: '5px 12px', fontSize: 13, fontWeight: 700 }}>
            {ticket.group?.icon} {ticket.key}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {canStatus && (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setStatusOpen(!statusOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 4, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: s.bg, color: s.color }}
                onMouseEnter={e => e.currentTarget.style.opacity = '.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >{s.label} ▾</button>
              {statusOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setStatusOpen(false)} />
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#fff', border: '1.5px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow-md)', minWidth: 180, zIndex: 100, overflow: 'hidden' }}>
                    {Object.entries(STATUS_STYLES).map(([key, val]) => (
                      <div key={key} onClick={() => statusMutation.mutate(key)}
                        style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: ticket.status === key ? 'var(--surface-2)' : 'none', fontWeight: ticket.status === key ? 600 : 400 }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = ticket.status === key ? 'var(--surface-2)' : 'none'}
                      >
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: val.color, display: 'inline-block', flexShrink: 0 }} />
                        {val.label}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {canClaim && (
            <button onClick={() => claimMutation.mutate()} disabled={claimMutation.isPending}
              style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 4, padding: '7px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
            >{claimMutation.isPending ? 'Claiming...' : 'Assign to me'}</button>
          )}
          {['👁', '🔗', '⋯'].map(icon => (
            <button key={icon} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 4, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--text-muted)', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >{icon}</button>
          ))}
        </div>
      </div>

      {/* BODY */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* LEFT PANEL */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* Breadcrumb */}
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/')} onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>Home</span>
            <span style={{ margin: '0 4px' }}>›</span>
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/my-tickets')} onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>My Tickets</span>
            <span style={{ margin: '0 4px' }}>›</span>
            <span>{ticket.key}</span>
          </div>

          {/* Title */}
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 6, lineHeight: 1.3 }}>
            <span style={{ color: 'var(--brand)', fontWeight: 700 }}>{ticket.key}</span>{' — '}{ticket.summary}
          </h1>

          {/* Meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>{ticket.group?.icon} <strong>{ticket.group?.name}</strong></span>
            <span>•</span>
            <span>☑ {ticket.work_type?.replace(/_/g, ' ')}</span>
            <span>•</span>
            <span>Created <strong>{new Date(ticket.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, {new Date(ticket.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</strong></span>
            <span>•</span>
            <span>Updated <strong>{new Date(ticket.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, {new Date(ticket.updated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</strong></span>
          </div>

          {/* Description card */}
          <DetailCard title="Description" defaultOpen={true}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', background: 'var(--surface-2)', borderRadius: 4, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: '#FFC400', color: '#172B4D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>
                {ticket.reporter?.first_name?.[0]}{ticket.reporter?.last_name?.[0]}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{ticket.reporter?.full_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Raised this request via Portal · {new Date(ticket.created_at).toLocaleString('en-GB')}</div>
              </div>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>
              {ticket.description || <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>No description provided.</span>}
            </p>
          </DetailCard>

          {/* Attachments card — always shown */}
          <DetailCard title="Attachments" count={ticket.attachments?.length || 0} defaultOpen={true}>
            {ticket.attachments?.length > 0 ? (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {ticket.attachments.map(function(att) {
                  return (
                    <a key={att.id} href={att.file} target="_blank" rel="noreferrer"
                      style={{ border: '1.5px solid var(--border)', borderRadius: 4, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, background: '#FAFBFC', textDecoration: 'none', minWidth: 200, transition: 'border-color .15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <span style={{ fontSize: 22 }}>📎</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{att.original_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{Math.round(att.file_size / 1024)} KB · {new Date(att.uploaded_at).toLocaleDateString('en-GB')}</div>
                      </div>
                    </a>
                  )
                })}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic', margin: 0 }}>No attachments yet.</p>
            )}
          </DetailCard>

          {/* Linked Work Items card — always shown */}
          <DetailCard title="Linked Work Items" count={linkedItems.length} defaultOpen={false}>
            {linkedItems.length > 0 ? (
              linkedItems.map(function(link) {
                const isOutbound = outbound.includes(link)
                const linkedKey  = isOutbound ? link.target_ticket : link.source_ticket
                const linkedSummary = isOutbound
                  ? (typeof link.target_ticket === 'object' ? link.target_ticket?.summary : '')
                  : (typeof link.source_ticket === 'object' ? link.source_ticket?.summary : '')
                return (
                  <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>{link.relationship}</span>
                    <span style={{ color: 'var(--brand)', fontWeight: 600, flexShrink: 0, cursor: 'pointer' }}
                      onClick={() => navigate('/tickets/' + (isOutbound ? link.target_ticket?.id || link.target_ticket : link.source_ticket?.id || link.source_ticket))}
                    >{typeof linkedKey === 'object' ? linkedKey?.key : linkedKey}</span>
                    {linkedSummary && (
                      <span style={{ color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{linkedSummary}</span>
                    )}
                  </div>
                )
              })
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic', margin: 0 }}>No linked items.</p>
            )}
          </DetailCard>

          {/* Activity card */}
          <DetailCard title="Activity" defaultOpen={true}>
            <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 16 }}>
              {[['all', 'All'], ['comments', 'Comments'], ['history', 'History']].map(function(pair) {
                var tab = pair[0], label = pair[1]
                return (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    padding: '8px 16px', fontSize: 13,
                    fontWeight: activeTab === tab ? 600 : 500,
                    color: activeTab === tab ? 'var(--brand)' : 'var(--text-muted)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    borderBottom: activeTab === tab ? '2px solid var(--brand)' : '2px solid transparent',
                    marginBottom: -2, fontFamily: 'inherit',
                  }}>{label}</button>
                )
              })}
            </div>

            {/* Comment editor */}
            <div style={{ border: '1.5px solid var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: 16, background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '6px 10px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', flexWrap: 'wrap' }}>
                {[{ label: 'B', s: { fontWeight: 'bold' } }, { label: 'I', s: { fontStyle: 'italic' } }, { label: 'U', s: { textDecoration: 'underline' } }].map(btn => (
                  <button key={btn.label} style={{ width: 26, height: 26, border: 'none', background: 'none', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', ...btn.s }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >{btn.label}</button>
                ))}
                <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 3px' }} />
                {['☰', '</>', '🔗', '@'].map(icon => (
                  <button key={icon} style={{ width: 26, height: 26, border: 'none', background: 'none', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >{icon}</button>
                ))}
              </div>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Add a comment… use @ to mention someone" rows={3}
                style={{ width: '100%', padding: '10px 12px', border: 'none', outline: 'none', resize: 'none', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', backgroundColor: '#fff', minHeight: 80 }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 15, cursor: 'pointer', padding: 4 }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >📎</button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setComment('')} style={{ background: 'none', border: '1.5px solid var(--border)', color: 'var(--text)', borderRadius: 4, padding: '6px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >Cancel</button>
                  <button onClick={() => comment.trim() && commentMutation.mutate()} disabled={!comment.trim() || commentMutation.isPending}
                    style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 4, padding: '7px 16px', fontSize: 13, fontWeight: 500, cursor: comment.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: !comment.trim() ? 0.5 : 1 }}
                    onMouseEnter={e => { if (comment.trim()) e.currentTarget.style.background = 'var(--brand-hover)' }}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
                  >{commentMutation.isPending ? 'Saving...' : 'Save'}</button>
                </div>
              </div>
            </div>

            {/* Feed */}
            {feed.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: '16px 0' }}>No activity yet</p>
            ) : feed.map(function(item) {
              return (
                <div key={item.id} style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, marginTop: 2, background: '#DEEBFF', color: '#0747A6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>
                    {item.author?.first_name?.[0]}{item.author?.last_name?.[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.author?.full_name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{new Date(item.created_at).toLocaleString('en-GB')}</span>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 4, padding: '12px 14px', fontSize: 13, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {item.body}
                    </div>
                  </div>
                </div>
              )
            })}
          </DetailCard>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ width: 280, flexShrink: 0, borderLeft: '1px solid var(--border)', background: '#fff', overflowY: 'auto', padding: '20px 18px' }}>

          {/* SLA */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-faint)', marginBottom: 10 }}>SLA</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Time to first response</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#006644' }}>✓ Met</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Time to resolution</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: slaColour[slaStatus] }}>
                {ticket.status === 'resolved' ? '✓ Met' : elapsedD > 0 ? elapsedD + 'd ' + (elapsedH % 24) + 'h elapsed' : elapsedH + 'h elapsed'}
              </span>
            </div>
          </div>

          {/* People */}
          <div style={{ marginBottom: 16 }}>
            <SectionTitle>People</SectionTitle>
            <div style={{ marginBottom: 12 }}>
              <FieldLabel>Reporter</FieldLabel>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: '#FFC400', color: '#172B4D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                  {ticket.reporter?.first_name?.[0]}{ticket.reporter?.last_name?.[0]}
                </div>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{ticket.reporter?.full_name}</span>
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <FieldLabel>Assignee</FieldLabel>
              <div onClick={() => canAssign && setAssigneeOpen(!assigneeOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 4, margin: '-5px -8px', cursor: canAssign ? 'pointer' : 'default', transition: 'background .13s' }}
                onMouseEnter={e => { if (canAssign) e.currentTarget.style.background = 'var(--surface-2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                {ticket.assigned_user ? (
                  <>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: '#DEEBFF', color: '#0747A6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                      {ticket.assigned_user.first_name?.[0]}{ticket.assigned_user.last_name?.[0]}
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text)' }}>{ticket.assigned_user.full_name}</span>
                  </>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic' }}>Unassigned</span>
                )}
                {canAssign && <span style={{ marginLeft: 'auto', color: 'var(--text-faint)', fontSize: 11 }}>▾</span>}
              </div>
              {canAssign && (
                <button onClick={() => selectAssignee({ type: 'user', id: user.id, name: user.full_name, groups: ticket.assigned_group ? [ticket.assigned_group] : [] })}
                  style={{ fontSize: 11, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, padding: 0, fontFamily: 'inherit', display: 'block' }}
                >Assign to me</button>
              )}
              {assigneeOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setAssigneeOpen(false)} />
                  <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1.5px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow-md)', zIndex: 100, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                      <input autoFocus type="text" placeholder="Search people..." value={assigneeSearch}
                        onChange={e => searchAssignees(e.target.value)} onClick={e => e.stopPropagation()}
                        style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '1.5px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', outline: 'none', backgroundColor: '#fff' }}
                        onFocus={e => e.target.style.borderColor = '#4C9AFF'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'}
                      />
                    </div>
                    <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                      <div onClick={() => selectAssignee({ type: 'user', id: user.id, name: user.full_name, groups: ticket.assigned_group ? [ticket.assigned_group] : [] })}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: '#FFC400', color: '#172B4D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>
                          {user?.first_name?.[0]}{user?.last_name?.[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.first_name} {user?.last_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Assign to me</div>
                        </div>
                      </div>
                      {assigneeResults.map(function(result) {
                        return (
                          <div key={result.type + '-' + result.id} onClick={() => selectAssignee(result)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            {result.type === 'group' ? <span style={{ fontSize: 18 }}>{result.icon}</span>
                              : <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: '#DEEBFF', color: '#0747A6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>{result.name?.[0]}</div>
                            }
                            <span style={{ fontSize: 13 }}>{result.name}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '0 0 14px' }} />

          {/* Details */}
          <div style={{ marginBottom: 16 }}>
            <SectionTitle>Details</SectionTitle>
            <div style={{ marginBottom: 12 }}>
              <FieldLabel>Status</FieldLabel>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', background: s.bg, color: s.color }}>{s.label}</span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <FieldLabel>Priority</FieldLabel>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)' }}>
                {PRIORITY_ICONS[ticket.priority]}
                {ticket.priority ? ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1) : '—'}
              </div>
            </div>
            {ticket.urgency && u && (
              <div style={{ marginBottom: 12 }}>
                <FieldLabel>Urgency</FieldLabel>
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', background: u.bg, color: u.color, border: '1.5px solid ' + u.border }}>
                  {ticket.urgency.charAt(0).toUpperCase() + ticket.urgency.slice(1)}
                </span>
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <FieldLabel>Work Type</FieldLabel>
              <div style={{ fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                ☑ {ticket.work_type ? ticket.work_type.replace(/_/g, ' ') : '—'}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <FieldLabel>Department</FieldLabel>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>{ticket.group?.icon} {ticket.group?.name || '—'}</div>
            </div>
            {ticket.components && (
              <div style={{ marginBottom: 12 }}>
                <FieldLabel>Component</FieldLabel>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>{ticket.components}</div>
              </div>
            )}
            {labels.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <FieldLabel>Label</FieldLabel>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {labels.map(function(label) {
                    return (
                      <span key={label.id} style={{ background: label.colour_hex ? label.colour_hex + '22' : '#DEEBFF', color: label.colour_hex || 'var(--brand)', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                        {label.name}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <FieldLabel>Due Date</FieldLabel>
              <div style={{ fontSize: 13, color: ticket.due_date ? 'var(--text)' : 'var(--text-faint)', fontStyle: ticket.due_date ? 'normal' : 'italic' }}>
                {ticket.due_date ? new Date(ticket.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '0 0 14px' }} />

          {/* Dates */}
          <div style={{ marginBottom: 16 }}>
            <SectionTitle>Dates</SectionTitle>
            <div style={{ marginBottom: 8 }}>
              <FieldLabel>Created</FieldLabel>
              <div style={{ fontSize: 12, color: 'var(--text)' }}>{new Date(ticket.created_at).toLocaleString('en-GB')}</div>
            </div>
            <div>
              <FieldLabel>Last Updated</FieldLabel>
              <div style={{ fontSize: 12, color: 'var(--text)' }}>{new Date(ticket.updated_at).toLocaleString('en-GB')}</div>
            </div>
          </div>

          {/* Linked Items in right panel */}
          {linkedItems.length > 0 && (
            <>
              <div style={{ height: 1, background: 'var(--border)', margin: '0 0 14px' }} />
              <div>
                <SectionTitle>Linked Items</SectionTitle>
                {linkedItems.map(function(link) {
                  const isOutbound = outbound.includes(link)
                  const linkedKey  = isOutbound
                    ? (typeof link.target_ticket === 'object' ? link.target_ticket?.key : link.target_ticket)
                    : (typeof link.source_ticket === 'object' ? link.source_ticket?.key : link.source_ticket)
                  return (
                    <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>{link.relationship}</span>
                      <span style={{ color: 'var(--brand)', fontWeight: 600, flexShrink: 0 }}>{linkedKey}</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}