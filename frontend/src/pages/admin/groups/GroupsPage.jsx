import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groupsAPI } from '../../../api/groups'

const PAGE_SIZE = 10

export default function GroupsPage() {
  const navigate    = useNavigate()
  const queryClient = useQueryClient()
  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-groups'],
    queryFn:  () => groupsAPI.list().then(r => r.data.results),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => groupsAPI.delete(id),
    onSuccess:  () => {
      queryClient.invalidateQueries(['admin-groups'])
      setDeleteTarget(null)
    },
  })

  const allGroups = data || []

  // Filter by search
  const filtered = allGroups.filter(g =>
    !search ||
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.prefix.toLowerCase().includes(search.toLowerCase()) ||
    g.email?.toLowerCase().includes(search.toLowerCase())
  )

  // Pagination
  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart   = (currentPage - 1) * PAGE_SIZE
  const pageEnd     = pageStart + PAGE_SIZE
  const pageGroups  = filtered.slice(pageStart, pageEnd)

  function handleSearch(val) {
    setSearch(val)
    setPage(1)
  }

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Admin › Group Management</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Group Management</h1>
        </div>
        <button onClick={() => navigate('/admin/groups/create')}
          style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 4, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
        >+ Create Group</button>
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', maxWidth: 320 }}>
          <input
            type="text"
            placeholder="Search by name, prefix or email…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px 8px 34px',
              border: '1.5px solid var(--border)', borderRadius: 4,
              fontFamily: 'inherit', fontSize: 13, color: 'var(--text)',
              backgroundColor: '#fff', outline: 'none', transition: 'border-color .15s',
            }}
            onFocus={e => e.target.style.borderColor = '#4C9AFF'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>

        {/* Table header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>All Groups</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {search && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "<strong>{search}</strong>"
              </span>
            )}
            <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '2px 9px' }}>
              {allGroups.length} group{allGroups.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div className="spinner spinner-lg" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🏷️</div>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              {search ? 'No groups match your search' : 'No groups yet'}
            </p>
            {search && (
              <button onClick={() => handleSearch('')}
                style={{ fontSize: 13, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}>
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  {['Order', 'Group', 'Prefix', 'Email', 'Members', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid var(--border)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageGroups.map(g => (
                  <tr key={g.id} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => Array.from(e.currentTarget.cells).forEach(c => c.style.background = '#F8F9FD')}
                    onMouseLeave={e => Array.from(e.currentTarget.cells).forEach(c => c.style.background = '')}
                  >
                    <td style={{ padding: '13px 18px', fontSize: 13, color: 'var(--text-muted)' }}>{g.order}</td>
                    <td style={{ padding: '13px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 4, background: '#DEEBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, overflow: 'hidden' }}>
                          {g.icon_image
                            ? <img src={g.icon_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : g.icon || '💬'
                          }
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{g.name}</div>
                          {g.description && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{g.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '13px 18px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, background: '#DEEBFF', color: 'var(--brand)', padding: '2px 8px', borderRadius: 3 }}>{g.prefix}</span>
                    </td>
                    <td style={{ padding: '13px 18px', fontSize: 12, color: 'var(--text-muted)' }}>{g.email || '—'}</td>
                    <td style={{ padding: '13px 18px', fontSize: 13, color: 'var(--text-muted)' }}>{g.member_count ?? '—'}</td>
                    <td style={{ padding: '13px 18px' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: g.is_active ? '#006644' : '#BF2600', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: g.is_active ? '#36B37E' : '#FF5630', display: 'inline-block' }} />
                        {g.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '13px 18px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => navigate(`/admin/groups/${g.id}/edit`)}
                          style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 4, padding: '5px 12px', fontSize: 12, fontWeight: 500, color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >Edit</button>
                        <button onClick={() => setDeleteTarget(g)}
                          style={{ background: 'none', border: '1.5px solid #FF8F73', borderRadius: 4, padding: '5px 12px', fontSize: 12, fontWeight: 500, color: 'var(--danger)', cursor: 'pointer', fontFamily: 'inherit' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-bg)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {filtered.length > PAGE_SIZE && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid var(--border)', background: '#fff' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Showing {pageStart + 1}–{Math.min(pageEnd, filtered.length)} of {filtered.length} groups
                </span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{ padding: '5px 10px', border: '1.5px solid var(--border)', borderRadius: 4, background: currentPage === 1 ? 'var(--surface-2)' : '#fff', color: currentPage === 1 ? 'var(--text-faint)' : 'var(--text)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: 13, fontFamily: 'inherit' }}
                  >← Prev</button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      style={{
                        padding: '5px 10px', border: '1.5px solid ' + (p === currentPage ? 'var(--brand)' : 'var(--border)'),
                        borderRadius: 4, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
                        background: p === currentPage ? 'var(--brand)' : '#fff',
                        color: p === currentPage ? '#fff' : 'var(--text)',
                        fontWeight: p === currentPage ? 600 : 400,
                        minWidth: 34,
                      }}
                    >{p}</button>
                  ))}

                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{ padding: '5px 10px', border: '1.5px solid var(--border)', borderRadius: 4, background: currentPage === totalPages ? 'var(--surface-2)' : '#fff', color: currentPage === totalPages ? 'var(--text-faint)' : 'var(--text)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: 13, fontFamily: 'inherit' }}
                  >Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,30,66,.45)', zIndex: 200 }} onClick={() => setDeleteTarget(null)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', borderRadius: 8, padding: '28px 32px', zIndex: 201, width: 440, boxShadow: '0 8px 32px rgba(9,30,66,.3)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>Deactivate Group</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: 1.6 }}>
              Are you sure you want to deactivate <strong>{deleteTarget.name}</strong>? It will no longer appear in ticket creation forms.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)}
                style={{ background: 'none', border: '1.5px solid var(--border)', color: 'var(--text)', borderRadius: 4, padding: '8px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}
                style={{ background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 4, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: deleteMutation.isPending ? 0.7 : 1 }}>
                {deleteMutation.isPending ? 'Deactivating…' : 'Deactivate'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}