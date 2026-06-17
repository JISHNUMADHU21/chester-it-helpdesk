import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { authAPI } from '../../api/auth'
import { useNavigate } from 'react-router-dom'

const ROLE_LABELS = {
  superadmin: 'Super Admin',
  admin:      'Administrator',
  manager:    'Manager',
  user:       'User',
}

function SectionCard({ icon, title, children, footer }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 20, overflow: 'hidden', maxWidth: 700 }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{title}</h2>
      </div>
      <div style={{ padding: 24 }}>{children}</div>
      {footer && (
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10, background: 'var(--surface-2)' }}>
          {footer}
        </div>
      )}
    </div>
  )
}

function FieldLabel({ children, required }) {
  return (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6, letterSpacing: '.01em' }}>
      {children}{required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
    </label>
  )
}

function ReadonlyInput({ value, type = 'text' }) {
  return (
    <input type={type} readOnly value={value || ''}
      style={{
        width: '100%', padding: '9px 12px', border: '1.5px solid var(--border)',
        borderRadius: 4, fontFamily: 'inherit', fontSize: 13,
        color: 'var(--text-muted)', background: 'var(--surface-2)', outline: 'none', cursor: 'default',
      }}
    />
  )
}

function PasswordInput({ value, onChange, placeholder, error }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '9px 40px 9px 12px',
          border: '1.5px solid ' + (error ? 'var(--danger)' : 'var(--border)'),
          borderRadius: 4, fontFamily: 'inherit', fontSize: 13,
          color: 'var(--text)', background: '#fff', outline: 'none',
          transition: 'border-color .15s, box-shadow .15s',
        }}
        onFocus={e => { e.target.style.borderColor = error ? 'var(--danger)' : '#4C9AFF'; e.target.style.boxShadow = '0 0 0 2px rgba(76,154,255,.2)' }}
        onBlur={e => { e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border)'; e.target.style.boxShadow = 'none' }}
      />
      <button type="button" onClick={() => setShow(s => !s)}
        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', padding: 2, lineHeight: 1 }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        {show ? '🙈' : '👁'}
      </button>
    </div>
  )
}

function StrengthMeter({ password }) {
  if (!password) return null

  let score = 0
  if (password.length >= 8)           score++
  if (/[A-Z]/.test(password))         score++
  if (/[0-9]/.test(password))         score++
  if (/[^A-Za-z0-9]/.test(password))  score++

  const colours = { 1: '#DE350B', 2: '#FF991F', 3: '#FFC400', 4: '#36B37E' }
  const labels  = { 1: 'Weak',    2: 'Fair',    3: 'Good',    4: 'Strong'  }
  const colour  = colours[score] || 'var(--border)'

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ height: 4, borderRadius: 2, flex: 1, background: i <= score ? colour : 'var(--border)', transition: 'background .25s' }} />
        ))}
      </div>
      {score > 0 && (
        <div style={{ fontSize: 11, fontWeight: 600, color: colour, marginTop: 4 }}>{labels[score]}</div>
      )}
      <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6 }}>
        Minimum 8 characters. Use a mix of uppercase, lowercase, numbers and symbols for a stronger password.
      </p>
    </div>
  )
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()

  // Avatar
  const [avatarPreview,  setAvatarPreview]  = useState(user?.avatar || null)
  const [avatarLoading,  setAvatarLoading]  = useState(false)
  const [avatarError,    setAvatarError]    = useState('')
  const [avatarSuccess,  setAvatarSuccess]  = useState('')

  // Password
  const [currentPw,  setCurrentPw]  = useState('')
  const [newPw,      setNewPw]      = useState('')
  const [confirmPw,  setConfirmPw]  = useState('')
  const [pwErrors,   setPwErrors]   = useState({})
  const [pwSuccess,  setPwSuccess]  = useState('')
  const [pwError,    setPwError]    = useState('')
  const [pwLoading,  setPwLoading]  = useState(false)

  const initials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
    : '?'

  // ── Avatar handlers ──────────────────────────────────────────────────────
  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setAvatarError('File size must not exceed 5 MB.'); return }
    setAvatarLoading(true); setAvatarError(''); setAvatarSuccess('')
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const res = await authAPI.updateAvatar(formData)
      updateUser({ avatar: res.data.avatar })
      setAvatarPreview(res.data.avatar)
      setAvatarSuccess('Profile photo updated ✓')
    } catch { setAvatarError('Failed to upload avatar.') }
    finally { setAvatarLoading(false) }
  }

  function handleRemoveAvatar() {
    setAvatarPreview(null)
    updateUser({ avatar: null })
    setAvatarSuccess('Profile photo removed')
  }

  // ── Password handler ─────────────────────────────────────────────────────
  async function handlePasswordChange(e) {
    e.preventDefault()
    setPwError(''); setPwSuccess('')
    const errs = {}
    if (!currentPw.trim())              errs.currentPw = 'Current password is required'
    if (!newPw.trim() || newPw.length < 8) errs.newPw = newPw.trim() ? 'Password must be at least 8 characters' : 'New password is required'
    if (newPw !== confirmPw)            errs.confirmPw = 'Passwords do not match'
    if (Object.keys(errs).length) { setPwErrors(errs); return }
    setPwLoading(true)
    try {
      await authAPI.changePassword(currentPw, newPw, confirmPw)
      setPwSuccess('Password updated successfully ✓')
      setCurrentPw(''); setNewPw(''); setConfirmPw(''); setPwErrors({})
    } catch (err) {
      const data = err.response?.data
      setPwError(data?.current_password?.[0] || data?.new_password?.[0] || data?.detail || 'Failed to update password.')
    } finally { setPwLoading(false) }
  }

  function resetPasswordForm() {
    setCurrentPw(''); setNewPw(''); setConfirmPw(''); setPwErrors({}); setPwSuccess(''); setPwError('')
  }

  // ── User department display ───────────────────────────────────────────────
  const userDept = user?.groups?.length > 0
    ? `${user.groups[0].icon || ''} ${user.groups[0].name}`.trim()
    : '—'

  return (
    <div style={{ padding: '28px 32px', overflowY: 'auto', minHeight: '100%' }}>

      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
        <span style={{ cursor: 'pointer' }} onClick={() => navigate('/')}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >Home</span>
        <span style={{ margin: '0 4px' }}>›</span>
        <span>My Profile</span>
      </div>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>My Profile</h1>
      </div>

      {/* ── SECTION 1: Profile Picture ── */}
      <SectionCard icon="🖼️" title="Profile Picture">
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>

          {/* Avatar */}
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            background: '#FFC400', color: '#172B4D',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, fontWeight: 700, flexShrink: 0,
            border: '3px solid var(--border)', overflow: 'hidden', position: 'relative',
          }}>
            {avatarPreview
              ? <img src={avatarPreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span>{initials}</span>
            }
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              Upload a photo — JPG, PNG or GIF, max 5 MB.<br />
              Your photo will appear across the Help Desk.
            </p>
            {avatarError   && <p style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>⚠️ {avatarError}</p>}
            {avatarSuccess && <p style={{ fontSize: 12, color: 'var(--success)', margin: 0 }}>✓ {avatarSuccess}</p>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'var(--brand)', color: '#fff', border: 'none',
                borderRadius: 4, padding: '8px 16px', fontSize: 13, fontWeight: 500,
                cursor: avatarLoading ? 'not-allowed' : 'pointer', opacity: avatarLoading ? 0.7 : 1,
              }}
                onMouseEnter={e => { if (!avatarLoading) e.currentTarget.style.background = 'var(--brand-hover)' }}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
              >
                {avatarLoading ? 'Uploading…' : '📷 Upload Photo'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
              </label>
              {avatarPreview && (
                <button type="button" onClick={handleRemoveAvatar}
                  style={{ background: 'none', border: '1.5px solid var(--border)', color: 'var(--text-muted)', borderRadius: 4, padding: '7px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = '#FF8F73' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >Remove</button>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── SECTION 2: Personal Information ── */}
      <SectionCard icon="👤" title="Personal Information">

        {/* First Name + Last Name row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
          <div>
            <FieldLabel>First Name</FieldLabel>
            <ReadonlyInput value={user?.first_name} />
          </div>
          <div>
            <FieldLabel>Last Name</FieldLabel>
            <ReadonlyInput value={user?.last_name} />
          </div>
        </div>

        {/* Email */}
        <div style={{ marginBottom: 18 }}>
          <FieldLabel>Email Address</FieldLabel>
          <ReadonlyInput value={user?.email} type="email" />
          <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>
            This is the email address used for all ticket notifications.
          </p>
        </div>

        {/* Designation */}
        <div style={{ marginBottom: 18 }}>
          <FieldLabel>Designation / Job Title</FieldLabel>
          <ReadonlyInput value={user?.designation || '—'} />
        </div>

        {/* Department */}
        <div style={{ marginBottom: 18 }}>
          <FieldLabel>Department</FieldLabel>
          <ReadonlyInput value={userDept} />
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 4 }}>
          These details are configured by your administrator. Contact your manager to request any changes.
        </p>
      </SectionCard>

      {/* ── SECTION 3: Change Password ── */}
      <SectionCard
        icon="🔒"
        title="Change Password"
        footer={
          <>
            <button type="button" onClick={resetPasswordForm}
              style={{ background: 'none', border: '1.5px solid var(--border)', color: 'var(--text)', borderRadius: 4, padding: '8px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >Cancel</button>
            <button type="button" onClick={handlePasswordChange} disabled={pwLoading}
              style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 4, padding: '9px 22px', fontSize: 13, fontWeight: 600, cursor: pwLoading ? 'not-allowed' : 'pointer', opacity: pwLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => { if (!pwLoading) e.currentTarget.style.background = 'var(--brand-hover)' }}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
            >
              {pwLoading
                ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Updating…</>
                : 'Update Password'
              }
            </button>
          </>
        }
      >
        {pwSuccess && (
          <div style={{ background: 'var(--success-bg)', border: '1px solid #ABF5D1', borderRadius: 4, padding: '10px 14px', fontSize: 13, color: 'var(--success)', marginBottom: 16 }}>
            {pwSuccess}
          </div>
        )}
        {pwError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid #FF8F73', borderRadius: 4, padding: '10px 14px', fontSize: 13, color: 'var(--danger)', marginBottom: 16 }}>
            ⚠️ {pwError}
          </div>
        )}

        {/* Current Password */}
        <div style={{ marginBottom: 18 }}>
          <FieldLabel required>Current Password</FieldLabel>
          <PasswordInput value={currentPw} onChange={e => { setCurrentPw(e.target.value); setPwErrors(p => ({ ...p, currentPw: '' })) }}
            placeholder="Enter your current password" error={pwErrors.currentPw} />
          {pwErrors.currentPw && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{pwErrors.currentPw}</div>}
        </div>

        {/* New Password */}
        <div style={{ marginBottom: 18 }}>
          <FieldLabel required>New Password</FieldLabel>
          <PasswordInput value={newPw} onChange={e => { setNewPw(e.target.value); setPwErrors(p => ({ ...p, newPw: '' })) }}
            placeholder="Enter a new password" error={pwErrors.newPw} />
          {pwErrors.newPw && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{pwErrors.newPw}</div>}
          <StrengthMeter password={newPw} />
        </div>

        {/* Confirm Password */}
        <div style={{ marginBottom: 0 }}>
          <FieldLabel required>Confirm New Password</FieldLabel>
          <PasswordInput value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setPwErrors(p => ({ ...p, confirmPw: '' })) }}
            placeholder="Re-enter your new password" error={pwErrors.confirmPw} />
          {pwErrors.confirmPw && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{pwErrors.confirmPw}</div>}
        </div>

      </SectionCard>

    </div>
  )
}