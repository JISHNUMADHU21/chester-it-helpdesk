import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workTypeAPI } from '../../../api/config'
import { groupsAPI } from '../../../api/groups'

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
        zIndex: 201, width: 520, boxShadow: '0 8px 32px rgba(9,30,66,.3)',
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

export default function WorkTypeManagePage() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)

  const [selectedGroup, setSelectedGroup] = useState(null)
  const [modal,         setModal]         = useState(null)
  const [selected,      setSelected]      = useState(null)
  const [deleteTarget,  setDeleteTarget]  = useState(null)

  // Form state
  const [name,         setName]         = useState('')
  const [slug,         setSlug]         = useState('')
  const [description,  setDescription]  = useState('')
  const [order,        setOrder]        = useState(0)
  const [isActive,     setIsActive]     = useState(true)
  const [groupIds,     setGroupIds]     = useState([])
  const [iconFile,     setIconFile]     = useState(null)
  const [iconPreview,  setIconPreview]  = useState(null)
  const [existingIcon, setExistingIcon] = useState(null)
  const [removeIcon,   setRemoveIcon]   = useState(false)
  const [errors,       setErrors]       = useState({})

  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn:  () => groupsAPI.list().then(r => r.data.results),
  })
  const groups = groupsData || []

  const { data: workTypesData, isLoading } = useQuery({
    queryKey: ['config-worktypes', selectedGroup?.id],
    queryFn:  () => selectedGroup
      ? workTypeAPI.listByGroup(selectedGroup.id).then(r => r.data.results || r.data)
      : workTypeAPI.list().then(r => r.data.results || r.data),
    enabled: true,
  })
  const workTypes = workTypesData || []

  const saveMutation = useMutation({
    mutationFn: (formData) => selected
      ? workTypeAPI.update(selected.id, formData)
      : workTypeAPI.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries(['config-worktypes'])
      closeModal()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => workTypeAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['config-worktypes'])
      setDeleteTarget(null)
    },
  })

  function openCreate() {
    setSelected(null)
    setName(''); setSlug(''); setDescription(''); setOrder(0); setIsActive(true)
    setGroupIds(selectedGroup ? [selectedGroup.id] : [])
    setIconFile(null); setIconPreview(null); setExistingIcon(null); setRemoveIcon(false)
    setErrors({})
    setModal('form')
  }

  function openEdit(item) {
    setSelected(item)
    setName(item.name || ''); setSlug(item.slug || ''); setDescription(item.description || '')
    setOrder(item.order || 0); setIsActive(item.is_active)
    setGroupIds(item.groups?.map(g => g.id) || [])
    setIconFile(null); setIconPreview(null)
    setExistingIcon(item.icon_image || null); setRemoveIcon(false)
    setErrors({})
    setModal('form')
  }

  function closeModal() {
    setModal(null); setSelected(null); setErrors({})
    setIconFile(null); setIconPreview(null); setExistingIcon(null); setRemoveIcon(false)
  }

  function handleIconChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1024 * 1024) { setErrors(p => ({ ...p, icon: 'Image must be under 1MB' })); return }
    if (!['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(file.type)) {
      setErrors(p => ({ ...p, icon: 'Only PNG, JPG, SVG or WebP allowed' })); return
    }
    setErrors(p => ({ ...p, icon: '' }))
    setIconFile(file)
    setIconPreview(URL.createObjectURL(file))
    setRemoveIcon(false)
  }

  function autoSlug(val) {
    return val.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  }

  function handleNameChange(val) {
    setName(val)
    if (!selected) setSlug(autoSlug(val))
  }

  function validate() {
    const e = {}
    if (!name.trim()) e.name = 'Name is required'
    if (!slug.trim()) e.slug = 'Slug is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    const formData = new FormData()
    formData.append('name',        name)
    formData.append('slug',        slug)
    formData.append('description', description)
    formData.append('order',       order)
    formData.append('is_active',   isActive)
    groupIds.forEach(id => formData.append('group_ids', id))
    if (iconFile)        formData.append('icon_image', iconFile)
    else if (removeIcon) formData.append('icon_image', '')
    saveMutation.mutate(formData)
  }

  function toggleGroupId(id) {
    setGroupIds(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id])
  }

  const displayIcon = iconPreview || (removeIcon ? null : existingIcon)

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Admin › Work Type Management</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Work Type Management</h1>
        </div>
        <button onClick={openCreate}
          style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 4, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
        >+ Create Work Type</button>
      </div>

      {/* Group selector */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8, display: 'block' }}>
          Filter by Group
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedGroup(null)}
            style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              border: '1.5px solid ' + (!selectedGroup ? 'var(--brand)' : 'var(--border)'),
              background: !selectedGroup ? '#DEEBFF' : '#fff',
              color: !selectedGroup ? 'var(--brand)' : 'var(--text-muted)',
              fontFamily: 'inherit', transition: 'all .15s',
            }}
          >All Groups</button>
          {groups.map(g => (
            <button key={g.id}
              onClick={() => setSelectedGroup(g)}
              style={{
                padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                border: '1.5px solid ' + (selectedGroup?.id === g.id ? 'var(--brand)' : 'var(--border)'),
                background: selectedGroup?.id === g.id ? '#DEEBFF' : '#fff',
                color: selectedGroup?.id === g.id ? 'var(--brand)' : 'var(--text-muted)',
                fontFamily: 'inherit', transition: 'all .15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {g.icon_image
                ? <img src={g.icon_image_url || g.icon_image} alt="" style={{ width: 16, height: 16, objectFit: 'cover', borderRadius: 2 }} />
                : <span>{g.icon}</span>
              }
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            {selectedGroup ? `${selectedGroup.name} — Work Types` : 'All Work Types'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '2px 9px' }}>
            {workTypes.length} records
          </span>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner spinner-lg" /></div>
        ) : workTypes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔧</div>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No work types yet</p>
            <p style={{ fontSize: 13 }}>
              {selectedGroup ? `No work types assigned to ${selectedGroup.name}.` : 'Create your first work type above.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                {['Work Type', 'Slug', 'Groups', 'Description', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {workTypes.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => Array.from(e.currentTarget.cells).forEach(c => c.style.background = '#F8F9FD')}
                  onMouseLeave={e => Array.from(e.currentTarget.cells).forEach(c => c.style.background = '')}
                >
                  <td style={{ padding: '13px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 4, background: '#F4F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                        {item.icon_image
                          ? <img src={item.icon_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: 18 }}>{item.icon || '🔧'}</span>
                        }
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <code style={{ fontSize: 12, background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 3 }}>{item.slug}</code>
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
                  <td style={{ padding: '13px 18px', fontSize: 12, color: 'var(--text-muted)', maxWidth: 200 }}>
                    {item.description || '—'}
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
        <Modal title={selected ? 'Edit Work Type' : 'Create Work Type'} onClose={closeModal}>
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
            <input type="text" value={name} onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g. Change Request"
              style={{ ...inputStyle, borderColor: errors.name ? 'var(--danger)' : 'var(--border)' }}
              onFocus={e => e.target.style.borderColor = '#4C9AFF'}
              onBlur={e => e.target.style.borderColor = errors.name ? 'var(--danger)' : 'var(--border)'}
            />
            {errors.name && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>⊘ {errors.name}</div>}
          </div>

          {/* Slug */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
              Slug <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input type="text" value={slug} onChange={e => setSlug(e.target.value)}
              placeholder="e.g. change_request"
              style={{ ...inputStyle, borderColor: errors.slug ? 'var(--danger)' : 'var(--border)' }}
              onFocus={e => e.target.style.borderColor = '#4C9AFF'}
              onBlur={e => e.target.style.borderColor = errors.slug ? 'var(--danger)' : 'var(--border)'}
            />
            <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>Auto-generated from name. Lowercase and underscores only.</p>
            {errors.slug && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>⊘ {errors.slug}</div>}
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Describe when this work type is used"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
              onFocus={e => e.target.style.borderColor = '#4C9AFF'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Icon upload */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Icon Image</label>
            <p style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 8 }}>PNG, JPG, SVG or WebP. Max 1MB.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 6, border: '1.5px solid var(--border)', background: '#F4F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {displayIcon
                  ? <img src={displayIcon} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 22 }}>🔧</span>
                }
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 4, padding: '6px 12px', fontSize: 12, fontWeight: 500, color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >{displayIcon ? 'Change' : 'Upload'}</button>
                {displayIcon && (
                  <button type="button" onClick={() => { setIconFile(null); setIconPreview(null); setRemoveIcon(true); if (fileInputRef.current) fileInputRef.current.value = '' }}
                    style={{ background: 'none', border: '1.5px solid #FF8F73', borderRadius: 4, padding: '6px 12px', fontSize: 12, fontWeight: 500, color: 'var(--danger)', cursor: 'pointer', fontFamily: 'inherit' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >Remove</button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" style={{ display: 'none' }} onChange={handleIconChange} />
            </div>
            {errors.icon && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>⊘ {errors.icon}</div>}
          </div>

          {/* Order */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Order</label>
            <input type="number" value={order} onChange={e => setOrder(e.target.value)} min={0}
              style={{ ...inputStyle, maxWidth: 100 }}
              onFocus={e => e.target.style.borderColor = '#4C9AFF'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Groups */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
              Assign to Groups
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {groups.map(g => {
                const isSel = groupIds.includes(g.id)
                return (
                  <label key={g.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                    border: '1.5px solid ' + (isSel ? 'var(--brand)' : 'var(--border)'),
                    borderRadius: 4, cursor: 'pointer',
                    background: isSel ? '#F0F4FF' : '#fff',
                    fontSize: 13, transition: 'all .12s',
                  }}>
                    <div style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0, border: '1.5px solid ' + (isSel ? 'var(--brand)' : 'var(--border)'), background: isSel ? 'var(--brand)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isSel && <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <input type="checkbox" checked={isSel} onChange={() => toggleGroupId(g.id)} style={{ display: 'none' }} />
                    <span style={{ fontSize: 13 }}>{g.icon} {g.name}</span>
                  </label>
                )
              })}
            </div>
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
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>Delete Work Type</h3>
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