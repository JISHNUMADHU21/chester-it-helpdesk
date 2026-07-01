import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ticketsAPI } from '../../api/tickets'
import { groupsAPI } from '../../api/groups'
import { componentAPI, workTypeAPI, priorityAPI, urgencyAPI } from '../../api/config'
import { useAuth } from '../../context/AuthContext'

/* ── shared styles ── */
const S = {
  input: {
    width: '100%', padding: '9px 12px',
    border: '1.5px solid var(--border)', borderRadius: 4,
    fontFamily: 'inherit', fontSize: 13, color: 'var(--text)',
    background: '#fff', outline: 'none',
    transition: 'border-color .15s, box-shadow .15s',
  },
  select: {
    width: '100%', padding: '9px 32px 9px 12px',
    border: '1.5px solid var(--border)', borderRadius: 4,
    fontFamily: 'inherit', fontSize: 13, color: 'var(--text)',
    background: '#fff', outline: 'none',
    appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer',
    transition: 'border-color .15s, box-shadow .15s',
  },
}

function focus(e) { e.target.style.borderColor = '#4C9AFF'; e.target.style.boxShadow = '0 0 0 2px rgba(76,154,255,.2)' }
function blur(e, err)  { e.target.style.borderColor = err ? 'var(--danger)' : 'var(--border)'; e.target.style.boxShadow = 'none' }

function Label({ children, hint, onHint, required }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
        {children}{required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}
      </span>
      {hint && <span onClick={onHint} style={{ fontSize: 11, color: 'var(--brand)', cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
        onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
      >{hint}</span>}
    </div>
  )
}

function Wrap({ children }) {
  return (
    <div style={{ position: 'relative' }}>
      {children}
      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: 12 }}>▾</span>
    </div>
  )
}

function Err({ children }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--danger)', marginTop: 5 }}>⊘ {children}</div>
}

function Group({ children }) {
  return <div style={{ marginBottom: 22 }}>{children}</div>
}

const GENERAL_GROUP_NAME = 'General'
const MAX_LABELS = 3

function isGeneralGroup(g) {
  return (g?.name || '').trim().toLowerCase() === GENERAL_GROUP_NAME.toLowerCase()
}

// ── Priority SVG icons — copied exactly from PriorityManagePage.jsx so the
// Create Ticket dropdown renders pixel-identical icons to the admin page.
// Priority has no stored emoji/text icon field — these are slug-keyed SVGs. ──
function PriorityIcon({ slug, colour }) {
  const s = { display: 'inline-block', flexShrink: 0 }
  switch (slug) {
    case 'highest':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={s}>
          <path d="M8 2L13 7H3L8 2Z" fill={colour || '#E2483D'} />
          <path d="M8 7L13 12H3L8 7Z" fill={colour || '#E2483D'} />
        </svg>
      )
    case 'high':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={s}>
          <path d="M8 3L13 9H3L8 3Z" fill={colour || '#E2483D'} />
        </svg>
      )
    case 'medium':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={s}>
          <rect x="2" y="5"  width="12" height="2.5" rx="1" fill={colour || '#E97F33'} />
          <rect x="2" y="9" width="12" height="2.5" rx="1" fill={colour || '#E97F33'} />
        </svg>
      )
    case 'low':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={s}>
          <path d="M8 13L3 7H13L8 13Z" fill={colour || '#4C9AFF'} />
        </svg>
      )
    case 'lowest':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={s}>
          <path d="M8 9L3 4H13L8 9Z"   fill={colour || '#4C9AFF'} />
          <path d="M8 14L3 9H13L8 14Z" fill={colour || '#4C9AFF'} />
        </svg>
      )
    default:
      return <span style={{ fontSize: 14 }}>—</span>
  }
}

// ── Searchable Assignee dropdown — groups first, then users ───────────────────
function AssigneeDropdown({ value, onSelect }) {
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const wrapRef = useRef(null)

  const { data: resultsData, isFetching } = useQuery({
    queryKey: ['assignee-search', query],
    queryFn:  () => groupsAPI.search(query).then(r => r.data),
    enabled:  open,
  })
  const results = resultsData || []
  const groupResults = results.filter(r => r.type === 'group')
  const userResults  = results.filter(r => r.type === 'user')

  useEffect(() => {
    function handleOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  function handlePick(item) {
    onSelect(item)
    setOpen(false)
    setQuery('')
  }

  function renderAvatar(item, size) {
    const dim = size || 28
    if (item.type === 'group') {
      return (
        <div style={{
          width: dim, height: dim, borderRadius: 6, background: '#DEEBFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: dim * 0.55, flexShrink: 0, overflow: 'hidden',
        }}>
          {item.icon_image_url
            ? <img src={item.icon_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (item.icon || '👥')
          }
        </div>
      )
    }
    if (item.avatar) {
      return (
        <div style={{ width: dim, height: dim, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
          <img src={item.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )
    }
    const initials = (item.name || '?')
      .split(' ')
      .map(p => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
    return (
      <div style={{
        width: dim, height: dim, borderRadius: '50%', background: '#EAE6FF', color: '#403294',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: dim * 0.4, fontWeight: 700, flexShrink: 0,
      }}>{initials}</div>
    )
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          border: '1.5px solid ' + (open ? '#4C9AFF' : 'var(--border)'),
          borderRadius: 4, padding: '9px 12px', background: '#fff',
          cursor: 'pointer', transition: 'border-color .15s',
        }}
      >
        {value ? (
          <>
            {renderAvatar(value)}
            <span style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>
              {value.name}
              <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 6 }}>
                {value.type === 'group' ? '(Group)' : '(Person)'}
              </span>
            </span>
          </>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--text-muted)', flex: 1 }}>Search groups or people…</span>
        )}
        <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>▾</span>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          border: '1.5px solid var(--border)', borderRadius: 4, background: '#fff',
          zIndex: 100, boxShadow: 'var(--shadow-md)', overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <input
              autoFocus
              type="text"
              placeholder="Type a name or group…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ ...S.input, fontSize: 12, padding: '6px 10px' }}
            />
          </div>

          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {isFetching ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: 'var(--text-faint)' }}>Searching…</div>
            ) : results.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: 'var(--text-faint)' }}>No matches found</div>
            ) : (
              <>
                {groupResults.length > 0 && (
                  <div style={{ padding: '6px 12px 2px', fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    Groups
                  </div>
                )}
                {groupResults.map(g => (
                  <div key={'group-' + g.id} onClick={() => handlePick(g)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    {renderAvatar(g, 26)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{g.name}</div>
                      {g.description && (
                        <div style={{ fontSize: 11, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.description}</div>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{g.prefix}</span>
                  </div>
                ))}

                {userResults.length > 0 && (
                  <div style={{ padding: '6px 12px 2px', fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    People
                  </div>
                )}
                {userResults.map(u => (
                  <div key={'user-' + u.id} onClick={() => handlePick(u)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    {renderAvatar(u, 26)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{u.name}</div>
                      {u.designation && (
                        <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{u.designation}</div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Priority dropdown — custom-styled to match Priority Management's
// icons and colours exactly (native <option> elements cannot reliably
// render custom SVG icons or text colour across browsers). ──
function PriorityDropdown({ priorities, value, onSelect }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    function handleOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const selected = priorities.find(p => p.slug === value) || null

  function handlePick(p) {
    onSelect(p.slug)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          border: '1.5px solid ' + (open ? '#4C9AFF' : 'var(--border)'),
          borderRadius: 4, padding: '9px 12px', background: '#fff',
          cursor: 'pointer', transition: 'border-color .15s',
        }}
      >
        {selected ? (
          <>
            <PriorityIcon slug={selected.slug} colour={selected.colour_hex} />
            <span style={{ fontSize: 13, fontWeight: 600, color: selected.colour_hex || 'var(--text)', flex: 1 }}>
              {selected.name}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--text-muted)', flex: 1 }}>Select Priority</span>
        )}
        <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>▾</span>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          border: '1.5px solid var(--border)', borderRadius: 4, background: '#fff',
          zIndex: 100, boxShadow: 'var(--shadow-md)', overflow: 'hidden',
        }}>
          {priorities.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: 'var(--text-faint)' }}>No priorities configured</div>
          ) : priorities.map((p, idx) => (
            <div key={p.id} onClick={() => handlePick(p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
                cursor: 'pointer', borderBottom: idx < priorities.length - 1 ? '1px solid var(--border)' : 'none',
                background: value === p.slug ? 'var(--surface-2)' : '#fff',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = value === p.slug ? 'var(--surface-2)' : '#fff'}
            >
              <PriorityIcon slug={p.slug} colour={p.colour_hex} />
              <span style={{ fontSize: 13, fontWeight: 600, color: p.colour_hex || 'var(--text)' }}>
                {p.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Urgency dropdown — custom-styled to match Urgency Management's
// background/text/border colour pill exactly. ──
function UrgencyDropdown({ urgencies, value, onSelect }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    function handleOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const selected = urgencies.find(u => u.slug === value) || null

  function handlePick(u) {
    onSelect(u.slug)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          border: '1.5px solid ' + (open ? '#4C9AFF' : 'var(--border)'),
          borderRadius: 4, padding: '9px 12px', background: '#fff',
          cursor: 'pointer', transition: 'border-color .15s',
        }}
      >
        {selected ? (
          <span style={{
            display: 'inline-flex', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: selected.colour_hex, color: selected.text_colour,
            border: `1.5px solid ${selected.border_hex}`,
          }}>
            {selected.name}
          </span>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--text-muted)', flex: 1 }}>Select Urgency</span>
        )}
        <span style={{ color: 'var(--text-faint)', fontSize: 12, marginLeft: 'auto' }}>▾</span>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          border: '1.5px solid var(--border)', borderRadius: 4, background: '#fff',
          zIndex: 100, boxShadow: 'var(--shadow-md)', overflow: 'hidden',
        }}>
          {urgencies.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: 'var(--text-faint)' }}>No urgency levels configured</div>
          ) : urgencies.map((u, idx) => (
            <div key={u.id} onClick={() => handlePick(u)}
              style={{
                display: 'flex', alignItems: 'center', padding: '9px 12px',
                cursor: 'pointer', borderBottom: idx < urgencies.length - 1 ? '1px solid var(--border)' : 'none',
                background: value === u.slug ? 'var(--surface-2)' : '#fff',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = value === u.slug ? 'var(--surface-2)' : '#fff'}
            >
              <span style={{
                display: 'inline-flex', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: u.colour_hex, color: u.text_colour,
                border: `1.5px solid ${u.border_hex}`,
              }}>
                {u.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Labels multi-select — colour-pill style matching Label Management,
// max 3 selectable (frontend cap; backend also enforces this on save). ──
function LabelsMultiSelect({ labels, selectedIds, onToggle, disabled }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    function handleOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const selectedLabels = labels.filter(l => selectedIds.includes(l.id))
  const atMax = selectedIds.length >= MAX_LABELS

  function handleToggle(label) {
    const isSelected = selectedIds.includes(label.id)
    if (!isSelected && atMax) return
    onToggle(label.id)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div
        onClick={() => { if (!disabled) setOpen(o => !o) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          minHeight: 38,
          border: '1.5px solid ' + (open ? '#4C9AFF' : 'var(--border)'),
          borderRadius: 4, padding: '7px 12px', background: disabled ? 'var(--surface-2)' : '#fff',
          cursor: disabled ? 'not-allowed' : 'pointer', transition: 'border-color .15s',
        }}
      >
        {selectedLabels.length === 0 ? (
          <span style={{ fontSize: 13, color: 'var(--text-muted)', flex: 1 }}>
            {disabled ? 'Select a request type first' : 'Select up to 3 labels'}
          </span>
        ) : (
          <>
            {selectedLabels.map(l => (
              <span key={l.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px 2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: (l.colour_hex || '#0052CC') + '22', color: l.colour_hex || '#0052CC',
              }}>
                {l.name}
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); onToggle(l.id) }}
                  style={{ background: 'none', border: 'none', color: l.colour_hex || '#0052CC', cursor: 'pointer', fontSize: 11, lineHeight: 1, padding: 0, marginLeft: 2 }}
                >✕</button>
              </span>
            ))}
            <span style={{ flex: 1 }} />
          </>
        )}
        <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>▾</span>
      </div>

      {open && !disabled && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          border: '1.5px solid var(--border)', borderRadius: 4, background: '#fff',
          zIndex: 100, boxShadow: 'var(--shadow-md)', overflow: 'hidden',
        }}>
          {atMax && (
            <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text-faint)', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              Maximum of {MAX_LABELS} labels reached
            </div>
          )}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {labels.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: 'var(--text-faint)' }}>No labels configured</div>
            ) : labels.map((l, idx) => {
              const isSel = selectedIds.includes(l.id)
              const isDisabled = !isSel && atMax
              return (
                <div key={l.id} onClick={() => handleToggle(l)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    borderBottom: idx < labels.length - 1 ? '1px solid var(--border)' : 'none',
                    background: isSel ? 'var(--surface-2)' : '#fff',
                    opacity: isDisabled ? 0.45 : 1,
                  }}
                  onMouseEnter={e => { if (!isDisabled) e.currentTarget.style.background = 'var(--surface-2)' }}
                  onMouseLeave={e => e.currentTarget.style.background = isSel ? 'var(--surface-2)' : '#fff'}
                >
                  <div style={{
                    width: 15, height: 15, borderRadius: 3, flexShrink: 0,
                    border: '1.5px solid ' + (isSel ? 'var(--brand)' : 'var(--border)'),
                    background: isSel ? 'var(--brand)' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isSel && <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{
                    display: 'inline-flex', padding: '2px 9px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: (l.colour_hex || '#0052CC') + '22', color: l.colour_hex || '#0052CC',
                  }}>
                    {l.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function CreateTicketPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user }  = useAuth()

  const fromCard    = location.state?.fromCard    || false
  const lockedGroup = location.state?.lockedGroup || null

  // ── Assignee (new — replaces both the old hardcoded department select
  // and the old fake agent picker) ──
  const [assignee, setAssignee] = useState(
    lockedGroup ? { type: 'group', id: lockedGroup.id, name: lockedGroup.name, icon: lockedGroup.icon, prefix: lockedGroup.prefix, description: lockedGroup.description } : null
  )

  // ── Request Type — the resolved group driving the rest of the form ──
  // Holds the currently SELECTED group object (id, name, icon, icon_image_url, description).
  const [requestTypeGroup,   setRequestTypeGroup]   = useState(null)
  // When the assignee is a person with multiple eligible (non-General) groups,
  // this holds the full list so the user can switch via a dropdown.
  const [requestTypeOptions, setRequestTypeOptions] = useState([])
  const [requestTypeOpen,    setRequestTypeOpen]    = useState(false)
  const requestTypeRef = useRef(null)

  // field state
  const [workType,      setWorkType]       = useState('')
  const [summary,       setSummary]        = useState('')
  const [component,     setComponent]      = useState('')
  const [files,         setFiles]          = useState([])
  const [dragOver,      setDragOver]       = useState(false)
  const [dueDate,       setDueDate]        = useState('')
  const [description,   setDescription]    = useState('')
  const [linkType,      setLinkType]       = useState('blocks')
  const [linkedTicket,  setLinkedTicket]   = useState('')
  const [priority,      setPriority]       = useState('')
  const [labelIds,      setLabelIds]       = useState([])
  const [urgency,       setUrgency]        = useState('')
  const [createAnother, setCreateAnother]  = useState(false)
  const [errors,        setErrors]         = useState({})
  const [loading,       setLoading]        = useState(false)

  const fileInputRef = useRef(null)

  // ── Resolve Request Type whenever Assignee changes ──
  useEffect(() => {
    if (!assignee) {
      setRequestTypeGroup(null)
      setRequestTypeOptions([])
      return
    }

    if (assignee.type === 'group') {
      // Assignee IS a group — Request Type mirrors it directly (General included).
      const groupAsRequestType = {
        id:             assignee.id,
        name:           assignee.name,
        icon:           assignee.icon,
        icon_image_url: assignee.icon_image_url,
        prefix:         assignee.prefix,
        description:    assignee.description,
      }
      setRequestTypeOptions([groupAsRequestType])
      setRequestTypeGroup(groupAsRequestType)
      return
    }

    // Assignee is a person — derive eligible groups (active, excluding General)
    const eligible = (assignee.groups || []).filter(g => !isGeneralGroup(g))
    setRequestTypeOptions(eligible)
    setRequestTypeGroup(eligible.length > 0 ? eligible[0] : null)
  }, [assignee])

  // close Request Type dropdown on outside click
  useEffect(() => {
    function h(e) { if (requestTypeRef.current && !requestTypeRef.current.contains(e.target)) setRequestTypeOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Fetch components scoped to the resolved Request Type group — ACTIVE
  // ONLY, so anything the admin has marked inactive never appears here.
  const { data: componentsData } = useQuery({
    queryKey: ['components-for-group', requestTypeGroup?.id],
    queryFn:  () => componentAPI.listActiveByGroup(requestTypeGroup.id).then(r => r.data.results || r.data),
    enabled:  Boolean(requestTypeGroup?.id),
  })
  const availableComponents = componentsData || []

  // Fetch work types scoped to the resolved Request Type group — ACTIVE
  // ONLY, same reasoning as Components above.
  // NOTE: Ticket.work_type is currently a plain string field (interim —
  // a dedicated FK migration to configuration.WorkType is planned as a
  // separate task). For now we submit the selected WorkType's slug into
  // that string field, same approach as Components.
  const { data: workTypesData } = useQuery({
    queryKey: ['worktypes-for-group', requestTypeGroup?.id],
    queryFn:  () => workTypeAPI.listActiveByGroup(requestTypeGroup.id).then(r => r.data.results || r.data),
    enabled:  Boolean(requestTypeGroup?.id),
  })
  const availableWorkTypes = workTypesData || []

  // Fetch Priority options — global, not group-scoped, ACTIVE ONLY.
  // NOTE: Ticket.priority is currently a plain string field (same interim
  // approach as Work Type / Components — submits the selected Priority's
  // slug into that string field).
  const { data: prioritiesData } = useQuery({
    queryKey: ['priorities-active'],
    queryFn:  () => priorityAPI.listActive().then(r => r.data.results || r.data),
  })
  const availablePriorities = prioritiesData || []

  // Fetch Urgency options — global, not group-scoped, ACTIVE ONLY.
  // NOTE: Ticket.urgency is currently a plain string field (same interim
  // approach as Priority — submits the selected Urgency's slug into that
  // string field).
  const { data: urgenciesData } = useQuery({
    queryKey: ['urgencies-active'],
    queryFn:  () => urgencyAPI.listActive().then(r => r.data.results || r.data),
  })
  const availableUrgencies = urgenciesData || []

  // Fetch Labels scoped to the resolved Request Type group — ACTIVE ONLY.
  // Labels are a real M2M (TicketLabel) already, so label_ids submit
  // directly — no interim slug workaround needed here.
  const { data: labelsData } = useQuery({
    queryKey: ['labels-for-group', requestTypeGroup?.id],
    queryFn:  () => ticketsAPI.listActiveLabelsByGroup(requestTypeGroup.id).then(r => r.data.results || r.data),
    enabled:  Boolean(requestTypeGroup?.id),
  })
  const availableLabels = labelsData || []

  // Reset selected component/work type/labels whenever the resolved group changes
  useEffect(() => {
    setComponent('')
    setWorkType('')
    setLabelIds([])
  }, [requestTypeGroup?.id])

  // Auto-select the work type marked as default for this group, if any,
  // once the list loads (mirrors how a sensible default should appear
  // without forcing the user to always pick manually).
  useEffect(() => {
    if (!workType && availableWorkTypes.length > 0) {
      const defaultWt = availableWorkTypes.find(wt => wt.is_default) || availableWorkTypes[0]
      setWorkType(defaultWt.slug)
    }
  }, [availableWorkTypes, workType])

  // Default Priority to "Lowest" specifically (per requirement), falling
  // back to the first available priority only if "lowest" doesn't exist
  // in the admin-configured list at all.
  useEffect(() => {
    if (!priority && availablePriorities.length > 0) {
      const lowestPriority = availablePriorities.find(p => p.slug === 'lowest') || availablePriorities[0]
      setPriority(lowestPriority.slug)
    }
  }, [availablePriorities, priority])

  function addFiles(f) { setFiles(p => [...p, ...Array.from(f)]) }
  function removeFile(i) { setFiles(p => p.filter((_, idx) => idx !== i)) }

  function toggleLabel(id) {
    setLabelIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= MAX_LABELS) return prev
      return [...prev, id]
    })
  }

  function validate() {
    const e = {}
    if (!assignee)         e.assignee    = 'Please select an assignee'
    if (!requestTypeGroup) e.requestType = 'Please select a request type'
    if (!workType)          e.workType    = 'Please select a work type'
    if (!summary.trim())   e.summary     = 'Summary is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const payload = {
        summary, description, work_type: workType,
        priority, urgency: urgency || undefined,
        components: component || undefined,
        due_date: dueDate || undefined,
        assigned_group_id: requestTypeGroup.id,
        assigned_user_id: assignee.type === 'user' ? assignee.id : undefined,
        label_ids: labelIds,
      }
      const res = await ticketsAPI.create(payload)
      if (createAnother) {
        setAssignee(null); setRequestTypeGroup(null); setRequestTypeOptions([])
        setWorkType(''); setSummary(''); setDescription(''); setComponent('')
        setDueDate(''); setFiles([]); setLabelIds([]); setUrgency(''); setPriority('')
        setLinkType('blocks'); setLinkedTicket(''); setErrors({})
        window.scrollTo(0, 0)
      } else {
        navigate(`/tickets/${res.data.id}`)
      }
    } catch (err) {
      setErrors({ submit: err.response?.data?.detail || 'Failed to create ticket.' })
    } finally { setLoading(false) }
  }

  return (
    <div style={{ padding: '28px 32px', overflowY: 'auto', minHeight: '100%' }}>

      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
        <span style={{ cursor: 'pointer' }} onClick={() => navigate('/')}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >Home</span>
        <span style={{ margin: '0 4px' }}>›</span>
        <span style={{ cursor: 'pointer' }} onClick={() => navigate('/my-tickets')}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >My Requests</span>
        <span style={{ margin: '0 4px' }}>›</span>
        <span>Raise a Request</span>
      </div>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Raise a Request</h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
          Required fields are marked with an asterisk <span style={{ color: 'var(--danger)' }}>*</span>
        </p>
      </div>

      {errors.submit && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid #FF8F73', borderRadius: 4, padding: '10px 14px', fontSize: 13, color: 'var(--danger)', marginBottom: 20 }}>
          ⚠️ {errors.submit}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '32px 36px 28px', maxWidth: 780 }}>

          {/* 1. ASSIGNEE — searchable, groups + people */}
          <Group>
            <Label required>Assignee</Label>
            {fromCard ? (
              <div style={{ ...S.input, background: 'var(--surface-2)', color: 'var(--text-muted)', cursor: 'not-allowed' }}>
                {lockedGroup?.icon} {lockedGroup?.name}
              </div>
            ) : (
              <AssigneeDropdown
                value={assignee}
                onSelect={(item) => { setAssignee(item); setErrors(p => ({ ...p, assignee: '' })) }}
              />
            )}
            {errors.assignee && <Err>{errors.assignee}</Err>}
          </Group>

          {/* 2. REQUEST TYPE — derived from Assignee; dropdown only when the
              assignee is a person belonging to more than one eligible group */}
          <Group>
            <Label required hint="What's this?">Request Type</Label>
            {requestTypeOptions.length > 1 ? (
              <div ref={requestTypeRef} style={{ position: 'relative' }}>
                <div
                  onClick={() => setRequestTypeOpen(o => !o)}
                  style={{
                    border: '1.5px solid ' + (requestTypeOpen ? '#4C9AFF' : 'var(--border)'),
                    borderRadius: 4, padding: '14px 16px', display: 'flex', alignItems: 'flex-start',
                    justifyContent: 'space-between', gap: 12, background: '#fff', cursor: 'pointer',
                    transition: 'border-color .15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 4, background: '#DEEBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, overflow: 'hidden' }}>
                      {requestTypeGroup?.icon_image_url
                        ? <img src={requestTypeGroup.icon_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : (requestTypeGroup?.icon || '💬')
                      }
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{requestTypeGroup?.name}</div>
                      {requestTypeGroup?.description && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{requestTypeGroup.description}</div>
                      )}
                    </div>
                  </div>
                  <span style={{ color: 'var(--text-faint)', fontSize: 14, marginTop: 2, flexShrink: 0 }}>▾</span>
                </div>
                {requestTypeOpen && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, border: '1.5px solid var(--border)', borderRadius: 4, background: '#fff', zIndex: 100, boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
                    {requestTypeOptions.map(g => (
                      <div key={g.id} onClick={() => { setRequestTypeGroup(g); setRequestTypeOpen(false) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: requestTypeGroup?.id === g.id ? 'var(--surface-2)' : 'none' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = requestTypeGroup?.id === g.id ? 'var(--surface-2)' : 'none'}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: 4, background: '#DEEBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, overflow: 'hidden' }}>
                          {g.icon_image_url
                            ? <img src={g.icon_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : (g.icon || '💬')
                          }
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--text)' }}>{g.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                border: '1.5px solid var(--border)', borderRadius: 4,
                padding: '14px 16px', display: 'flex', alignItems: 'flex-start',
                justifyContent: 'space-between', gap: 12, background: '#fff', cursor: 'default',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 4, background: '#DEEBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, overflow: 'hidden' }}>
                    {requestTypeGroup?.icon_image_url
                      ? <img src={requestTypeGroup.icon_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (requestTypeGroup ? (requestTypeGroup.icon || '💬') : '💬')
                    }
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                      {requestTypeGroup ? requestTypeGroup.name : <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>Select an assignee above</span>}
                    </div>
                    {requestTypeGroup?.description && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{requestTypeGroup.description}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {errors.requestType && <Err>{errors.requestType}</Err>}
          </Group>

          {/* 3. WORK TYPE — dynamic, scoped to the resolved Request Type group */}
          <Group>
            <Label required>Work Type</Label>
            <Wrap>
              <select
                value={workType}
                onChange={e => setWorkType(e.target.value)}
                disabled={!requestTypeGroup}
                style={{ ...S.select, ...(!requestTypeGroup ? { color: 'var(--text-faint)', cursor: 'not-allowed' } : {}), borderColor: errors.workType ? 'var(--danger)' : 'var(--border)' }}
                onFocus={focus} onBlur={e => blur(e, errors.workType)}
              >
                <option value="">
                  {!requestTypeGroup ? 'Select a request type first' : 'Select Work Type'}
                </option>
                {availableWorkTypes.map(wt => (
                  <option key={wt.id} value={wt.slug}>{wt.icon ? wt.icon + ' ' : ''}{wt.name}</option>
                ))}
              </select>
            </Wrap>
            {requestTypeGroup && availableWorkTypes.length === 0 && (
              <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 5 }}>
                No work types configured for this request type yet.
              </p>
            )}
            {errors.workType && <Err>{errors.workType}</Err>}
          </Group>

          {/* 4. SUMMARY */}
          <Group>
            <Label required>Summary</Label>
            <input type="text" placeholder="Brief description of the issue…"
              value={summary} onChange={e => { setSummary(e.target.value); setErrors(p => ({ ...p, summary: '' })) }}
              style={{ ...S.input, borderColor: errors.summary ? 'var(--danger)' : 'var(--border)' }}
              onFocus={focus} onBlur={e => blur(e, errors.summary)}
            />
            {errors.summary && <Err>{errors.summary}</Err>}
          </Group>

          {/* 5. COMPONENTS — dynamic, scoped to the resolved Request Type group */}
          <Group>
            <Label>Components</Label>
            <Wrap>
              <select
                value={component}
                onChange={e => setComponent(e.target.value)}
                disabled={!requestTypeGroup}
                style={{ ...S.select, ...(!requestTypeGroup ? { color: 'var(--text-faint)', cursor: 'not-allowed' } : {}) }}
                onFocus={focus} onBlur={blur}
              >
                <option value="">
                  {!requestTypeGroup ? 'Select a request type first' : 'Select Component'}
                </option>
                {availableComponents.map(c => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </Wrap>
            {requestTypeGroup && availableComponents.length === 0 && (
              <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 5 }}>
                No components configured for this request type yet.
              </p>
            )}
          </Group>

          {/* 6. ATTACHMENT */}
          <Group>
            <Label>Attachment</Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
              style={{
                border: '1.5px dashed ' + (dragOver ? 'var(--brand)' : 'var(--border)'),
                borderRadius: 4, padding: '24px 16px', textAlign: 'center',
                background: dragOver ? '#F0F4FF' : '#FAFBFC', cursor: 'pointer',
                transition: 'border-color .15s, background .15s',
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 6 }}>☁️</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Drop files to attach or{' '}
                <button type="button"
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                  style={{ color: 'var(--brand)', fontWeight: 600, background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 13, padding: 0, cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                >Browse</button>
              </div>
            </div>
            <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
              onChange={e => addFiles(e.target.files)} />
            {files.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {files.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px', fontSize: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}>
                      📎 {f.name} <span style={{ color: 'var(--text-faint)' }}>({(f.size / 1024).toFixed(1)} KB)</span>
                    </span>
                    <button type="button" onClick={() => removeFile(i)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 14, cursor: 'pointer', padding: 0 }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </Group>

          {/* 7. DUE DATE */}
          <Group>
            <Label>Due Date</Label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              style={{ ...S.input, maxWidth: 240 }}
              onFocus={focus} onBlur={blur}
            />
          </Group>

          {/* 8. DESCRIPTION with rich text toolbar */}
          <Group>
            <Label>Description</Label>
            <div style={{ border: '1.5px solid var(--border)', borderRadius: 4, overflow: 'hidden', background: '#fff' }}
              onFocusCapture={e => e.currentTarget.style.borderColor = '#4C9AFF'}
              onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '8px 10px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', flexWrap: 'wrap' }}>
                {[
                  { l: 'B', extra: { fontWeight: 'bold' },            t: 'Bold'         },
                  { l: 'I', extra: { fontStyle: 'italic' },           t: 'Italic'       },
                  { l: 'U', extra: { textDecoration: 'underline' },   t: 'Underline'    },
                ].map(b => (
                  <button key={b.l} type="button" title={b.t}
                    style={{ width: 28, height: 28, border: 'none', background: 'none', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', ...b.extra }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >{b.l}</button>
                ))}
                <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />
                {['☰', '≡'].map(ic => (
                  <button key={ic} type="button" style={{ width: 28, height: 28, border: 'none', background: 'none', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >{ic}</button>
                ))}
                <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />
                <button type="button" style={{ width: 28, height: 28, border: 'none', background: 'none', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
                >H</button>
                <button type="button" style={{ width: 28, height: 28, border: 'none', background: 'none', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'monospace' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
                >{'</>'}</button>
                {['🔗', '🙂'].map(ic => (
                  <button key={ic} type="button" style={{ width: 28, height: 28, border: 'none', background: 'none', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >{ic}</button>
                ))}
                <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />
                {['↩', '↪'].map(ic => (
                  <button key={ic} type="button" style={{ width: 28, height: 28, border: 'none', background: 'none', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >{ic}</button>
                ))}
              </div>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Describe the issue in detail. You can use **bold**, `inline code`, or ``` for code blocks. Use @ to mention someone."
                style={{ width: '100%', minHeight: 120, padding: '12px 14px', border: 'none', outline: 'none', resize: 'vertical', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', backgroundColor: '#fff', lineHeight: 1.6 }}
              />
            </div>
          </Group>

          {/* 9. REPORTER */}
          <Group>
            <Label>Reporter</Label>
            <input type="text" readOnly
              value={user ? (user.first_name + ' ' + user.last_name).trim() : ''}
              style={{ ...S.input, background: 'var(--surface-2)', color: 'var(--text-muted)', cursor: 'default' }}
            />
          </Group>

          {/* 10. LINKED WORK ITEMS */}
          <Group>
            <Label>Linked Work Items</Label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Wrap>
                <select value={linkType} onChange={e => setLinkType(e.target.value)}
                  style={S.select} onFocus={focus} onBlur={blur}
                >
                  <option value="blocks">blocks</option>
                  <option value="blocked">is blocked by</option>
                  <option value="relates">relates to</option>
                  <option value="duplicates">duplicates</option>
                  <option value="cloned">is cloned by</option>
                </select>
              </Wrap>
              <Wrap>
                <select value={linkedTicket} onChange={e => setLinkedTicket(e.target.value)}
                  style={S.select} onFocus={focus} onBlur={blur}
                >
                  <option value="">Type, search or select a ticket…</option>
                  <option value="EPOS-0001">EPOS-0001 — Till 3 not connecting</option>
                </select>
              </Wrap>
            </div>
          </Group>

          {/* 11. PRIORITY — custom-styled dropdown, matching admin icons + colours */}
          <Group>
            <Label>Priority</Label>
            <PriorityDropdown
              priorities={availablePriorities}
              value={priority}
              onSelect={setPriority}
            />
            <div style={{ marginTop: 5 }}>
              <a href="#" style={{ fontSize: 11, color: 'var(--brand)' }}>Learn about priority levels ↗</a>
            </div>
          </Group>

          {/* 12. LABELS — multi-select, max 3, scoped to the resolved Request Type group */}
          <Group>
            <Label hint={`${labelIds.length}/${MAX_LABELS} selected`}>Labels</Label>
            <LabelsMultiSelect
              labels={availableLabels}
              selectedIds={labelIds}
              onToggle={toggleLabel}
              disabled={!requestTypeGroup}
            />
            {requestTypeGroup && availableLabels.length === 0 && (
              <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 5 }}>
                No labels configured for this request type yet.
              </p>
            )}
          </Group>

          {/* 13. URGENCY — custom-styled dropdown, matching admin colours */}
          <div style={{ marginBottom: 0 }}>
            <Label>Urgency</Label>
            <UrgencyDropdown
              urgencies={availableUrgencies}
              value={urgency}
              onSelect={setUrgency}
            />
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border)', margin: '28px -36px 24px' }} />

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="createAnother" checked={createAnother} onChange={e => setCreateAnother(e.target.checked)}
                style={{ width: 15, height: 15, accentColor: 'var(--brand)', cursor: 'pointer' }}
              />
              <label htmlFor="createAnother" style={{ fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                Create another
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="button" onClick={() => navigate(-1)}
                style={{ background: 'none', border: '1.5px solid var(--border)', color: 'var(--text)', borderRadius: 4, padding: '9px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = '#b3b9c4' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >Cancel</button>
              <button type="submit" disabled={loading}
                style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 4, padding: '9px 24px', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--brand-hover)' }}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
              >
                {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Creating…</> : 'Create'}
              </button>
            </div>
          </div>

        </div>
      </form>
    </div>
  )
}