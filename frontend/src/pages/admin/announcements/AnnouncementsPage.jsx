import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { announcementAPI } from '../../../api/config'
import { useAuth } from '../../../context/AuthContext'

const TAG_STYLES = {
  maintenance: { bg: '#FFF0E0', color: '#974F0C', label: 'Maintenance' },
  new_feature: { bg: '#E3FCEF', color: '#006644', label: 'New Feature' },
  update:      { bg: '#DEEBFF', color: '#0747A6', label: 'Update'      },
  alert:       { bg: '#FFEBE6', color: '#BF2600', label: 'Alert'       },
  info:        { bg: '#F1F2F4', color: '#5E6C84', label: 'Info'        },
}

const inputStyle = {
  width: '100%', padding: '9px 12px', border: '1.5px solid var(--border)',
  borderRadius: 4, fontFamily: 'inherit', fontSize: 13, color: 'var(--text)',
  background: '#fff', outline: 'none', transition: 'border-color .15s',
}

const selectStyle = {
  width: '100%', padding: '9px 32px 9px 12px', border: '1.5px solid var(--border)',
  borderRadius: 4, fontFamily: 'inherit', fontSize: 13, color: 'var(--text)',
  background: '#fff', outline: 'none', appearance: 'none', WebkitAppearance: 'none',
  cursor: 'pointer', transition: 'border-color .15s',
}

export default function AnnouncementsPage() {
  const { isManager } = useAuth()
  const queryClient   = useQueryClient()

  const [modal,        setModal]        = useState(null)
  const [selected,     setSelected]     = useState(null)
  const [title,        setTitle]        = useState('')
  const [body,         setBody]         = useState('')
  const [tag,          setTag]          = useState('info')
  const [isActive,     setIsActive]     = useState(true)
  const [errors,       setErrors]       = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['announcements-admin'],
    queryFn:  () => announcementAPI.list().then(r => r.data.results || r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (data) => selected
      ? announcementAPI.update(selected.id, data)
      : announcementAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['announcements-admin'])
      queryClient.invalidateQueries(['announcements'])
      closeModal()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => announcementAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['announcements-admin'])
      queryClient.invalidateQueries(['announcements'])
      setDeleteTarget(null)
    },
  })

  function openCreate() {
    setSelected(null)
    setTitle(''); setBody(''); setTag('info'); setIsActive(true); setErrors({})
    setModal('form')
  }

  function openEdit(item) {
    setSelected(item)
    setTitle(item.title); setBody(item.body); setTag(item.tag); setIsActive(item.is_active); setErrors({})
    setModal('form')
  }

  function closeModal() {
    setModal(null); setSelected(null)
    setTitle(''); setBody(''); setTag('info'); setIsActive(true); setErrors({})
  }

  function handleSave() {
    const e = {}
    if (!title.trim()) e.title = 'Title is required'
    if (!body.trim())  e.body  = 'Body is required'
    if (Object.keys(e).length) { setErrors(e); return }
    saveMutation.mutate({ title, body, tag, is_active: isActive })
  }

  const announcements = data || []

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Admin › Announcements</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Announcements Management</h1>
        </div>
        <button onClick={openCreate}
          style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 4, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
        >+ New Announcement</button>
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner spinner-lg" /></div>
      ) : announcements.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📢</div>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No announcements yet</p>
          <p style={{ fontSize: 13 }}>Create one to display on the home page.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {announcements.map(a => {
            const ts = TAG_STYLES[a.tag] || TAG_STYLES.info
            return (
              <div key={a.id} style={{
                background: '#fff', border: '1px solid var(--border)', borderRadius: 8,
                padding: '18px 20px', opacity: a.is_active ? 1 : 0.6,
                transition: 'box-shadow .15s',
              }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', padding: '3px 8px', borderRadius: 3, background: ts.bg, color: ts.color }}>
                    {ts.label}
                  </span>
                  {!a.is_active && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 10 }}>Hidden</span>
                  )}
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px', lineHeight: 1.4 }}>{a.title}</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 12px' }}>{a.body}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                    {a.created_by_name} · {new Date(a.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(a)}
                      style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 4, padding: '4px 10px', fontSize: 12, fontWeight: 500, color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >Edit</button>
                    <button onClick={() => setDeleteTarget(a)}
                      style={{ background: 'none', border: '1.5px solid #FF8F73', borderRadius: 4, padding: '4px 10px', fontSize: 12, fontWeight: 500, color: 'var(--danger)', cursor: 'pointer', fontFamily: 'inherit' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >Delete</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      {modal === 'form' && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,30,66,.45)', zIndex: 200 }} onClick={closeModal} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: '#fff', borderRadius: 8, padding: '28px 32px',
            zIndex: 201, width: 520, boxShadow: '0 8px 32px rgba(9,30,66,.3)',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{selected ? 'Edit Announcement' : 'New Announcement'}</h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>

            {saveMutation.isError && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid #FF8F73', borderRadius: 4, padding: '10px 14px', fontSize: 13, color: 'var(--danger)', marginBottom: 16 }}>
                ⚠️ Failed to save announcement.
              </div>
            )}

            {/* Tag */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Tag</label>
              <div style={{ position: 'relative' }}>
                <select value={tag} onChange={e => setTag(e.target.value)} style={selectStyle}
                  onFocus={e => e.target.style.borderColor = '#4C9AFF'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                >
                  <option value="info">Info</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="new_feature">New Feature</option>
                  <option value="update">Update</option>
                  <option value="alert">Alert</option>
                </select>
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 11, color: 'var(--text-muted)' }}>▾</span>
              </div>
            </div>

            {/* Title */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                Title <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input type="text" value={title} onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: '' })) }}
                placeholder="e.g. Scheduled maintenance on 7 Jun"
                style={{ ...inputStyle, borderColor: errors.title ? 'var(--danger)' : 'var(--border)' }}
                onFocus={e => e.target.style.borderColor = '#4C9AFF'}
                onBlur={e => e.target.style.borderColor = errors.title ? 'var(--danger)' : 'var(--border)'}
              />
              {errors.title && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>⊘ {errors.title}</div>}
            </div>

            {/* Body */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                Body <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <textarea value={body} onChange={e => { setBody(e.target.value); setErrors(p => ({ ...p, body: '' })) }}
                placeholder="Describe the announcement in detail…"
                rows={4}
                style={{ ...inputStyle, resize: 'vertical', borderColor: errors.body ? 'var(--danger)' : 'var(--border)' }}
                onFocus={e => e.target.style.borderColor = '#4C9AFF'}
                onBlur={e => e.target.style.borderColor = errors.body ? 'var(--danger)' : 'var(--border)'}
              />
              {errors.body && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>⊘ {errors.body}</div>}
            </div>

            {/* Visibility */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Visibility</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ val: true, label: '👁 Visible on home page' }, { val: false, label: '🙈 Hidden' }].map(opt => (
                  <label key={String(opt.val)} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', border: '1.5px solid ' + (isActive === opt.val ? 'var(--brand)' : 'var(--border)'),
                    borderRadius: 4, cursor: 'pointer', fontSize: 13,
                    background: isActive === opt.val ? '#F0F4FF' : '#fff',
                    color: isActive === opt.val ? 'var(--brand)' : 'var(--text-muted)',
                    transition: 'all .15s',
                  }}>
                    <input type="radio" checked={isActive === opt.val} onChange={() => setIsActive(opt.val)}
                      style={{ accentColor: 'var(--brand)' }} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Preview */}
            {(title || body) && (
              <div style={{ marginBottom: 20, padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 6, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-faint)', marginBottom: 8 }}>Preview</div>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', padding: '3px 8px', borderRadius: 3, background: TAG_STYLES[tag]?.bg, color: TAG_STYLES[tag]?.color, marginBottom: 8, display: 'inline-block' }}>
                  {TAG_STYLES[tag]?.label}
                </span>
                {title && <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4, marginTop: 6 }}>{title}</div>}
                {body && <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{body}</div>}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={closeModal}
                style={{ background: 'none', border: '1.5px solid var(--border)', color: 'var(--text)', borderRadius: 4, padding: '8px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handleSave} disabled={saveMutation.isPending}
                style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 4, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: saveMutation.isPending ? 0.7 : 1 }}
                onMouseEnter={e => { if (!saveMutation.isPending) e.currentTarget.style.background = 'var(--brand-hover)' }}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
              >{saveMutation.isPending ? 'Saving…' : selected ? 'Save Changes' : 'Publish'}</button>
            </div>
          </div>
        </>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,30,66,.45)', zIndex: 200 }} onClick={() => setDeleteTarget(null)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', borderRadius: 8, padding: '28px 32px', zIndex: 201, width: 440, boxShadow: '0 8px 32px rgba(9,30,66,.3)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>Delete Announcement</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: 1.6 }}>
              Are you sure you want to delete <strong>"{deleteTarget.title}"</strong>? This cannot be undone.
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