import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ticketsAPI } from '../../../api/tickets'
import { groupsAPI } from '../../../api/groups'
import { useAuth } from '../../../context/AuthContext'

const inputStyle = {
  width: '100%', padding: '9px 12px', border: '1.5px solid var(--border)',
  borderRadius: 4, fontFamily: 'inherit', fontSize: 13, color: 'var(--text)',
  background: '#fff', outline: 'none', transition: 'border-color .15s',
}

function Modal({ title, onClose, children }) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,30,66,.45)', zIndex: 200 }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: '#fff', borderRadius: 8, padding: '28px 32px',
        zIndex: 201, width: 480, boxShadow: '0 8px 32px rgba(9,30,66,.3)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
        </div>
        {children}
      </div>
    </>
  )
}

// ── Searchable group dropdown (for filter) ────────────────────────────────────
function GroupDropdown({ groups, selectedGroup, onSelect, placeholder = 'All Labels' }) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')

  const filtered = groups.filter(g =>
    !search ||
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.prefix.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ position: 'relative', maxWidth: 320 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', border: '1.5px solid ' + (open ? '#4C9AFF' : 'var(--border)'),
          borderRadius: 4, background: '#fff', cursor: 'pointer',
          fontSize: 13, transition: 'border-color .15s', userSelect: 'none',
        }}
      >
        {selectedGroup ? (
          <>
            <div style={{ width: 22, height: 22, borderRadius: 3, background: '#DEEBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, overflow: 'hidden' }}>
              {selectedGroup.icon_image_url || selectedGroup.icon_image
                ? <img src={selectedGroup.icon_image_url || selectedGroup.icon_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : selectedGroup.icon
              }
            </div>
            <span style={{ flex: 1, color: 'var(--text)', fontWeight: 500 }}>{selectedGroup.name}</span>
          </>
        ) : (
          <span style={{ flex: 1, color: 'var(--text-muted)' }}>{placeholder}</span>
        )}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
      </div>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0,
            minWidth: '100%', width: 280, background: '#fff',
            border: '1.5px solid var(--border)', borderRadius: 6,
            boxShadow: 'var(--shadow-md)', zIndex: 100, overflow: 'hidden',
          }}>
            <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <div style={{ position: 'relative' }}>
                <input
                  autoFocus type="text" placeholder="Search groups…"
                  value={search} onChange={e => setSearch(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  style={{ ...inputStyle, paddingLeft: 28, padding: '6px 10px 6px 28px', fontSize: 12 }}
                />
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2"
                  style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
            </div>

            {/* All option */}
            <div
              onClick={() => { onSelect(null); setOpen(false); setSearch('') }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                cursor: 'pointer', fontSize: 13,
                background: !selectedGroup ? '#F0F4FF' : 'none',
                color: !selectedGroup ? 'var(--brand)' : 'var(--text)',
                fontWeight: !selectedGroup ? 600 : 400,
                borderBottom: '1px solid var(--border)',
              }}
              onMouseEnter={e => { if (selectedGroup) e.currentTarget.style.background = 'var(--surface-2)' }}
              onMouseLeave={e => { if (selectedGroup) e.currentTarget.style.background = 'none' }}
            >
              <div style={{ width: 22, height: 22, borderRadius: 3, background: '#F1F2F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🌐</div>
              <span>{placeholder}</span>
            </div>

            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: 'var(--text-faint)' }}>No groups found</div>
              ) : filtered.map(g => (
                <div key={g.id}
                  onClick={() => { onSelect(g); setOpen(false); setSearch('') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                    cursor: 'pointer', fontSize: 13,
                    background: selectedGroup?.id === g.id ? '#F0F4FF' : 'none',
                    color: selectedGroup?.id === g.id ? 'var(--brand)' : 'var(--text)',
                    fontWeight: selectedGroup?.id === g.id ? 600 : 400,
                    borderBottom: '1px solid var(--border)',
                  }}
                  onMouseEnter={e => { if (selectedGroup?.id !== g.id) e.currentTarget.style.background = 'var(--surface-2)' }}
                  onMouseLeave={e => { if (selectedGroup?.id !== g.id) e.currentTarget.style.background = 'none' }}
                >
                  <div style={{ width: 22, height: 22, borderRadius: 3, background: '#DEEBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, overflow: 'hidden' }}>
                    {g.icon_image_url || g.icon_image
                      ? <img src={g.icon_image_url || g.icon_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : g.icon
                    }
                  </div>
                  <span>{g.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-faint)' }}>{g.prefix}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Searchable group multi-select list (for assign to groups) ─────────────────
function GroupSearchList({ groups, selectedIds, onToggle }) {
  const [search, setSearch] = useState('')
  const filtered = groups.filter(g =>
    !search ||
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.prefix.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <input
          type="text" autoComplete="off"
          placeholder="Search groups…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, paddingLeft: 30, fontSize: 12 }}
          onFocus={e => e.target.style.borderColor = '#4C9AFF'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2"
          style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </div>
      <div style={{ border: '1.5px solid var(--border)', borderRadius: 4, maxHeight: 200, overflowY: 'auto', background: '#fff' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '12px', textAlign: 'center', fontSize: 12, color: 'var(--text-faint)' }}>No groups found</div>
        ) : filtered.map((g, idx) => {
          const isSel = selectedIds.includes(g.id)
          return (
            <label key={g.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
              borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer', background: isSel ? '#F0F4FF' : '#fff', transition: 'background .12s',
            }}
              onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--surface-2)' }}
              onMouseLeave={e => { e.currentTarget.style.background = isSel ? '#F0F4FF' : '#fff' }}
            >
              <div style={{ width: 15, height: 15, borderRadius: 3, flexShrink: 0, border: '1.5px solid ' + (isSel ? 'var(--brand)' : 'var(--border)'), background: isSel ? 'var(--brand)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s' }}>
                {isSel && <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <input type="checkbox" checked={isSel} onChange={() => onToggle(g.id)} style={{ display: 'none' }} />
              <div style={{ width: 24, height: 24, borderRadius: 3, background: '#DEEBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, overflow: 'hidden' }}>
                {g.icon_image_url || g.icon_image
                  ? <img src={g.icon_image_url || g.icon_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : g.icon
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: isSel ? 600 : 400, color: isSel ? 'var(--brand)' : 'var(--text)' }}>{g.name}</div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>{g.prefix}</span>
            </label>
          )
        })}
      </div>
      {selectedIds.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {groups.filter(g => selectedIds.includes(g.id)).map(g => (
            <span key={g.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px 2px 6px', borderRadius: 20, background: '#DEEBFF', color: 'var(--brand)', fontSize: 11, fontWeight: 500 }}>
              {g.icon} {g.name}
              <button type="button" onClick={() => onToggle(g.id)} style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: 0, marginLeft: 2 }}>✕</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function LabelManagePage() {
  const queryClient               = useQueryClient()
  const { isAdmin, isSuperAdmin, user } = useAuth()

  const [selectedGroup, setSelectedGroup] = useState(null)
  const [modal,         setModal]         = useState(null)
  const [selected,      setSelected]      = useState(null)
  const [deleteTarget,  setDeleteTarget]  = useState(null)

  const [name,      setName]      = useState('')
  const [colourHex, setColourHex] = useState('#0052CC')
  const [isActive,  setIsActive]  = useState(true)
  const [groupIds,  setGroupIds]  = useState([])
  const [errors,    setErrors]    = useState({})

  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn:  () => groupsAPI.list().then(r => r.data.results),
  })
  const allGroups = groupsData || []

  // Managers only see their own groups
  const isManagerOnly = !isAdmin && !isSuperAdmin
  const myGroupIds    = user?.groups?.map(g => g.id) || []
  const visibleGroups = isManagerOnly
    ? allGroups.filter(g => myGroupIds.includes(g.id))
    : allGroups

  const { data: labelsData, isLoading } = useQuery({
    queryKey: ['config-labels', selectedGroup?.id],
    queryFn:  () => ticketsAPI.listLabels().then(r => r.data.results || r.data),
  })

  const allLabels = labelsData || []
  const labels    = selectedGroup
    ? allLabels.filter(l => l.groups?.some(g => g.id === selectedGroup.id))
    : allLabels

  const saveMutation = useMutation({
    mutationFn: (data) => selected
      ? ticketsAPI.updateLabel(selected.id, data)
      : ticketsAPI.createLabel(data),
    onSuccess: () => { queryClient.invalidateQueries(['config-labels']); closeModal() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => ticketsAPI.deleteLabel(id),
    onSuccess: () => { queryClient.invalidateQueries(['config-labels']); setDeleteTarget(null) },
  })

  function openCreate() {
    setSelected(null)
    setName(''); setColourHex('#0052CC'); setIsActive(true)
    setGroupIds(selectedGroup ? [selectedGroup.id] : [])
    setErrors({})
    setModal('form')
  }

  function openEdit(item) {
    setSelected(item)
    setName(item.name || '')
    setColourHex(item.colour_hex || '#0052CC')
    setIsActive(item.is_active)
    setGroupIds(item.groups?.map(g => g.id) || [])
    setErrors({})
    setModal('form')
  }

  function closeModal() { setModal(null); setSelected(null); setErrors({}) }

  function validate() {
    const e = {}
    if (!name.trim()) e.name = 'Name is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    saveMutation.mutate({ name, colour_hex: colourHex, is_active: isActive, group_ids: groupIds })
  }

  function toggleGroupId(id) {
    setGroupIds(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id])
  }

  const defaultLabel = (isManagerOnly && visibleGroups.length === 1)
    ? visibleGroups[0].name + ' — Labels'
    : 'All Labels'

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Admin › Label Management</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Label Management</h1>
        </div>
        <button onClick={openCreate}
          style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 4, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
        >+ Create Label</button>
      </div>

      {/* Group filter — searchable dropdown */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8, display: 'block' }}>
          Filter by Group
        </label>
        <GroupDropdown
          groups={visibleGroups}
          selectedGroup={selectedGroup}
          onSelect={setSelectedGroup}
          placeholder={defaultLabel}
        />
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            {selectedGroup ? `${selectedGroup.name} — Labels` : defaultLabel}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '2px 9px' }}>
            {labels.length} records
          </span>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner spinner-lg" /></div>
        ) : labels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🏷️</div>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No labels yet</p>
            <p style={{ fontSize: 13 }}>{selectedGroup ? `No labels assigned to ${selectedGroup.name}.` : 'Create your first label above.'}</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                {['Label', 'Colour', 'Groups', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labels.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => Array.from(e.currentTarget.cells).forEach(c => c.style.background = '#F8F9FD')}
                  onMouseLeave={e => Array.from(e.currentTarget.cells).forEach(c => c.style.background = '')}
                >
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: (item.colour_hex || '#0052CC') + '22', color: item.colour_hex || '#0052CC' }}>
                      {item.name}
                    </span>
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: item.colour_hex || '#0052CC', border: '1px solid var(--border)', flexShrink: 0 }} />
                      <code style={{ fontSize: 12 }}>{item.colour_hex}</code>
                    </div>
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {item.groups?.length > 0
                        ? item.groups.map(g => (
                            <span key={g.id} style={{ fontSize: 11, fontWeight: 600, background: '#DEEBFF', color: 'var(--brand)', padding: '2px 7px', borderRadius: 10 }}>
                              {g.icon} {g.name}
                            </span>
                          ))
                        : <span style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic' }}>None</span>
                      }
                    </div>
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: item.is_active ? '#006644' : '#BF2600', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.is_active ? '#36B37E' : '#FF5630', display: 'inline-block' }} />
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(item)}
                        style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 4, padding: '5px 12px', fontSize: 12, fontWeight: 500, color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >Edit</button>
                      <button onClick={() => setDeleteTarget(item)}
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
        )}
      </div>

      {/* Create / Edit modal */}
      {modal === 'form' && (
        <Modal title={selected ? 'Edit Label' : 'Create Label'} onClose={closeModal}>
          {saveMutation.isError && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid #FF8F73', borderRadius: 4, padding: '10px 14px', fontSize: 13, color: 'var(--danger)', marginBottom: 16 }}>
              ⚠️ {saveMutation.error?.response?.data?.detail || 'Failed to save.'}
            </div>
          )}

          {/* Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
              Name <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input type="text" value={name}
              onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })) }}
              placeholder="e.g. Bug"
              style={{ ...inputStyle, borderColor: errors.name ? 'var(--danger)' : 'var(--border)' }}
              onFocus={e => e.target.style.borderColor = '#4C9AFF'}
              onBlur={e => e.target.style.borderColor = errors.name ? 'var(--danger)' : 'var(--border)'}
            />
            {errors.name && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>⊘ {errors.name}</div>}
          </div>

          {/* Colour */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Colour</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="color" value={colourHex} onChange={e => setColourHex(e.target.value)}
                style={{ width: 44, height: 36, border: '1.5px solid var(--border)', borderRadius: 4, cursor: 'pointer', padding: 2 }}
              />
              <input type="text" value={colourHex} onChange={e => setColourHex(e.target.value)}
                placeholder="#0052CC"
                style={{ ...inputStyle, maxWidth: 120 }}
                onFocus={e => e.target.style.borderColor = '#4C9AFF'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: colourHex + '22', color: colourHex }}>
                {name || 'Preview'}
              </span>
            </div>
          </div>

          {/* Assign to Groups — searchable list */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
              Assign to Groups
              {groupIds.length > 0 && (
                <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 400, color: 'var(--brand)' }}>{groupIds.length} selected</span>
              )}
            </label>
            <GroupSearchList
              groups={visibleGroups}
              selectedIds={groupIds}
              onToggle={toggleGroupId}
            />
          </div>

          {/* Status */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Status</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[{ val: true, label: 'Active' }, { val: false, label: 'Inactive' }].map(opt => (
                <label key={String(opt.val)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                  border: '1.5px solid ' + (isActive === opt.val ? 'var(--brand)' : 'var(--border)'),
                  borderRadius: 4, cursor: 'pointer', fontSize: 13,
                  background: isActive === opt.val ? '#F0F4FF' : '#fff',
                  color: isActive === opt.val ? 'var(--brand)' : 'var(--text-muted)',
                  transition: 'all .15s',
                }}>
                  <input type="radio" checked={isActive === opt.val} onChange={() => setIsActive(opt.val)} style={{ accentColor: 'var(--brand)' }} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={closeModal}
              style={{ background: 'none', border: '1.5px solid var(--border)', color: 'var(--text)', borderRadius: 4, padding: '8px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={handleSave} disabled={saveMutation.isPending}
              style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 4, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: saveMutation.isPending ? 0.7 : 1 }}
              onMouseEnter={e => { if (!saveMutation.isPending) e.currentTarget.style.background = 'var(--brand-hover)' }}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
            >{saveMutation.isPending ? 'Saving…' : selected ? 'Save Changes' : 'Create'}</button>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,30,66,.45)', zIndex: 200 }} onClick={() => setDeleteTarget(null)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', borderRadius: 8, padding: '28px 32px', zIndex: 201, width: 440, boxShadow: '0 8px 32px rgba(9,30,66,.3)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>Delete Label</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: 1.6 }}>
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)}
                style={{ background: 'none', border: '1.5px solid var(--border)', color: 'var(--text)', borderRadius: 4, padding: '8px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}
                style={{ background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 4, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: deleteMutation.isPending ? 0.7 : 1 }}>
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}