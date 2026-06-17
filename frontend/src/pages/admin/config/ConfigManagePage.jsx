import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

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
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text)' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </>
  )
}

/**
 * Generic config management page.
 *
 * Props:
 *   title        — page title e.g. "Status Management"
 *   queryKey     — react-query key e.g. 'config-statuses'
 *   api          — { list, create, update, delete }
 *   fields       — array of field definitions for the form
 *   columns      — array of { header, render } for the table
 *   breadcrumb   — string e.g. "Admin › Status Management"
 *   canCreate    — bool (some roles can't create)
 *   canDelete    — bool
 */
export default function ConfigManagePage({
  title, queryKey, api, fields, columns,
  breadcrumb, canCreate = true, canDelete = true,
}) {
  const queryClient = useQueryClient()
  const [modal,         setModal]         = useState(null)  // null | 'create' | 'edit' | 'delete'
  const [selected,      setSelected]      = useState(null)
  const [formData,      setFormData]      = useState({})
  const [formErrors,    setFormErrors]    = useState({})

  const { data, isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn:  () => api.list().then(r => r.data.results || r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (data) => selected
      ? api.update(selected.id, data)
      : api.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries([queryKey])
      closeModal()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries([queryKey])
      closeModal()
    },
  })

  function openCreate() {
    setSelected(null)
    const defaults = {}
    fields.forEach(f => { defaults[f.key] = f.default ?? '' })
    setFormData(defaults)
    setFormErrors({})
    setModal('create')
  }

  function openEdit(item) {
    setSelected(item)
    const vals = {}
    fields.forEach(f => { vals[f.key] = item[f.key] ?? f.default ?? '' })
    setFormData(vals)
    setFormErrors({})
    setModal('edit')
  }

  function openDelete(item) {
    setSelected(item)
    setModal('delete')
  }

  function closeModal() {
    setModal(null)
    setSelected(null)
    setFormData({})
    setFormErrors({})
  }

  function handleSave() {
    const errs = {}
    fields.forEach(f => {
      if (f.required && !String(formData[f.key] || '').trim()) {
        errs[f.key] = `${f.label} is required`
      }
    })
    if (Object.keys(errs).length) { setFormErrors(errs); return }
    saveMutation.mutate(formData)
  }

  const items = data || []

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{breadcrumb}</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{title}</h1>
        </div>
        {canCreate && (
          <button onClick={openCreate}
            style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 4, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
          >+ Create {title.replace(' Management', '')}</button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>All {title.replace(' Management', 's')}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '2px 9px' }}>{items.length} records</span>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner spinner-lg" /></div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No records yet</p>
            {canCreate && <p style={{ fontSize: 13 }}>Click "Create" above to add your first record.</p>}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                {[...columns.map(c => c.header), 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => Array.from(e.currentTarget.cells).forEach(c => c.style.background = '#F8F9FD')}
                  onMouseLeave={e => Array.from(e.currentTarget.cells).forEach(c => c.style.background = '')}
                >
                  {columns.map(col => (
                    <td key={col.header} style={{ padding: '13px 18px', fontSize: 13, verticalAlign: 'middle' }}>
                      {col.render(item)}
                    </td>
                  ))}
                  <td style={{ padding: '13px 18px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(item)}
                        style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 4, padding: '5px 12px', fontSize: 12, fontWeight: 500, color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >Edit</button>
                      {canDelete && (
                        <button onClick={() => openDelete(item)}
                          style={{ background: 'none', border: '1.5px solid #FF8F73', borderRadius: 4, padding: '5px 12px', fontSize: 12, fontWeight: 500, color: 'var(--danger)', cursor: 'pointer', fontFamily: 'inherit' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-bg)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit modal */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? `Create ${title.replace(' Management', '')}` : `Edit ${title.replace(' Management', '')}`} onClose={closeModal}>
          {saveMutation.isError && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid #FF8F73', borderRadius: 4, padding: '10px 14px', fontSize: 13, color: 'var(--danger)', marginBottom: 16 }}>
              ⚠️ {saveMutation.error?.response?.data?.detail || 'Failed to save.'}
            </div>
          )}
          {fields.map(f => (
            <div key={f.key} style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                {f.label}{f.required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
              </label>
              {f.type === 'textarea' ? (
                <textarea value={formData[f.key] || ''} onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} rows={3}
                  style={{ ...inputStyle, resize: 'vertical', borderColor: formErrors[f.key] ? 'var(--danger)' : 'var(--border)' }}
                  onFocus={e => e.target.style.borderColor = '#4C9AFF'}
                  onBlur={e => e.target.style.borderColor = formErrors[f.key] ? 'var(--danger)' : 'var(--border)'}
                />
              ) : f.type === 'color' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="color" value={formData[f.key] || '#000000'}
                    onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: 44, height: 36, border: '1.5px solid var(--border)', borderRadius: 4, cursor: 'pointer', padding: 2 }}
                  />
                  <input type="text" value={formData[f.key] || ''} onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder="#000000" style={{ ...inputStyle, maxWidth: 120 }}
                    onFocus={e => e.target.style.borderColor = '#4C9AFF'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                  {formData[f.key] && (
                    <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: formData[f.key] + '22', color: formData[f.key] }}>
                      Preview
                    </span>
                  )}
                </div>
              ) : f.type === 'number' ? (
                <input type="number" value={formData[f.key] ?? ''} onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} min={f.min ?? 0}
                  style={{ ...inputStyle, maxWidth: 120, borderColor: formErrors[f.key] ? 'var(--danger)' : 'var(--border)' }}
                  onFocus={e => e.target.style.borderColor = '#4C9AFF'}
                  onBlur={e => e.target.style.borderColor = formErrors[f.key] ? 'var(--danger)' : 'var(--border)'}
                />
              ) : f.type === 'toggle' ? (
                <div style={{ display: 'flex', gap: 10 }}>
                  {[{ val: true, label: 'Active' }, { val: false, label: 'Inactive' }].map(opt => (
                    <label key={String(opt.val)} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', border: '1.5px solid ' + (formData[f.key] === opt.val ? 'var(--brand)' : 'var(--border)'),
                      borderRadius: 4, cursor: 'pointer', fontSize: 13,
                      background: formData[f.key] === opt.val ? '#F0F4FF' : '#fff',
                      color: formData[f.key] === opt.val ? 'var(--brand)' : 'var(--text-muted)',
                      transition: 'all .15s',
                    }}>
                      <input type="radio" checked={formData[f.key] === opt.val} onChange={() => setFormData(p => ({ ...p, [f.key]: opt.val }))}
                        style={{ accentColor: 'var(--brand)' }} />
                      {opt.label}
                    </label>
                  ))}
                </div>
              ) : (
                <input type={f.type || 'text'} value={formData[f.key] || ''} onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ ...inputStyle, borderColor: formErrors[f.key] ? 'var(--danger)' : 'var(--border)' }}
                  onFocus={e => e.target.style.borderColor = '#4C9AFF'}
                  onBlur={e => e.target.style.borderColor = formErrors[f.key] ? 'var(--danger)' : 'var(--border)'}
                />
              )}
              {formErrors[f.key] && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>⊘ {formErrors[f.key]}</div>}
              {f.hint && <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>{f.hint}</p>}
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button onClick={closeModal}
              style={{ background: 'none', border: '1.5px solid var(--border)', color: 'var(--text)', borderRadius: 4, padding: '8px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={handleSave} disabled={saveMutation.isPending}
              style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 4, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: saveMutation.isPending ? 0.7 : 1 }}
              onMouseEnter={e => { if (!saveMutation.isPending) e.currentTarget.style.background = 'var(--brand-hover)' }}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
            >{saveMutation.isPending ? 'Saving…' : 'Save'}</button>
          </div>
        </Modal>
      )}

      {/* Delete modal */}
      {modal === 'delete' && (
        <Modal title="Confirm Delete" onClose={closeModal}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
            Are you sure you want to delete <strong>{selected?.name}</strong>? This action cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={closeModal}
              style={{ background: 'none', border: '1.5px solid var(--border)', color: 'var(--text)', borderRadius: 4, padding: '8px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={() => deleteMutation.mutate(selected.id)} disabled={deleteMutation.isPending}
              style={{ background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 4, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: deleteMutation.isPending ? 0.7 : 1 }}>
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}