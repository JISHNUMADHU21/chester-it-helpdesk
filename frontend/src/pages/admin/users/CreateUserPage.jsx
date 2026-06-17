import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authAPI } from '../../../api/auth'
import { groupsAPI } from '../../../api/groups'
import { useAuth } from '../../../context/AuthContext'

const inputStyle = {
  width: '100%', padding: '9px 12px',
  border: '1.5px solid var(--border)', borderRadius: 4,
  fontFamily: 'inherit', fontSize: 13, color: 'var(--text)',
  background: '#fff', outline: 'none', transition: 'border-color .15s',
}

const selectStyle = {
  width: '100%', padding: '9px 32px 9px 12px',
  border: '1.5px solid var(--border)', borderRadius: 4,
  fontFamily: 'inherit', fontSize: 13, color: 'var(--text)',
  background: '#fff', outline: 'none', appearance: 'none',
  WebkitAppearance: 'none', cursor: 'pointer', transition: 'border-color .15s',
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

function SelectWrap({ children }) {
  return (
    <div style={{ position: 'relative' }}>
      {children}
      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 11, color: 'var(--text-muted)' }}>▾</span>
    </div>
  )
}

export default function CreateUserPage() {
  const navigate        = useNavigate()
  const { isSuperAdmin } = useAuth()
  const queryClient     = useQueryClient()

  const [firstName,    setFirstName]    = useState('')
  const [lastName,     setLastName]     = useState('')
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [role,         setRole]         = useState('user')
  const [designation,  setDesignation]  = useState('')
  const [groupIds,     setGroupIds]     = useState([])
  const [deptSearch,   setDeptSearch]   = useState('')
  const [errors,       setErrors]       = useState({})
  const [showPassword, setShowPassword] = useState(false)

  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn:  () => groupsAPI.list().then(r => r.data.results),
  })
  const groups = groupsData || []

  // Filtered groups based on search
  const filteredGroups = groups.filter(g =>
    !deptSearch ||
    g.name.toLowerCase().includes(deptSearch.toLowerCase()) ||
    g.prefix.toLowerCase().includes(deptSearch.toLowerCase())
  )

  const createMutation = useMutation({
    mutationFn: (data) => authAPI.createUser(data),
    onSuccess:  () => {
      queryClient.invalidateQueries(['admin-users'])
      navigate('/admin/users')
    },
  })

  function validate() {
    const e = {}
    if (!firstName.trim()) e.firstName = 'First name is required'
    if (!lastName.trim())  e.lastName  = 'Last name is required'
    if (!email.trim())     e.email     = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email address'
    if (!password.trim())  e.password  = 'Password is required'
    else if (password.length < 8) e.password = 'Password must be at least 8 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(ev) {
    ev.preventDefault()
    if (!validate()) return
    createMutation.mutate({
      first_name:  firstName,
      last_name:   lastName,
      email,
      password,
      role,
      designation,
      group_ids: groupIds,
    })
  }

  function toggleGroup(id) {
    setGroupIds(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* Breadcrumb + header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
          <span style={{ cursor: 'pointer', color: 'var(--brand)' }} onClick={() => navigate('/admin/users')}>
            User Management
          </span>
          {' › '}Create User
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
          Create New User
        </h1>
      </div>

      {createMutation.isError && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid #FF8F73', borderRadius: 4, padding: '10px 14px', fontSize: 13, color: 'var(--danger)', marginBottom: 20 }}>
          ⚠️ {createMutation.error?.response?.data?.detail || createMutation.error?.response?.data?.email?.[0] || 'Failed to create user.'}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '28px 32px', maxWidth: 700 }}>

          {/* Name row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 0 }}>
            <Field label="First Name" required error={errors.firstName}>
              <input type="text" value={firstName}
                onChange={e => { setFirstName(e.target.value); setErrors(p => ({ ...p, firstName: '' })) }}
                placeholder="e.g. John"
                style={{ ...inputStyle, borderColor: errors.firstName ? 'var(--danger)' : 'var(--border)' }}
                onFocus={e => e.target.style.borderColor = '#4C9AFF'}
                onBlur={e => e.target.style.borderColor = errors.firstName ? 'var(--danger)' : 'var(--border)'}
              />
            </Field>
            <Field label="Last Name" required error={errors.lastName}>
              <input type="text" value={lastName}
                onChange={e => { setLastName(e.target.value); setErrors(p => ({ ...p, lastName: '' })) }}
                placeholder="e.g. Smith"
                style={{ ...inputStyle, borderColor: errors.lastName ? 'var(--danger)' : 'var(--border)' }}
                onFocus={e => e.target.style.borderColor = '#4C9AFF'}
                onBlur={e => e.target.style.borderColor = errors.lastName ? 'var(--danger)' : 'var(--border)'}
              />
            </Field>
          </div>

          <Field label="Email Address" required error={errors.email}>
            <input type="email" value={email}
              onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })) }}
              placeholder="e.g. john.smith@chesterracecourse.co.uk"
              style={{ ...inputStyle, borderColor: errors.email ? 'var(--danger)' : 'var(--border)' }}
              onFocus={e => e.target.style.borderColor = '#4C9AFF'}
              onBlur={e => e.target.style.borderColor = errors.email ? 'var(--danger)' : 'var(--border)'}
            />
          </Field>

          <Field label="Password" required error={errors.password}>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })) }}
                placeholder="Minimum 8 characters"
                style={{ ...inputStyle, paddingRight: 40, borderColor: errors.password ? 'var(--danger)' : 'var(--border)' }}
                onFocus={e => e.target.style.borderColor = '#4C9AFF'}
                onBlur={e => e.target.style.borderColor = errors.password ? 'var(--danger)' : 'var(--border)'}
              />
              <button type="button" onClick={() => setShowPassword(s => !s)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 15 }}>
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </Field>

          <Field label="Designation / Job Title">
            <input type="text" value={designation} onChange={e => setDesignation(e.target.value)}
              placeholder="e.g. Bar Manager, IT Technician"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#4C9AFF'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </Field>

          {/* Role */}
          <Field label="Role" required hint={
            role === 'admin'   ? 'Can manage users and system settings. Cannot manage other admins.' :
            role === 'manager' ? 'Can manage tickets and users within their groups.' :
                                 'Can raise and view tickets within their assigned groups.'
          }>
            <SelectWrap>
              <select value={role} onChange={e => setRole(e.target.value)} style={selectStyle}
                onFocus={e => e.target.style.borderColor = '#4C9AFF'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              >
                {isSuperAdmin && <option value="admin">Administrator</option>}
                <option value="manager">Manager</option>
                <option value="user">User</option>
              </select>
            </SelectWrap>
          </Field>

          {/* Departments — searchable list */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
              Departments
              {groupIds.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: 'var(--brand)' }}>
                  {groupIds.length} selected
                </span>
              )}
            </label>

            {/* Search input */}
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <input
                type="text"
                placeholder="Search departments…"
                value={deptSearch}
                onChange={e => setDeptSearch(e.target.value)}
                style={{
                  ...inputStyle,
                  paddingLeft: 32,
                }}
                onFocus={e => e.target.style.borderColor = '#4C9AFF'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>

            {/* Scrollable department list */}
            <div style={{
              border: '1.5px solid var(--border)', borderRadius: 4,
              maxHeight: 220, overflowY: 'auto',
              background: '#fff',
            }}>
              {filteredGroups.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: 'var(--text-faint)' }}>
                  No departments match your search
                </div>
              ) : filteredGroups.map((g, idx) => {
                const isSelected = groupIds.includes(g.id)
                return (
                  <label
                    key={g.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px',
                      borderBottom: idx < filteredGroups.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                      background: isSelected ? '#F0F4FF' : '#fff',
                      transition: 'background .12s',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--surface-2)' }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '#fff' }}
                  >
                    {/* Custom checkbox */}
                    <div style={{
                      width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                      border: '1.5px solid ' + (isSelected ? 'var(--brand)' : 'var(--border)'),
                      background: isSelected ? 'var(--brand)' : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all .12s',
                    }}>
                      {isSelected && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleGroup(g.id)}
                      style={{ display: 'none' }} />
                    {/* Icon */}
                    <div style={{
                      width: 28, height: 28, borderRadius: 4, flexShrink: 0,
                      background: '#DEEBFF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15,
                    }}>
                      {g.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: isSelected ? 600 : 500, color: isSelected ? 'var(--brand)' : 'var(--text)' }}>
                        {g.name}
                      </div>
                      {g.description && (
                        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {g.description}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>
                      {g.prefix}
                    </span>
                  </label>
                )
              })}
            </div>

            {/* Selected summary */}
            {groupIds.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {groups.filter(g => groupIds.includes(g.id)).map(g => (
                  <span key={g.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 8px 3px 6px', borderRadius: 20,
                    background: '#DEEBFF', color: 'var(--brand)',
                    fontSize: 12, fontWeight: 500,
                  }}>
                    {g.icon} {g.name}
                    <button type="button" onClick={() => toggleGroup(g.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0, marginLeft: 2 }}>
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '24px -32px 24px' }} />

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={() => navigate('/admin/users')}
              style={{ background: 'none', border: '1.5px solid var(--border)', color: 'var(--text)', borderRadius: 4, padding: '9px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >Cancel</button>
            <button type="submit" disabled={createMutation.isPending}
              style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 4, padding: '9px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: createMutation.isPending ? 0.7 : 1 }}
              onMouseEnter={e => { if (!createMutation.isPending) e.currentTarget.style.background = 'var(--brand-hover)' }}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
            >
              {createMutation.isPending ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}