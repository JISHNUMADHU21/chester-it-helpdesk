import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { announcementAPI, announcementAttachmentAPI } from '../../../api/config'
import { groupsAPI } from '../../../api/groups'
import { useAuth } from '../../../context/AuthContext'
import AnnouncementDetailModal from '../../../components/announcements/AnnouncementDetailModal'

const TAG_STYLES = {
  maintenance: { bg: '#FFF0E0', color: '#974F0C', label: 'Maintenance' },
  new_feature: { bg: '#E3FCEF', color: '#006644', label: 'New Feature' },
  update:      { bg: '#DEEBFF', color: '#0747A6', label: 'Update'      },
  alert:       { bg: '#FFEBE6', color: '#BF2600', label: 'Alert'       },
  info:        { bg: '#F1F2F4', color: '#5E6C84', label: 'Info'        },
}

const VISIBILITY_STYLES = {
  live:      { bg: '#E3FCEF', color: '#006644', label: 'Live'      },
  scheduled: { bg: '#DEEBFF', color: '#0747A6', label: 'Scheduled' },
  expired:   { bg: '#FFEBE6', color: '#BF2600', label: 'Expired'   },
  draft:     { bg: '#F1F2F4', color: '#5E6C84', label: 'Draft'     },
}

const ATTACHMENT_LABELS = { image: 'Image', pdf: 'PDF', video: 'Video', link: 'Link' }
const PAGE_SIZE = 9

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

function toDatetimeLocal(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  const pad = function(n) { return String(n).padStart(2, '0') }
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes())
}

function detectFileType(file) {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type === 'application/pdf') return 'pdf'
  if (file.type.startsWith('video/')) return 'video'
  return null
}

// ── Searchable group multi-select list — with "All Groups" option ─────────────
function GroupSearchList(props) {
  const groups      = props.groups
  const selectedIds = props.selectedIds
  const onToggle    = props.onToggle
  const onSelectAllGroups = props.onSelectAllGroups
  const [search, setSearch] = useState('')

  const filtered = groups.filter(function(g) {
    return !search ||
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.prefix.toLowerCase().includes(search.toLowerCase())
  })

  const isAllGroupsSelected = selectedIds.length === 0

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <input type="text" autoComplete="off"
          placeholder="Search groups..."
          value={search} onChange={function(e) { setSearch(e.target.value) }}
          style={{ ...inputStyle, paddingLeft: 30, fontSize: 12 }}
          onFocus={function(e) { e.target.style.borderColor = '#4C9AFF' }}
          onBlur={function(e) { e.target.style.borderColor = 'var(--border)' }}
        />
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2"
          style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </div>
      <div style={{ border: '1.5px solid var(--border)', borderRadius: 4, maxHeight: 220, overflowY: 'auto', background: '#fff' }}>

        <label
          onClick={onSelectAllGroups}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
            borderBottom: '1px solid var(--border)',
            cursor: 'pointer', background: isAllGroupsSelected ? '#F0F4FF' : 'var(--surface-2)',
          }}
        >
          <div style={{
            width: 14, height: 14, borderRadius: 3, flexShrink: 0,
            border: '1.5px solid ' + (isAllGroupsSelected ? 'var(--brand)' : 'var(--border)'),
            background: isAllGroupsSelected ? 'var(--brand)' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isAllGroupsSelected && <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"></path></svg>}
          </div>
          <div style={{ width: 22, height: 22, borderRadius: 3, background: '#EAE6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>*</div>
          <span style={{ fontSize: 13, fontWeight: isAllGroupsSelected ? 600 : 500, color: isAllGroupsSelected ? 'var(--brand)' : 'var(--text)', flex: 1 }}>All Groups</span>
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Everyone</span>
        </label>

        {filtered.length === 0 ? (
          <div style={{ padding: '12px', textAlign: 'center', fontSize: 12, color: 'var(--text-faint)' }}>No groups found</div>
        ) : filtered.map(function(g, idx) {
          const isSel = selectedIds.includes(g.id)
          return (
            <label key={g.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
              borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer', background: isSel ? '#F0F4FF' : '#fff',
            }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0, border: '1.5px solid ' + (isSel ? 'var(--brand)' : 'var(--border)'), background: isSel ? 'var(--brand)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isSel && <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"></path></svg>}
              </div>
              <input type="checkbox" checked={isSel} onChange={function() { onToggle(g.id) }} style={{ display: 'none' }} />
              <div style={{ width: 22, height: 22, borderRadius: 3, background: '#DEEBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>{g.icon}</div>
              <span style={{ fontSize: 13, fontWeight: isSel ? 600 : 400, color: isSel ? 'var(--brand)' : 'var(--text)', flex: 1 }}>{g.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{g.prefix}</span>
            </label>
          )
        })}
      </div>
      {selectedIds.length > 0 ? (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {groups.filter(function(g) { return selectedIds.includes(g.id) }).map(function(g) {
            return (
              <span key={g.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px 2px 6px', borderRadius: 20, background: '#DEEBFF', color: 'var(--brand)', fontSize: 11, fontWeight: 500 }}>
                {g.icon} {g.name}
                <button type="button" onClick={function() { onToggle(g.id) }} style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: 0, marginLeft: 2 }}>x</button>
              </span>
            )
          })}
        </div>
      ) : (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-faint)' }}>
          Currently targeting: All Groups (everyone will see this announcement)
        </div>
      )}
    </div>
  )
}

// ── Pending attachment manager — works BEFORE the announcement is saved ───────
function PendingAttachmentManager(props) {
  const pending     = props.pending
  const setPending  = props.setPending
  const fileInputRef = useRef(null)
  const [linkUrl,   setLinkUrl]   = useState('')
  const [linkLabel, setLinkLabel] = useState('')
  const [error,     setError]     = useState('')

  function handleFilesSelected(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setError('')
    const next = []
    files.forEach(function(file) {
      const type = detectFileType(file)
      if (!type) { setError('Unsupported file type: ' + file.name); return }
      if (file.size > 20 * 1024 * 1024) { setError(file.name + ' exceeds 20MB limit'); return }
      next.push({
        tempId: Date.now() + '-' + Math.random(),
        attachment_type: type,
        file: file,
        label: file.name,
        previewUrl: type === 'image' ? URL.createObjectURL(file) : null,
      })
    })
    setPending(function(prev) { return prev.concat(next) })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleAddLink() {
    if (!linkUrl.trim()) { setError('Please enter a URL'); return }
    setError('')
    setPending(function(prev) {
      return prev.concat([{
        tempId: Date.now() + '-' + Math.random(),
        attachment_type: 'link',
        url: linkUrl.trim(),
        label: linkLabel.trim() || linkUrl.trim(),
      }])
    })
    setLinkUrl(''); setLinkLabel('')
  }

  function handleRemove(tempId) {
    setPending(function(prev) { return prev.filter(function(p) { return p.tempId !== tempId }) })
  }

  return (
    <div>
      {pending.length > 0 && (
        <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {pending.map(function(p) {
            return (
              <div key={p.tempId} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface-2)',
              }}>
                {p.previewUrl ? (
                  <img src={p.previewUrl} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', width: 28, textAlign: 'center', flexShrink: 0 }}>
                    {ATTACHMENT_LABELS[p.attachment_type]}
                  </span>
                )}
                <span style={{ flex: 1, fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.label || p.url || 'Untitled'}
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', flexShrink: 0 }}>
                  {p.attachment_type}
                </span>
                <button type="button" onClick={function() { handleRemove(p.tempId) }}
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16, lineHeight: 1, flexShrink: 0 }}>
                  x
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <button type="button" onClick={function() { fileInputRef.current && fileInputRef.current.click() }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            justifyContent: 'center', padding: '10px', border: '1.5px dashed var(--border)',
            borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13,
            color: 'var(--text-muted)', fontFamily: 'inherit',
          }}
        >
          Upload images, PDFs or videos
        </button>
        <input ref={fileInputRef} type="file" multiple
          accept="image/*,application/pdf,video/*"
          style={{ display: 'none' }}
          onChange={handleFilesSelected}
        />
        <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6 }}>
          Supports multiple files. Max 20MB each. Images, PDFs, and videos.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
        <input type="text" placeholder="https://..." value={linkUrl}
          onChange={function(e) { setLinkUrl(e.target.value) }}
          style={{ ...inputStyle, flex: 1.2, fontSize: 12 }}
        />
        <input type="text" placeholder="Link label (optional)" value={linkLabel}
          onChange={function(e) { setLinkLabel(e.target.value) }}
          style={{ ...inputStyle, flex: 1, fontSize: 12 }}
        />
        <button type="button" onClick={handleAddLink}
          style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 4, padding: '0 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
        >Add</button>
      </div>

      {error && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>{error}</div>}
    </div>
  )
}

// ── Existing attachment manager — works AFTER the announcement is saved ───────
function ExistingAttachmentManager(props) {
  const announcementId = props.announcementId
  const attachments     = props.attachments
  const onRefetch        = props.onRefetch
  const fileInputRef = useRef(null)
  const [linkUrl,   setLinkUrl]   = useState('')
  const [linkLabel, setLinkLabel] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')

  async function handleFilesSelected(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setError('')
    setUploading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const type = detectFileType(file)
        if (!type) { setError('Unsupported file type: ' + file.name); continue }
        if (file.size > 20 * 1024 * 1024) { setError(file.name + ' exceeds 20MB limit'); continue }
        const formData = new FormData()
        formData.append('attachment_type', type)
        formData.append('file', file)
        formData.append('label', file.name)
        await announcementAttachmentAPI.create(announcementId, formData)
      }
      onRefetch()
    } catch (err) {
      setError((err && err.response && err.response.data && err.response.data.detail) || 'Failed to upload one or more files.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleAddLink() {
    if (!linkUrl.trim()) { setError('Please enter a URL'); return }
    setError('')
    setUploading(true)
    try {
      await announcementAttachmentAPI.createLink(announcementId, {
        attachment_type: 'link',
        url: linkUrl.trim(),
        label: linkLabel.trim() || linkUrl.trim(),
      })
      setLinkUrl(''); setLinkLabel('')
      onRefetch()
    } catch (err) {
      setError((err && err.response && err.response.data && err.response.data.url && err.response.data.url[0]) || 'Failed to add link.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(attachmentId) {
    try {
      await announcementAttachmentAPI.delete(announcementId, attachmentId)
      onRefetch()
    } catch {
      setError('Failed to delete attachment.')
    }
  }

  return (
    <div>
      {attachments.length > 0 && (
        <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {attachments.map(function(att) {
            return (
              <div key={att.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface-2)',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', flexShrink: 0 }}>
                  {ATTACHMENT_LABELS[att.attachment_type]}
                </span>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {att.label || att.url || 'Untitled'}
                </span>
                <button type="button" onClick={function() { handleDelete(att.id) }}
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 14, lineHeight: 1, flexShrink: 0 }}>
                  x
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <button type="button" onClick={function() { fileInputRef.current && fileInputRef.current.click() }} disabled={uploading}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            justifyContent: 'center', padding: '10px', border: '1.5px dashed var(--border)',
            borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13,
            color: 'var(--text-muted)', fontFamily: 'inherit', opacity: uploading ? 0.6 : 1,
          }}
        >
          {uploading ? 'Uploading...' : 'Upload images, PDFs or videos'}
        </button>
        <input ref={fileInputRef} type="file" multiple
          accept="image/*,application/pdf,video/*"
          style={{ display: 'none' }}
          onChange={handleFilesSelected}
        />
        <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6 }}>
          Supports multiple files. Max 20MB each. Images, PDFs, and videos.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
        <input type="text" placeholder="https://..." value={linkUrl}
          onChange={function(e) { setLinkUrl(e.target.value) }}
          style={{ ...inputStyle, flex: 1.2, fontSize: 12 }}
        />
        <input type="text" placeholder="Link label (optional)" value={linkLabel}
          onChange={function(e) { setLinkLabel(e.target.value) }}
          style={{ ...inputStyle, flex: 1, fontSize: 12 }}
        />
        <button type="button" onClick={handleAddLink} disabled={uploading}
          style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 4, padding: '0 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: uploading ? 0.6 : 1 }}
        >Add</button>
      </div>

      {error && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>{error}</div>}
    </div>
  )
}

export default function AnnouncementsPage() {
  const { user, isAdmin, isSuperAdmin } = useAuth()
  const queryClient = useQueryClient()

  const [modal,        setModal]        = useState(null)
  const [selected,     setSelected]     = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [viewTarget,   setViewTarget]   = useState(null)

  // List search + pagination
  const [listSearch, setListSearch] = useState('')
  const [page,        setPage]      = useState(1)

  // Form state
  const [title,        setTitle]        = useState('')
  const [body,         setBody]         = useState('')
  const [tag,          setTag]          = useState('info')
  const [isActive,     setIsActive]     = useState(true)
  const [groupIds,     setGroupIds]     = useState([])
  const [visibleFrom,  setVisibleFrom]  = useState('')
  const [visibleTill,  setVisibleTill]  = useState('')
  const [scheduleMode, setScheduleMode] = useState('now')
  const [expiryMode,   setExpiryMode]   = useState('never')
  const [errors,       setErrors]       = useState({})
  const [pendingAttachments, setPendingAttachments] = useState([])
  const [publishing,         setPublishing]         = useState(false)
  const [publishError,       setPublishError]       = useState('')

  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn:  function() { return groupsAPI.list().then(function(r) { return r.data.results }) },
  })
  const allGroups = groupsData || []

  const { data, isLoading } = useQuery({
    queryKey: ['announcements-admin'],
    queryFn:  function() { return announcementAPI.list().then(function(r) { return r.data.results || r.data }) },
  })

  const { data: activeDetail, refetch: refetchActive } = useQuery({
    queryKey: ['announcement-detail', selected && selected.id],
    queryFn:  function() { return announcementAPI.get(selected.id).then(function(r) { return r.data }) },
    enabled:  Boolean(selected && selected.id) && modal === 'form',
  })

  const deleteMutation = useMutation({
    mutationFn: function(id) { return announcementAPI.delete(id) },
    onSuccess: function() {
      queryClient.invalidateQueries(['announcements-admin'])
      queryClient.invalidateQueries(['announcements'])
      setDeleteTarget(null)
    },
  })

  function resetForm() {
    setTitle(''); setBody(''); setTag('info'); setIsActive(true)
    setGroupIds([]); setVisibleFrom(''); setVisibleTill('')
    setScheduleMode('now'); setExpiryMode('never'); setErrors({})
    setPendingAttachments([]); setPublishError('')
  }

  function openCreate() {
    setSelected(null)
    resetForm()
    setModal('form')
  }

  function openEdit(item) {
    setSelected(item)
    setTitle(item.title || '')
    setBody(item.body || '')
    setTag(item.tag || 'info')
    setIsActive(item.is_active)
    setGroupIds(item.groups ? item.groups.map(function(g) { return g.id }) : [])
    if (item.visible_from) {
      setVisibleFrom(toDatetimeLocal(item.visible_from))
      setScheduleMode('scheduled')
    } else {
      setVisibleFrom(''); setScheduleMode('now')
    }
    if (item.visible_till) {
      setVisibleTill(toDatetimeLocal(item.visible_till))
      setExpiryMode('datetime')
    } else {
      setVisibleTill(''); setExpiryMode('never')
    }
    setErrors({})
    setPendingAttachments([])
    setPublishError('')
    setModal('form')
  }

  function closeModal() {
    setModal(null); setSelected(null); resetForm()
  }

  function buildPayload() {
    return {
      title: title,
      body: body,
      tag: tag,
      is_active: isActive,
      group_ids: groupIds,
      visible_from: (scheduleMode === 'scheduled' && visibleFrom)
        ? new Date(visibleFrom).toISOString()
        : null,
      visible_till: (expiryMode === 'datetime' && visibleTill)
        ? new Date(visibleTill).toISOString()
        : null,
    }
  }

  async function handleSave() {
    const e = {}
    if (!title.trim()) e.title = 'Title is required'
    if (!body.trim())  e.body  = 'Body is required'
    if (scheduleMode === 'scheduled' && !visibleFrom) e.visibleFrom = 'Please set a schedule date'
    if (expiryMode === 'datetime' && !visibleTill)    e.visibleTill = 'Please set an expiry date'
    if (Object.keys(e).length) { setErrors(e); return }

    setPublishError('')
    setPublishing(true)

    try {
      if (selected) {
        await announcementAPI.update(selected.id, buildPayload())
      } else {
        const createRes = await announcementAPI.create(buildPayload())
        const newAnnouncement = createRes.data
        const newId = newAnnouncement.id

        for (let i = 0; i < pendingAttachments.length; i++) {
          const p = pendingAttachments[i]
          if (p.attachment_type === 'link') {
            await announcementAttachmentAPI.createLink(newId, {
              attachment_type: 'link',
              url: p.url,
              label: p.label,
            })
          } else {
            const formData = new FormData()
            formData.append('attachment_type', p.attachment_type)
            formData.append('file', p.file)
            formData.append('label', p.label)
            await announcementAttachmentAPI.create(newId, formData)
          }
        }
      }

      queryClient.invalidateQueries(['announcements-admin'])
      queryClient.invalidateQueries(['announcements'])
      closeModal()
    } catch (err) {
      const msg = (err && err.response && err.response.data && err.response.data.detail)
        || 'Failed to save announcement. Please try again.'
      setPublishError(msg)
    } finally {
      setPublishing(false)
    }
  }

  function toggleGroup(id) {
    setGroupIds(function(prev) {
      return prev.includes(id) ? prev.filter(function(g) { return g !== id }) : prev.concat([id])
    })
  }

  function selectAllGroups() {
    setGroupIds([])
  }

  function handleListSearchChange(val) {
    setListSearch(val)
    setPage(1)
  }

  const allAnnouncements = data || []

  // Filter by title (case-insensitive)
  const filteredAnnouncements = allAnnouncements.filter(function(a) {
    return !listSearch || a.title.toLowerCase().includes(listSearch.toLowerCase())
  })

  // Pagination
  const totalPages  = Math.max(1, Math.ceil(filteredAnnouncements.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart   = (currentPage - 1) * PAGE_SIZE
  const pageEnd     = pageStart + PAGE_SIZE
  const pageAnnouncements = filteredAnnouncements.slice(pageStart, pageEnd)

  const currentAttachments = (activeDetail && activeDetail.attachments) || []

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Admin &gt; Announcements</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Announcements Management</h1>
        </div>
        <button onClick={openCreate}
          style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 4, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
        >+ New Announcement</button>
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <input
            type="text"
            autoComplete="off"
            placeholder="Search by title..."
            value={listSearch}
            onChange={function(e) { handleListSearchChange(e.target.value) }}
            style={{ ...inputStyle, paddingLeft: 32 }}
            onFocus={function(e) { e.target.style.borderColor = '#4C9AFF' }}
            onBlur={function(e) { e.target.style.borderColor = 'var(--border)' }}
          />
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        {listSearch && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            {filteredAnnouncements.length} result{filteredAnnouncements.length !== 1 ? 's' : ''} for "{listSearch}"
          </div>
        )}
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner spinner-lg" /></div>
      ) : filteredAnnouncements.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
            {listSearch ? 'No announcements match your search' : 'No announcements yet'}
          </p>
          <p style={{ fontSize: 13 }}>
            {listSearch ? 'Try a different title.' : 'Create one to display on the home page.'}
          </p>
          {listSearch && (
            <button onClick={function() { handleListSearchChange('') }}
              style={{ marginTop: 10, fontSize: 13, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Clear search
            </button>
          )}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16, marginBottom: 20 }}>
            {pageAnnouncements.map(function(a) {
              const ts = TAG_STYLES[a.tag] || TAG_STYLES.info
              const vs = VISIBILITY_STYLES[a.visibility_status] || VISIBILITY_STYLES.draft
              return (
                <div key={a.id} style={{
                  background: '#fff', border: '1px solid var(--border)', borderRadius: 8,
                  padding: '18px 20px', opacity: a.visibility_status === 'draft' ? 0.65 : 1,
                  cursor: 'pointer',
                }}
                  onClick={function() { setViewTarget(a) }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', padding: '3px 8px', borderRadius: 3, background: ts.bg, color: ts.color }}>
                      {ts.label}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: vs.bg, color: vs.color }}>
                      {vs.label}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px', lineHeight: 1.4 }}>{a.title}</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 10px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                    {a.body}
                  </p>

                  {a.attachments && a.attachments.length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--brand)', marginBottom: 8 }}>
                      {a.attachments.length} attachment{a.attachments.length !== 1 ? 's' : ''}
                    </div>
                  )}

                  {a.groups && a.groups.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                      {a.groups.map(function(g) {
                        return (
                          <span key={g.id} style={{ fontSize: 10, fontWeight: 600, background: '#DEEBFF', color: 'var(--brand)', padding: '2px 6px', borderRadius: 10 }}>
                            {g.icon} {g.name}
                          </span>
                        )
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 10 }}>All groups</div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                      {a.created_by_name} - {new Date(a.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <div style={{ display: 'flex', gap: 6 }} onClick={function(e) { e.stopPropagation() }}>
                      <button onClick={function() { openEdit(a) }}
                        style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 4, padding: '4px 10px', fontSize: 12, fontWeight: 500, color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit' }}
                      >Edit</button>
                      <button onClick={function() { setDeleteTarget(a) }}
                        style={{ background: 'none', border: '1.5px solid #FF8F73', borderRadius: 4, padding: '4px 10px', fontSize: 12, fontWeight: 500, color: 'var(--danger)', cursor: 'pointer', fontFamily: 'inherit' }}
                      >Delete</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {filteredAnnouncements.length > PAGE_SIZE && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 4px' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Showing {pageStart + 1}-{Math.min(pageEnd, filteredAnnouncements.length)} of {filteredAnnouncements.length} announcements
              </span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button
                  onClick={function() { setPage(function(p) { return Math.max(1, p - 1) }) }}
                  disabled={currentPage === 1}
                  style={{ padding: '5px 10px', border: '1.5px solid var(--border)', borderRadius: 4, background: currentPage === 1 ? 'var(--surface-2)' : '#fff', color: currentPage === 1 ? 'var(--text-faint)' : 'var(--text)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: 13, fontFamily: 'inherit' }}
                >Prev</button>

                {Array.from({ length: totalPages }, function(_, i) { return i + 1 }).map(function(p) {
                  return (
                    <button key={p} onClick={function() { setPage(p) }}
                      style={{
                        padding: '5px 10px', border: '1.5px solid ' + (p === currentPage ? 'var(--brand)' : 'var(--border)'),
                        borderRadius: 4, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
                        background: p === currentPage ? 'var(--brand)' : '#fff',
                        color: p === currentPage ? '#fff' : 'var(--text)',
                        fontWeight: p === currentPage ? 600 : 400,
                        minWidth: 34,
                      }}
                    >{p}</button>
                  )
                })}

                <button
                  onClick={function() { setPage(function(p) { return Math.min(totalPages, p + 1) }) }}
                  disabled={currentPage === totalPages}
                  style={{ padding: '5px 10px', border: '1.5px solid var(--border)', borderRadius: 4, background: currentPage === totalPages ? 'var(--surface-2)' : '#fff', color: currentPage === totalPages ? 'var(--text-faint)' : 'var(--text)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: 13, fontFamily: 'inherit' }}
                >Next</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create / Edit modal */}
      {modal === 'form' && (
        <div>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(9,30,66,.45)', zIndex: 200 }} onClick={closeModal} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: '#fff', borderRadius: 8, padding: '28px 32px',
            zIndex: 201, width: 560, boxShadow: '0 8px 32px rgba(9,30,66,.3)',
            maxHeight: '92vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{selected ? 'Edit Announcement' : 'New Announcement'}</h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: 14, color: 'var(--text-muted)', cursor: 'pointer' }}>Close</button>
            </div>

            {publishError && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid #FF8F73', borderRadius: 4, padding: '10px 14px', fontSize: 13, color: 'var(--danger)', marginBottom: 16 }}>
                {publishError}
              </div>
            )}

            {/* Tag */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Tag</label>
              <div style={{ position: 'relative' }}>
                <select value={tag} onChange={function(e) { setTag(e.target.value) }} style={selectStyle}>
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
              <input type="text" value={title}
                onChange={function(e) { setTitle(e.target.value); setErrors(function(p) { return { ...p, title: '' } }) }}
                placeholder="e.g. Scheduled maintenance on 7 Jun"
                style={{ ...inputStyle, borderColor: errors.title ? 'var(--danger)' : 'var(--border)' }}
              />
              {errors.title && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{errors.title}</div>}
            </div>

            {/* Body */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                Body <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <textarea value={body}
                onChange={function(e) { setBody(e.target.value); setErrors(function(p) { return { ...p, body: '' } }) }}
                placeholder="Describe the announcement in detail..."
                rows={5}
                style={{ ...inputStyle, resize: 'vertical', borderColor: errors.body ? 'var(--danger)' : 'var(--border)' }}
              />
              {errors.body && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{errors.body}</div>}
            </div>

            {/* Attachments — pending mode for create, live mode for edit */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                Attachments
              </label>
              {selected ? (
                <ExistingAttachmentManager
                  announcementId={selected.id}
                  attachments={currentAttachments}
                  onRefetch={refetchActive}
                />
              ) : (
                <PendingAttachmentManager
                  pending={pendingAttachments}
                  setPending={setPendingAttachments}
                />
              )}
            </div>

            {/* Target Groups */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                Target Groups
                {groupIds.length > 0 && (
                  <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 400, color: 'var(--brand)' }}>{groupIds.length} selected</span>
                )}
              </label>
              <p style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 8 }}>
                Choose "All Groups" to show this to everyone, or select specific groups to target only their members.
              </p>
              <GroupSearchList
                groups={allGroups}
                selectedIds={groupIds}
                onToggle={toggleGroup}
                onSelectAllGroups={selectAllGroups}
              />
            </div>

            {/* Visible From */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
                Visible From
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {[{ val: 'now', label: 'From Now' }, { val: 'scheduled', label: 'Schedule' }].map(function(opt) {
                  return (
                    <label key={opt.val} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                      border: '1.5px solid ' + (scheduleMode === opt.val ? 'var(--brand)' : 'var(--border)'),
                      borderRadius: 4, cursor: 'pointer', fontSize: 13,
                      background: scheduleMode === opt.val ? '#F0F4FF' : '#fff',
                      color: scheduleMode === opt.val ? 'var(--brand)' : 'var(--text-muted)',
                    }}>
                      <input type="radio" checked={scheduleMode === opt.val}
                        onChange={function() { setScheduleMode(opt.val) }}
                        style={{ accentColor: 'var(--brand)' }} />
                      {opt.label}
                    </label>
                  )
                })}
              </div>
              {scheduleMode === 'scheduled' && (
                <div>
                  <input type="datetime-local" value={visibleFrom}
                    onChange={function(e) { setVisibleFrom(e.target.value); setErrors(function(p) { return { ...p, visibleFrom: '' } }) }}
                    style={{ ...inputStyle, maxWidth: 260, borderColor: errors.visibleFrom ? 'var(--danger)' : 'var(--border)' }}
                  />
                  {errors.visibleFrom && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{errors.visibleFrom}</div>}
                </div>
              )}
            </div>

            {/* Visible Till */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
                Visible Till
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {[{ val: 'never', label: 'Until Deleted' }, { val: 'datetime', label: 'Set Expiry' }].map(function(opt) {
                  return (
                    <label key={opt.val} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                      border: '1.5px solid ' + (expiryMode === opt.val ? 'var(--brand)' : 'var(--border)'),
                      borderRadius: 4, cursor: 'pointer', fontSize: 13,
                      background: expiryMode === opt.val ? '#F0F4FF' : '#fff',
                      color: expiryMode === opt.val ? 'var(--brand)' : 'var(--text-muted)',
                    }}>
                      <input type="radio" checked={expiryMode === opt.val}
                        onChange={function() { setExpiryMode(opt.val) }}
                        style={{ accentColor: 'var(--brand)' }} />
                      {opt.label}
                    </label>
                  )
                })}
              </div>
              {expiryMode === 'datetime' && (
                <div>
                  <input type="datetime-local" value={visibleTill}
                    onChange={function(e) { setVisibleTill(e.target.value); setErrors(function(p) { return { ...p, visibleTill: '' } }) }}
                    style={{ ...inputStyle, maxWidth: 260, borderColor: errors.visibleTill ? 'var(--danger)' : 'var(--border)' }}
                  />
                  {errors.visibleTill && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{errors.visibleTill}</div>}
                </div>
              )}
            </div>

            {/* Status */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Status</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ val: true, label: 'Active' }, { val: false, label: 'Draft (Hidden)' }].map(function(opt) {
                  return (
                    <label key={String(opt.val)} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                      border: '1.5px solid ' + (isActive === opt.val ? 'var(--brand)' : 'var(--border)'),
                      borderRadius: 4, cursor: 'pointer', fontSize: 13,
                      background: isActive === opt.val ? '#F0F4FF' : '#fff',
                      color: isActive === opt.val ? 'var(--brand)' : 'var(--text-muted)',
                    }}>
                      <input type="radio" checked={isActive === opt.val} onChange={function() { setIsActive(opt.val) }}
                        style={{ accentColor: 'var(--brand)' }} />
                      {opt.label}
                    </label>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={closeModal}
                style={{ background: 'none', border: '1.5px solid var(--border)', color: 'var(--text)', borderRadius: 4, padding: '8px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                {selected ? 'Close' : 'Cancel'}
              </button>
              <button onClick={handleSave} disabled={publishing}
                style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 4, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: publishing ? 0.7 : 1 }}
              >{publishing ? 'Publishing...' : (selected ? 'Save Changes' : 'Publish')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(9,30,66,.45)', zIndex: 200 }} onClick={function() { setDeleteTarget(null) }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', borderRadius: 8, padding: '28px 32px', zIndex: 201, width: 440, boxShadow: '0 8px 32px rgba(9,30,66,.3)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>Delete Announcement</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: 1.6 }}>
              Are you sure you want to delete "{deleteTarget.title}"? This cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={function() { setDeleteTarget(null) }}
                style={{ background: 'none', border: '1.5px solid var(--border)', color: 'var(--text)', borderRadius: 4, padding: '8px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={function() { deleteMutation.mutate(deleteTarget.id) }} disabled={deleteMutation.isPending}
                style={{ background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 4, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: deleteMutation.isPending ? 0.7 : 1 }}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full detail view modal — clicking a card */}
      {viewTarget && (
        <AnnouncementDetailModal
          announcement={viewTarget}
          onClose={function() { setViewTarget(null) }}
        />
      )}
    </div>
  )
}