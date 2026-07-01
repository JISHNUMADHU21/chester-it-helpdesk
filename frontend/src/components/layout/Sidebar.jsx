import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { ticketsAPI } from '../../api/tickets'

// ── Clickable section header (navigates directly, no sub-items) ───────────────
function SectionHeader({ to, icon, label, active }) {
  const navigate = useNavigate()
  return (
    <div
      onClick={() => navigate(to)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 20px', fontSize: 12, fontWeight: 700,
        color: active ? 'var(--brand)' : 'var(--text-muted)',
        background: active ? '#DEEBFF' : 'none',
        borderLeft: active ? '3px solid var(--brand)' : '3px solid transparent',
        cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.06em',
        transition: 'background .15s, color .15s',
        userSelect: 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = active ? '#DEEBFF' : 'var(--surface-2)'; e.currentTarget.style.color = active ? 'var(--brand)' : 'var(--text)' }}
      onMouseLeave={e => { e.currentTarget.style.background = active ? '#DEEBFF' : 'none'; e.currentTarget.style.color = active ? 'var(--brand)' : 'var(--text-muted)' }}
    >
      <span style={{ fontSize: 16, flexShrink: 0, width: 20, textAlign: 'center' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>›</span>
    </div>
  )
}

// ── Collapsible section with sub-links ────────────────────────────────────────
function CollapsibleSection({ icon, label, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 20px', fontSize: 12, fontWeight: 700,
          color: open ? 'var(--text)' : 'var(--text-muted)',
          cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.06em',
          borderLeft: '3px solid transparent',
          transition: 'background .15s, color .15s',
          userSelect: 'none',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = open ? 'var(--text)' : 'var(--text-muted)' }}
      >
        <span style={{ fontSize: 16, flexShrink: 0, width: 20, textAlign: 'center' }}>{icon}</span>
        <span style={{ flex: 1 }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--text-faint)', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
      </div>
      {open && <div>{children}</div>}
    </>
  )
}

// ── Regular sidebar link ──────────────────────────────────────────────────────
function SidebarLink({ to, icon, label, count, countGrey, active, onClick }) {
  return (
    <Link
      to={to || '#'}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 20px', fontSize: 14,
        fontWeight: active ? 600 : 500,
        color: active ? 'var(--brand)' : 'var(--text-muted)',
        background: active ? '#DEEBFF' : 'none',
        borderLeft: active ? '3px solid var(--brand)' : '3px solid transparent',
        textDecoration: 'none', transition: 'background .15s, color .15s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)' } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' } }}
    >
      <span style={{ fontSize: 16, flexShrink: 0, width: 20, textAlign: 'center' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {count !== undefined && (
        <span style={{
          background: countGrey ? 'var(--border)' : 'var(--brand)',
          color: countGrey ? 'var(--text-muted)' : '#fff',
          fontSize: 10, fontWeight: 700, borderRadius: 10,
          padding: '2px 7px', minWidth: 20, textAlign: 'center',
        }}>{count}</span>
      )}
    </Link>
  )
}

// ── Sub-link (indented) ───────────────────────────────────────────────────────
function SubLink({ to, icon, label }) {
  const location = useLocation()
  const active   = location.pathname === to
  return (
    <Link
      to={to}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 20px 7px 42px', fontSize: 13,
        fontWeight: active ? 500 : 400,
        color: active ? 'var(--brand)' : 'var(--text-muted)',
        background: active ? '#DEEBFF' : 'none',
        borderLeft: active ? '3px solid var(--brand)' : '3px solid transparent',
        textDecoration: 'none', transition: 'background .13s, color .13s',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)' } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' } }}
    >
      <span style={{ fontSize: 13, flexShrink: 0, width: 16, textAlign: 'center' }}>{icon}</span>
      {label}
    </Link>
  )
}

const Divider = () => (
  <div style={{ height: 1, background: 'var(--border)', margin: '8px 14px' }} />
)

export default function Sidebar() {
  const { user, isAdmin, isSuperAdmin, isManager, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const path     = location.pathname

  const { data: myTicketsData } = useQuery({
    queryKey: ['my-tickets-count'],
    queryFn:  () => ticketsAPI.list().then(r => r.data.results || r.data),
    staleTime: 60000,
  })

  const { data: allTicketsData } = useQuery({
    queryKey: ['all-tickets-count'],
    queryFn:  () => ticketsAPI.list().then(r => r.data.results || r.data),
    enabled:  isManager,
    staleTime: 60000,
  })

  const myCount  = myTicketsData?.filter(t => !['resolved', 'cancelled'].includes(t.status)).length ?? 0
  const allCount = allTicketsData?.filter(t => !['resolved', 'cancelled'].includes(t.status)).length ?? 0

  async function handleSignOut() {
    await logout()
    navigate('/login')
  }

  return (
    <aside style={{
      width: 240, background: 'var(--surface)',
      borderRight: '1px solid var(--border)', flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      padding: '16px 0 24px',
      position: 'sticky', top: 72,
      height: 'calc(100vh - 72px)',
      overflowY: 'auto',
    }}>

      {/* ── My Tickets + All Tickets ── */}
      <SidebarLink to="/my-tickets" icon="🎫" label="My Tickets"
        count={myCount} countGrey active={path === '/my-tickets'} />
      <SidebarLink to="/tickets" icon="📋" label="All Tickets"
        count={isManager ? allCount : undefined} active={path === '/tickets'} />

      <Divider />

      {/* ── Analytics — manager+ ── */}
      {isManager && (
        <>
          <CollapsibleSection icon="📊" label="Analytics">
            <SubLink to="/analytics" icon="📈" label="Analytics" />
            <SubLink to="/dashboard" icon="🗂️" label="Dashboard" />
          </CollapsibleSection>
          <Divider />
        </>
      )}

      {/* ── Admin sections ── */}
      {isAdmin && (
        <>
          {/* User Management — with sub-items */}
          <CollapsibleSection icon="👥" label="User Management">
            <SubLink to="/admin/users/create" icon="➕" label="Create User" />
            <SubLink to="/admin/users"        icon="✏️" label="Edit User"   />
          </CollapsibleSection>
          <Divider />

          {/* Status Management — header navigates directly */}
          <SectionHeader
            to="/admin/statuses"
            icon="🔵"
            label="Status Management"
            active={path.startsWith('/admin/statuses')}
          />
          <Divider />

          {/* Group Management — with sub-items */}
          <CollapsibleSection icon="🏷️" label="Group Management">
            <SubLink to="/admin/groups/create" icon="➕" label="Create Group" />
            <SubLink to="/admin/groups"        icon="✏️" label="Edit Group"   />
          </CollapsibleSection>
          <Divider />

          {/* Urgency Management — header navigates directly */}
          <SectionHeader
            to="/admin/urgency"
            icon="🚨"
            label="Urgency Management"
            active={path.startsWith('/admin/urgency')}
          />
          <Divider />

          {/* Priority Management — header navigates directly */}
          <SectionHeader
            to="/admin/priority"
            icon="⚡"
            label="Priority Management"
            active={path.startsWith('/admin/priority')}
          />
          <Divider />
        </>
      )}

      {/* ── Manager+ sections ── */}
      {isManager && (
        <>
          {/* Work Type Management — header navigates directly */}
          <SectionHeader
            to="/admin/worktypes"
            icon="🔧"
            label="Work Type Management"
            active={path.startsWith('/admin/worktypes')}
          />
          <Divider />

          {/* Label Management — header navigates directly */}
          <SectionHeader
            to="/admin/labels"
            icon="🏷"
            label="Label Management"
            active={path.startsWith('/admin/labels')}
          />
          <Divider />

          {/* Component Management — header navigates directly */}
          <SectionHeader
            to="/admin/components"
            icon="🧩"
            label="Component Management"
            active={path.startsWith('/admin/components')}
          />
          <Divider />

          {/* Announcements — header navigates directly */}
          <SectionHeader
            to="/admin/announcements"
            icon="📢"
            label="Announcements"
            active={path.startsWith('/admin/announcements')}
          />
          <Divider />
        </>
      )}

      {/* ── Admin-only sections ── */}
      {isAdmin && (
        <>
          {/* Notification Management */}
          <SectionHeader
            to="/admin/notifications"
            icon="🔔"
            label="Notification Management"
            active={path.startsWith('/admin/notifications')}
          />
          <Divider />
        </>
      )}

      {/* ── Superadmin only ── */}
      {isSuperAdmin && (
        <>
          <SectionHeader
            to="/admin/home-page"
            icon="🏠"
            label="Home Page Management"
            active={path.startsWith('/admin/home-page')}
          />
          <Divider />
        </>
      )}

      {/* ── Account ── */}
      <div>
        <div style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '.08em', color: 'var(--text-faint)',
          padding: '10px 20px 4px',
        }}>Account</div>
        <SidebarLink to="/profile" icon="👤" label="My Profile" active={path === '/profile'} />
        <SidebarLink
          to="/login" icon="🚪" label="Sign Out" active={false}
          onClick={e => { e.preventDefault(); handleSignOut() }}
        />
      </div>

    </aside>
  )
}