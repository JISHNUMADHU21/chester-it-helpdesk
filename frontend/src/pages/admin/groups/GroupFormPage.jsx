import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groupsAPI } from '../../../api/groups'

const inputStyle = {
  width: '100%', padding: '9px 12px', border: '1.5px solid var(--border)',
  borderRadius: 4, fontFamily: 'inherit', fontSize: 13, color: 'var(--text)',
  background: '#fff', outline: 'none', transition: 'border-color .15s',
}

function Field({ label, required, error, hint, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
        {label}{required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>{hint}</p>}
      {error && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 5 }}>⊘ {error}</div>}
    </div>
  )
}

export default function GroupFormPage() {
  const { id }      = useParams()
  const isEdit      = Boolean(id)
  const navigate    = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)

  const [name,          setName]          = useState('')
  const [prefix,        setPrefix]        = useState('')
  const [email,         setEmail]         = useState('')
  const [description,   setDescription]   = useState('')
  const [isActive,      setIsActive]      = useState(true)
  const [errors,        setErrors]        = useState({})

  // Icon — either an uploaded file (new) or existing URL (from server)
  const [iconFile,      setIconFile]      = useState(null)   // File object for new upload
  const [iconPreview,   setIconPreview]   = useState(null)   // Local preview URL
  const [existingIcon,  setExistingIcon]  = useState(null)   // URL from server (edit mode)
  const [removeIcon,    setRemoveIcon]    = useState(false)  // Flag to remove existing icon

  const { data: groupData, isLoading } = useQuery({
    queryKey: ['admin-group', id],
    queryFn:  () => groupsAPI.get(id).then(r => r.data),
    enabled:  isEdit,
  })

  useEffect(() => {
    if (groupData) {
      setName(groupData.name || '')
      setPrefix(groupData.prefix || '')
      setEmail(groupData.email || '')
      setDescription(groupData.description || '')
      setIsActive(groupData.is_active)
      setExistingIcon(groupData.icon_image || null)
    }
  }, [groupData])

  // Clean up object URL on unmount
  useEffect(() => {
    return () => { if (iconPreview) URL.revokeObjectURL(iconPreview) }
  }, [iconPreview])

  const saveMutation = useMutation({
    mutationFn: (formData) => isEdit
      ? groupsAPI.update(id, formData)
      : groupsAPI.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-groups'])
      queryClient.invalidateQueries(['groups'])
      navigate('/admin/groups')
    },
  })

  function handleIconChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate
    if (file.size > 1024 * 1024) {
      setErrors(p => ({ ...p, icon: 'Image must be under 1MB' }))
      return
    }
    if (!['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(file.type)) {
      setErrors(p => ({ ...p, icon: 'Only PNG, JPG, SVG or WebP allowed' }))
      return
    }

    setErrors(p => ({ ...p, icon: '' }))
    setIconFile(file)
    setIconPreview(URL.createObjectURL(file))
    setRemoveIcon(false)
  }

  function handleRemoveIcon() {
    setIconFile(null)
    setIconPreview(null)
    setRemoveIcon(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function validate() {
    const e = {}
    if (!name.trim())   e.name   = 'Group name is required'
    if (!prefix.trim()) e.prefix = 'Prefix is required'
    else if (!/^[A-Z0-9]+$/.test(prefix.toUpperCase())) e.prefix = 'Prefix must be letters/numbers only'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(ev) {
    ev.preventDefault()
    if (!validate()) return

    // Use FormData to support file upload
    const formData = new FormData()
    formData.append('name',        name)
    formData.append('prefix',      prefix.toUpperCase())
    formData.append('email',       email)
    formData.append('description', description)
    formData.append('is_active',   isActive)

    if (iconFile) {
      formData.append('icon_image', iconFile)
    } else if (removeIcon) {
      formData.append('icon_image', '')
    }

    saveMutation.mutate(formData)
  }

  // Current icon display — new preview takes priority, then existing, then placeholder
  const displayIcon = iconPreview || (removeIcon ? null : existingIcon)

  if (isEdit && isLoading) return <div className="page-loader"><div className="spinner spinner-lg" /></div>

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
          <span style={{ cursor: 'pointer', color: 'var(--brand)' }} onClick={() => navigate('/admin/groups')}>
            Group Management
          </span>
          {' › '}{isEdit ? 'Edit Group' : 'Create Group'}
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
          {isEdit ? `Edit Group — ${groupData?.name}` : 'Create New Group'}
        </h1>
      </div>

      {saveMutation.isError && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid #FF8F73', borderRadius: 4, padding: '10px 14px', fontSize: 13, color: 'var(--danger)', marginBottom: 20 }}>
          ⚠️ {saveMutation.error?.response?.data?.detail || 'Failed to save group.'}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '28px 32px', maxWidth: 700 }}>

          <Field label="Group Name" required error={errors.name}>
            <input type="text" value={name}
              onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })) }}
              placeholder="e.g. IT & Networks"
              style={{ ...inputStyle, borderColor: errors.name ? 'var(--danger)' : 'var(--border)' }}
              onFocus={e => e.target.style.borderColor = '#4C9AFF'}
              onBlur={e => e.target.style.borderColor = errors.name ? 'var(--danger)' : 'var(--border)'}
            />
          </Field>

          {/* Prefix only — no Display Order */}
          <Field label="Prefix" required error={errors.prefix}
            hint="Used to generate ticket keys e.g. IT-0001. Letters and numbers only, max 6 chars.">
            <input type="text" value={prefix}
              onChange={e => { setPrefix(e.target.value.toUpperCase().slice(0, 6)); setErrors(p => ({ ...p, prefix: '' })) }}
              placeholder="e.g. IT"
              style={{ ...inputStyle, maxWidth: 160, textTransform: 'uppercase', borderColor: errors.prefix ? 'var(--danger)' : 'var(--border)' }}
              onFocus={e => e.target.style.borderColor = '#4C9AFF'}
              onBlur={e => e.target.style.borderColor = errors.prefix ? 'var(--danger)' : 'var(--border)'}
            />
          </Field>

          <Field label="Group Email" hint="Notifications for this group will be sent to this address.">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="e.g. it@chesterracecourse.co.uk"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#4C9AFF'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </Field>

          <Field label="Description">
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of what this group handles…"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
              onFocus={e => e.target.style.borderColor = '#4C9AFF'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </Field>

          {/* Icon image upload */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
              Group Icon
            </label>
            <p style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 10, marginTop: -4 }}>
              Upload a PNG, JPG, SVG or WebP image. Recommended size: 64×64px. Max 1MB.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Preview */}
              <div style={{
                width: 64, height: 64, borderRadius: 8, flexShrink: 0,
                border: '1.5px solid var(--border)',
                background: '#DEEBFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', fontSize: 28,
              }}>
                {displayIcon
                  ? <img src={displayIcon} alt="Icon preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 28 }}>🖼️</span>
                }
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: 'none', border: '1.5px solid var(--border)',
                    borderRadius: 4, padding: '7px 16px', fontSize: 13,
                    fontWeight: 500, color: 'var(--text)', cursor: 'pointer',
                    fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  {displayIcon ? 'Change Icon' : 'Upload Icon'}
                </button>

                {displayIcon && (
                  <button
                    type="button"
                    onClick={handleRemoveIcon}
                    style={{
                      background: 'none', border: '1.5px solid #FF8F73',
                      borderRadius: 4, padding: '7px 16px', fontSize: 13,
                      fontWeight: 500, color: 'var(--danger)', cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    Remove Icon
                  </button>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                style={{ display: 'none' }}
                onChange={handleIconChange}
              />
            </div>

            {iconFile && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                Selected: <strong>{iconFile.name}</strong> ({Math.round(iconFile.size / 1024)}KB)
              </p>
            )}
            {errors.icon && (
              <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>⊘ {errors.icon}</div>
            )}
          </div>

          {/* Status */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Status</label>
            <div style={{ display: 'flex', gap: 12 }}>
              {[{ val: true, label: 'Active', color: '#006644', bg: '#E3FCEF' }, { val: false, label: 'Inactive', color: '#BF2600', bg: '#FFEBE6' }].map(opt => (
                <label key={String(opt.val)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                  border: '1.5px solid ' + (isActive === opt.val ? opt.color : 'var(--border)'),
                  borderRadius: 4, cursor: 'pointer',
                  background: isActive === opt.val ? opt.bg : '#fff',
                  fontSize: 13, fontWeight: 500,
                  color: isActive === opt.val ? opt.color : 'var(--text-muted)',
                  transition: 'all .15s',
                }}>
                  <input type="radio" checked={isActive === opt.val} onChange={() => setIsActive(opt.val)}
                    style={{ accentColor: opt.color }} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '24px -32px 24px' }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={() => navigate('/admin/groups')}
              style={{ background: 'none', border: '1.5px solid var(--border)', color: 'var(--text)', borderRadius: 4, padding: '9px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >Cancel</button>
            <button type="submit" disabled={saveMutation.isPending}
              style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 4, padding: '9px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: saveMutation.isPending ? 0.7 : 1 }}
              onMouseEnter={e => { if (!saveMutation.isPending) e.currentTarget.style.background = 'var(--brand-hover)' }}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
            >
              {saveMutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Group'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}