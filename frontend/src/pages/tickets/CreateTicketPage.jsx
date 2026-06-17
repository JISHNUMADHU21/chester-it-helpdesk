import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ticketsAPI } from '../../api/tickets'
import { groupsAPI } from '../../api/groups'
import { useAuth } from '../../context/AuthContext'
import { useQuery } from '@tanstack/react-query'

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

const DEPT_OPTIONS = [
  { value: 'EPOS', label: '🖥️ EPOS & IT'               },
  { value: 'NET',  label: '🌐 Networks & Connectivity'   },
  { value: 'STK',  label: '📦 Stock'                    },
  { value: 'CLR',  label: '🍺 Cellar'                   },
  { value: 'MNT',  label: '🔧 Maintenance'              },
  { value: 'RCO',  label: '🏇 Racing Operations'        },
  { value: 'HR',   label: '💼 HR & Payroll'             },
  { value: 'FIN',  label: '💰 Finance'                  },
  { value: 'GEN',  label: '💬 General'                  },
]

const RT_INFO = {
  EPOS: { icon: '🖥️', name: 'EPOS & IT Support',        desc: 'Get assistance for EPOS systems, tills, and general IT issues.'       },
  NET:  { icon: '🌐', name: 'Network & Connectivity',    desc: 'Report Wi-Fi, broadband, VPN, or connectivity problems.'               },
  STK:  { icon: '📦', name: 'Stock Request',             desc: 'Report delivery issues, stock discrepancies, or shortages.'            },
  CLR:  { icon: '🍺', name: 'Cellar Support',            desc: 'Log cellar equipment faults, line pressure, or CO2 issues.'            },
  MNT:  { icon: '🔧', name: 'Maintenance Request',       desc: 'Report building, equipment, or infrastructure faults.'                 },
  RCO:  { icon: '🏇', name: 'Racing Operations',         desc: 'Raise issues related to race day operations and facilities.'           },
  HR:   { icon: '💼', name: 'HR & Payroll',              desc: 'Submit HR queries, payroll issues, or onboarding requests.'            },
  FIN:  { icon: '💰', name: 'Finance Request',           desc: 'Report finance system issues or invoice/payment queries.'              },
  GEN:  { icon: '💬', name: 'General Enquiry',           desc: "For anything that doesn't fit another department."                    },
}

export default function CreateTicketPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user }  = useAuth()

  const fromCard    = location.state?.fromCard    || false
  const lockedGroup = location.state?.lockedGroup || null

  // field state
  const [dept,          setDept]          = useState(lockedGroup?.prefix || '')
  const [workType,      setWorkType]       = useState('service_request')
  const [summary,       setSummary]        = useState('')
  const [component,     setComponent]      = useState('')
  const [files,         setFiles]          = useState([])
  const [dragOver,      setDragOver]       = useState(false)
  const [dueDate,       setDueDate]        = useState('')
  const [description,   setDescription]    = useState('')
  const [linkType,      setLinkType]       = useState('blocks')
  const [linkedTicket,  setLinkedTicket]   = useState('')
  const [agentAssignee, setAgentAssignee]  = useState('automatic')
  const [agentOpen,     setAgentOpen]      = useState(false)
  const [priority,      setPriority]       = useState('medium')
  const [label,         setLabel]          = useState('')
  const [urgency,       setUrgency]        = useState('')
  const [createAnother, setCreateAnother]  = useState(false)
  const [errors,        setErrors]         = useState({})
  const [loading,       setLoading]        = useState(false)

  const fileInputRef = useRef(null)
  const agentRef     = useRef(null)

  // fetch groups for mapping dept prefix → group id
  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn:  () => groupsAPI.list().then(r => r.data.results),
  })
  const groups = groupsData || []

  // close agent dropdown on outside click
  useEffect(() => {
    function h(e) { if (agentRef.current && !agentRef.current.contains(e.target)) setAgentOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function addFiles(f) { setFiles(p => [...p, ...Array.from(f)]) }
  function removeFile(i) { setFiles(p => p.filter((_, idx) => idx !== i)) }

  const AGENTS = [
    { value: 'automatic', label: 'Automatic', icon: '⚙',  bg: '#DEEBFF', color: '#0747A6', isAuto: true },
    { value: 'tw',        label: 'Tom Williams', initials: 'TW', bg: '#DEEBFF', color: '#0747A6' },
    { value: 'mp',        label: 'Mike Patel',   initials: 'MP', bg: '#E3FCEF', color: '#006644' },
    { value: 'al',        label: 'Amy Lee',      initials: 'AL', bg: '#EAE6FF', color: '#403294' },
    { value: 'jr',        label: 'Jane Roberts', initials: 'JR', bg: '#FFF0E0', color: '#974F0C' },
  ]
  const currentAgent = AGENTS.find(a => a.value === agentAssignee) || AGENTS[0]

  function validate() {
    const e = {}
    if (!dept)           e.dept    = 'Please select a department'
    if (!summary.trim()) e.summary = 'Summary is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const group = groups.find(g => g.prefix === dept)
      const payload = {
        summary, description, work_type: workType,
        priority, urgency: urgency || undefined,
        components: component || undefined,
        due_date: dueDate || undefined,
        assigned_group_id: group?.id,
      }
      const res = await ticketsAPI.create(payload)
      if (createAnother) {
        setDept(''); setSummary(''); setDescription(''); setComponent('')
        setDueDate(''); setFiles([]); setLabel(''); setUrgency('')
        setLinkType('blocks'); setLinkedTicket(''); setAgentAssignee('automatic'); setErrors({})
        window.scrollTo(0, 0)
      } else {
        navigate(`/tickets/${res.data.id}`)
      }
    } catch (err) {
      setErrors({ submit: err.response?.data?.detail || 'Failed to create ticket.' })
    } finally { setLoading(false) }
  }

  const rt = RT_INFO[dept]

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

          {/* 1. ASSIGNEE (Department) */}
          <Group>
            <Label required>Assignee</Label>
            {fromCard ? (
              <div style={{ ...S.input, background: 'var(--surface-2)', color: 'var(--text-muted)', cursor: 'not-allowed' }}>
                {lockedGroup?.icon} {lockedGroup?.name}
              </div>
            ) : (
              <Wrap>
                <select value={dept} onChange={e => { setDept(e.target.value); setErrors(p => ({ ...p, dept: '' })) }}
                  style={{ ...S.select, borderColor: errors.dept ? 'var(--danger)' : 'var(--border)' }}
                  onFocus={focus} onBlur={e => blur(e, errors.dept)}
                >
                  <option value="">Select Department</option>
                  {DEPT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Wrap>
            )}
            {errors.dept && <Err>{errors.dept}</Err>}
          </Group>

          {/* 2. WORK TYPE */}
          <Group>
            <Label required>Work Type</Label>
            <Wrap>
              <select value={workType} onChange={e => setWorkType(e.target.value)}
                style={S.select} onFocus={focus} onBlur={blur}
              >
                <option value="service_request">☑ Service Request</option>
                <option value="incident">⚠️ Incident</option>
                <option value="problem">🔴 Problem</option>
                <option value="change_request">🔄 Change Request</option>
              </select>
            </Wrap>
          </Group>

          {/* 3. REQUEST TYPE (card) */}
          <Group>
            <Label required hint="What's this?">Request Type</Label>
            <div style={{
              border: '1.5px solid var(--border)', borderRadius: 4,
              padding: '14px 16px', display: 'flex', alignItems: 'flex-start',
              justifyContent: 'space-between', gap: 12, background: '#fff', cursor: 'default',
              transition: 'border-color .15s',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 4, background: '#DEEBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {rt ? rt.icon : '💬'}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                    {rt ? rt.name : <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>Select a department above</span>}
                  </div>
                  {rt && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{rt.desc}</div>}
                </div>
              </div>
              <span style={{ color: 'var(--text-faint)', fontSize: 14, marginTop: 2, flexShrink: 0 }}>▾</span>
            </div>
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

          {/* 5. COMPONENTS */}
          <Group>
            <Label>Components</Label>
            <Wrap>
              <select value={component} onChange={e => setComponent(e.target.value)}
                style={S.select} onFocus={focus} onBlur={blur}
              >
                <option value="">Select Component</option>
                <option value="hardware">Hardware</option>
                <option value="software">Software</option>
                <option value="network">Network</option>
                <option value="epos">EPOS / Tills</option>
                <option value="access">Access &amp; Permissions</option>
                <option value="other">Other</option>
              </select>
            </Wrap>
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

          {/* 11. ASSIGNEE (agent) */}
          <Group>
            <Label hint="Assign to me" onHint={() => setAgentAssignee('me')}>Assignee</Label>
            <div ref={agentRef} style={{ position: 'relative' }}>
              <div onClick={() => setAgentOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1.5px solid var(--border)', borderRadius: 4, padding: '9px 12px', background: '#fff', cursor: 'pointer', transition: 'border-color .15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#4C9AFF'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {currentAgent.isAuto ? (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#DEEBFF', color: '#0747A6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>⚙</div>
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: currentAgent.bg, color: currentAgent.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{currentAgent.initials}</div>
                )}
                <span style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>{currentAgent.label}</span>
                <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>▾</span>
              </div>
              {agentOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, border: '1.5px solid var(--border)', borderRadius: 4, background: '#fff', zIndex: 100, overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
                  {AGENTS.map((a, i) => (
                    <div key={a.value} onClick={() => { setAgentAssignee(a.value); setAgentOpen(false) }}
                      style={{ padding: '9px 12px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderBottom: i < AGENTS.length - 1 ? '1px solid var(--border)' : 'none', background: agentAssignee === a.value ? 'var(--surface-2)' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = agentAssignee === a.value ? 'var(--surface-2)' : 'none'}
                    >
                      {a.isAuto ? (
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#DEEBFF', color: '#0747A6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚙</div>
                      ) : (
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: a.bg, color: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{a.initials}</div>
                      )}
                      {a.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Group>

          {/* 12. PRIORITY */}
          <Group>
            <Label>Priority</Label>
            <Wrap>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                style={S.select} onFocus={focus} onBlur={blur}
              >
                <option value="low">🔵 Low</option>
                <option value="medium">🟠 Medium</option>
                <option value="high">🔴 High</option>
              </select>
            </Wrap>
            <div style={{ marginTop: 5 }}>
              <a href="#" style={{ fontSize: 11, color: 'var(--brand)' }}>Learn about priority levels ↗</a>
            </div>
          </Group>

          {/* 13. LABELS */}
          <Group>
            <Label>Labels</Label>
            <Wrap>
              <select value={label} onChange={e => setLabel(e.target.value)}
                style={S.select} onFocus={focus} onBlur={blur}
              >
                <option value="">Select label</option>
                <option value="bug">Bug</option>
                <option value="hardware">Hardware</option>
                <option value="software">Software</option>
                <option value="urgent">Urgent</option>
                <option value="followup">Follow-up</option>
                <option value="race-day">Race Day</option>
              </select>
            </Wrap>
          </Group>

          {/* 14. URGENCY */}
          <div style={{ marginBottom: 0 }}>
            <Label>Urgency</Label>
            <Wrap>
              <select value={urgency} onChange={e => setUrgency(e.target.value)}
                style={S.select} onFocus={focus} onBlur={blur}
              >
                <option value="">Select…</option>
                <option value="critical">🔴 Critical — Operations at risk</option>
                <option value="high">🟠 High — Major disruption</option>
                <option value="medium">🟡 Medium — Partial disruption</option>
                <option value="low">🟢 Low — Minor inconvenience</option>
              </select>
            </Wrap>
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