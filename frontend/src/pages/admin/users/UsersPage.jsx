import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authAPI } from '../../../api/auth'
import { useAuth } from '../../../context/AuthContext'

const ROLE_STYLES = {
  superadmin: { bg: '#EAE6FF', color: '#403294', label: 'Super Admin' },
  admin:      { bg: '#DEEBFF', color: '#0747A6', label: 'Administrator' },
  manager:    { bg: '#E3FCEF', color: '#006644', label: 'Manager' },
  user:       { bg: '#F1F2F4', color: '#5E6C84', label: 'User' },
}

export default function UsersPage() {
  const navigate     = useNavigate()
  const { user: me, isSuperAdmin } = useAuth()
  const queryClient  = useQueryClient()
  const [search, setSearch]       = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn:  () => authAPI.listUsers().then(r => r.data.results || r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => authAPI.deleteUser(id),
    onSuccess:  () => {
      queryClient.invalidateQueries(['admin-users'])
      setDeleteTarget(null)
    },
  })

  const users = (data || []).filter(u => {
    const matchSearch = !search ||
      u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole = !roleFilter || u.role === roleFilter
    return matchSearch && matchRole
  })

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
            Admin › User Management
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            User Management
          </h1>
        </div>
        <button
          onClick={() => navigate('/admin/users/create')}
          style={{
            background: 'var(--brand)', color: '#fff', border: 'none',
            borderRadius: 4, padding: '9px 18px', fontSize: 14, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
        >
          + Create User
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 4,
            fontFamily: 'inherit', fontSize: 13, outline: 'none', width: 260,
            transition: 'border-color .15s',
          }}
          onFocus={e => e.target.style.borderColor = '#4C9AFF'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <div style={{ position: 'relative' }}>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            style={{
              padding: '8px 32px 8px 12px', border: '1.5px solid var(--border)', borderRadius: 4,
              fontFamily: 'inherit', fontSize: 13, outline: 'none', appearance: 'none',
              background: '#fff', cursor: 'pointer',
            }}
          >
            <option value="">All Roles</option>
            {isSuperAdmin && <option value="superadmin">Super Admin</option>}
            <option value="admin">Administrator</option>
            <option value="manager">Manager</option>
            <option value="user">User</option>
          </select>
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 11, color: 'var(--text-muted)' }}>▾</span>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>All Users</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '2px 9px' }}>
            {users.length} user{users.length !== 1 ? 's' : ''}
          </span>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div className="spinner spinner-lg" />
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No users found</p>
            <p style={{ fontSize: 13 }}>Try adjusting your search or filters</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                {['User', 'Email', 'Role', 'Department', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '10px 18px', textAlign: 'left', fontSize: 11,
                    fontWeight: 600, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '.05em',
                    borderBottom: '1px solid var(--border)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const rs = ROLE_STYLES[u.role] || ROLE_STYLES.user
                const isSelf   = u.id === me?.id
                const isAdminOrAbove = ['admin', 'superadmin'].includes(u.role)
                const canEdit  = isSuperAdmin || (!isAdminOrAbove && !isSelf)
                const canDelete = isSuperAdmin
                  ? !isSelf
                  : (!isAdminOrAbove && !isSelf)

                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => Array.from(e.currentTarget.cells).forEach(c => c.style.background = '#F8F9FD')}
                    onMouseLeave={e => Array.from(e.currentTarget.cells).forEach(c => c.style.background = '')}
                  >
                    <td style={{ padding: '13px 18px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                          background: '#FFC400', color: '#172B4D',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 12, overflow: 'hidden',
                        }}>
                          {u.avatar
                            ? <img src={u.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase()
                          }
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                            {u.first_name} {u.last_name}
                            {isSelf && <span style={{ fontSize: 10, color: 'var(--text-faint)', marginLeft: 6 }}>(you)</span>}
                          </div>
                          {u.designation && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.designation}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '13px 18px', fontSize: 13, color: 'var(--text-muted)', verticalAlign: 'middle' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '13px 18px', verticalAlign: 'middle' }}>
                      <span style={{
                        display: 'inline-flex', padding: '3px 9px', borderRadius: 20,
                        fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                        background: rs.bg, color: rs.color,
                      }}>{rs.label}</span>
                    </td>
                    <td style={{ padding: '13px 18px', fontSize: 13, color: 'var(--text-muted)', verticalAlign: 'middle' }}>
                      {u.groups?.length > 0
                        ? u.groups.map(g => g.name).join(', ')
                        : <span style={{ fontStyle: 'italic', color: 'var(--text-faint)' }}>No department</span>
                      }
                    </td>
                    <td style={{ padding: '13px 18px', verticalAlign: 'middle' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: 12, fontWeight: 600,
                        color: u.is_active ? '#006644' : '#BF2600',
                      }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: u.is_active ? '#36B37E' : '#FF5630', display: 'inline-block' }} />
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '13px 18px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {canEdit && (
                          <button
                            onClick={() => navigate(`/admin/users/${u.id}/edit`)}
                            style={{
                              background: 'none', border: '1.5px solid var(--border)',
                              borderRadius: 4, padding: '5px 12px', fontSize: 12,
                              fontWeight: 500, color: 'var(--text)', cursor: 'pointer',
                              fontFamily: 'inherit', transition: 'all .15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = '#b3b9c4' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'var(--border)' }}
                          >Edit</button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteTarget(u)}
                            style={{
                              background: 'none', border: '1.5px solid #FF8F73',
                              borderRadius: 4, padding: '5px 12px', fontSize: 12,
                              fontWeight: 500, color: 'var(--danger)', cursor: 'pointer',
                              fontFamily: 'inherit', transition: 'all .15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-bg)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                          >Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,30,66,.45)', zIndex: 200 }} onClick={() => setDeleteTarget(null)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: '#fff', borderRadius: 8, padding: '28px 32px', zIndex: 201,
            width: 440, boxShadow: '0 8px 32px rgba(9,30,66,.3)',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: 'var(--text)' }}>
              Deactivate User
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: 1.6 }}>
              Are you sure you want to deactivate <strong>{deleteTarget.first_name} {deleteTarget.last_name}</strong>?
              They will no longer be able to log in. This can be reversed by editing their account.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)}
                style={{ background: 'none', border: '1.5px solid var(--border)', color: 'var(--text)', borderRadius: 4, padding: '8px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
              >Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                style={{ background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 4, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: deleteMutation.isPending ? 0.7 : 1 }}
              >
                {deleteMutation.isPending ? 'Deactivating…' : 'Deactivate'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}