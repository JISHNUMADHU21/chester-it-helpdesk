import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { homePageAPI } from '../../../api/config'
import { groupsAPI } from '../../../api/groups'

const TOTAL_SLOTS = 8
const LS_KEY      = 'chester_homepage_layout'

export default function HomePageManagePage() {
  const navigate     = useNavigate()
  const queryClient  = useQueryClient()

  const [layout,      setLayout]      = useState(Array(TOTAL_SLOTS).fill(null))
  const [savedLayout, setSavedLayout] = useState(Array(TOTAL_SLOTS).fill(null))
  const [dragSrc,     setDragSrc]     = useState(null)
  const [dragOver,    setDragOver]    = useState(null)
  const [picker,      setPicker]      = useState(null)   // slot index | null
  const [pickerSearch, setPickerSearch] = useState('')
  const [pickerAnchor, setPickerAnchor] = useState(null) // {top, left}
  const [toast,       setToast]       = useState(null)
  const toastTimer = useRef(null)

  // ── Load current layout from API ─────────────────────────────────────────
  const { data: layoutData, isLoading: layoutLoading } = useQuery({
    queryKey: ['homepage-layout'],
    queryFn:  () => homePageAPI.get().then(r => r.data),
  })

  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn:  () => groupsAPI.list().then(r => r.data.results),
  })
  const allGroups = groupsData || []

  // Populate layout when data loads
  useEffect(() => {
    if (layoutData?.layout) {
      const l = layoutData.layout.slice(0, TOTAL_SLOTS)
      const padded = [...l, ...Array(TOTAL_SLOTS - l.length).fill(null)]
      setLayout(padded)
      setSavedLayout(padded)
    }
  }, [layoutData])

  // Listen for cross-tab storage events
  useEffect(() => {
    function onStorage(e) {
      if (e.key === LS_KEY && e.newValue) {
        try {
          const data = JSON.parse(e.newValue)
          const l    = data.layout.map(id => id || null)
          setLayout(l)
          setSavedLayout(l)
          showToast('Layout updated from another session.', 'info')
        } catch {}
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const saveMutation = useMutation({
    mutationFn: (layout) => homePageAPI.update(layout),
    onSuccess: (res) => {
      const newLayout = res.data.layout
      setSavedLayout(newLayout)
      // Broadcast to other tabs
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({ layout: newLayout, savedAt: Date.now() }))
      } catch {}
      queryClient.invalidateQueries(['homepage-layout'])
      showToast('Layout saved and applied to all active sessions!', 'success')
    },
  })

  // ── Toast helper ──────────────────────────────────────────────────────────
  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3800)
  }

  // ── Drag & drop ───────────────────────────────────────────────────────────
  function handleDragStart(idx) { setDragSrc(idx) }
  function handleDragEnd()      { setDragSrc(null); setDragOver(null) }

  function handleDrop(toIdx) {
    if (dragSrc === null || dragSrc === toIdx) { setDragSrc(null); setDragOver(null); return }
    const next = [...layout]
    // Swap
    ;[next[dragSrc], next[toIdx]] = [next[toIdx], next[dragSrc]]
    setLayout(next)
    setDragSrc(null)
    setDragOver(null)
  }

  // ── Tile actions ──────────────────────────────────────────────────────────
  function removeTile(idx) {
    const next = [...layout]
    next[idx]  = null
    setLayout(next)
  }

  function addTile(groupId) {
    if (picker === null) return
    const next    = [...layout]
    next[picker]  = groupId
    setLayout(next)
    setPicker(null)
    setPickerSearch('')
  }

  // ── Picker ────────────────────────────────────────────────────────────────
  function openPicker(slotIdx, anchorEl) {
    const rect    = anchorEl.getBoundingClientRect()
    const panelW  = 320
    let   left    = rect.left + rect.width / 2 - panelW / 2
    let   top     = rect.bottom + 8
    left = Math.max(12, Math.min(left, window.innerWidth - panelW - 12))
    if (top + 360 > window.innerHeight) top = rect.top - 368
    top  = Math.max(12, top)
    setPicker(slotIdx)
    setPickerAnchor({ top, left })
    setPickerSearch('')
  }

  // ── Save / Cancel ─────────────────────────────────────────────────────────
  function handleSave() {
    saveMutation.mutate(layout)
  }

  function handleCancel() {
    const hasChanges = JSON.stringify(layout) !== JSON.stringify(savedLayout)
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Discard and go back?')) {
        navigate(-1)
      }
    } else {
      navigate(-1)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function getGroup(id) {
    return allGroups.find(g => g.id === id) || null
  }

  const usedIds     = new Set(layout.filter(Boolean))
  const filledCount = usedIds.size

  const availableGroups = allGroups.filter(g =>
    !usedIds.has(g.id) &&
    (!pickerSearch ||
      g.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
      g.prefix.toLowerCase().includes(pickerSearch.toLowerCase()))
  )

  if (layoutLoading) return <div className="page-loader"><div className="spinner spinner-lg" /></div>

  return (
    <div style={{ paddingBottom: 80 }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #0747A6 0%, #0052CC 60%, #0065FF 100%)',
        color: '#fff', padding: '36px 24px 44px', textAlign: 'center',
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 6px' }}>
          ✎ Manage Homepage Layout
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,.85)', margin: 0 }}>
          Customise which departments appear on the portal homepage and in what order.
        </p>
      </div>

      {/* Main */}
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 24px 60px', width: '100%' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Department Tiles
          </h2>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EAE6FF', color: '#403294', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', padding: '3px 10px', borderRadius: 20 }}>
            ★ Admin View
          </span>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4C9AFF" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Drag tiles to reorder. Click ✕ to remove a tile. Click + to add a department.
        </p>

        {/* 4×2 Tile grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16, marginBottom: 32,
        }}>
          {layout.map((groupId, idx) => {
            const group     = groupId ? getGroup(groupId) : null
            const isDragging = dragSrc === idx
            const isOver     = dragOver === idx

            if (group) {
              // ── Occupied tile ──
              return (
                <div
                  key={idx}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => { e.preventDefault(); setDragOver(idx) }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={() => handleDrop(idx)}
                  style={{
                    position: 'relative',
                    background: 'var(--surface)',
                    border: isOver
                      ? '2px solid #4C9AFF'
                      : isDragging
                        ? '2px dashed #4C9AFF'
                        : '1px solid var(--border)',
                    borderRadius: 8,
                    padding: 20,
                    display: 'flex', flexDirection: 'column', gap: 10,
                    opacity: isDragging ? 0.45 : 1,
                    boxShadow: isOver ? '0 0 0 3px rgba(76,154,255,.25)' : 'none',
                    transition: 'box-shadow .18s, border-color .18s, opacity .2s',
                    cursor: 'grab',
                    userSelect: 'none',
                    minHeight: 140,
                  }}
                >
                  {/* Remove button */}
                  <button
                    onClick={() => removeTile(idx)}
                    style={{
                      position: 'absolute', top: -9, right: -9,
                      width: 22, height: 22, borderRadius: '50%',
                      background: '#DE350B', border: '2px solid #fff',
                      color: '#fff', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 12, lineHeight: 1,
                      boxShadow: '0 1px 4px rgba(0,0,0,.25)',
                      cursor: 'pointer', zIndex: 2, padding: 0,
                      transition: 'background .15s, transform .15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#BF2600'; e.currentTarget.style.transform = 'scale(1.15)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#DE350B'; e.currentTarget.style.transform = 'scale(1)' }}
                  >✕</button>

                  {/* Tile content */}
                  <div style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 4,
                      background: '#DEEBFF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, marginBottom: 10, overflow: 'hidden',
                    }}>
                      {group.icon_image_url || group.icon_image
                        ? <img src={group.icon_image_url || group.icon_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : group.icon || '💬'
                      }
                    </div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px', lineHeight: 1.3 }}>{group.name}</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{group.description}</p>
                  </div>

                  {/* Drag handle */}
                  <div style={{ position: 'absolute', bottom: 10, right: 10, color: 'var(--text-faint)', opacity: 0.5, fontSize: 14 }}>⠿</div>
                </div>
              )
            } else {
              // ── Empty tile ──
              return (
                <div
                  key={idx}
                  onDragOver={e => { e.preventDefault(); setDragOver(idx) }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={() => handleDrop(idx)}
                  onClick={e => openPicker(idx, e.currentTarget)}
                  style={{
                    position: 'relative',
                    background: 'var(--surface)',
                    border: isOver ? '2px solid #4C9AFF' : '2px dashed var(--border)',
                    borderRadius: 8,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 8, minHeight: 140,
                    cursor: 'pointer',
                    background: isOver ? '#F0F7FF' : 'var(--surface)',
                    transition: 'border-color .18s, background .18s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#4C9AFF'; e.currentTarget.style.background = '#F0F7FF' }}
                  onMouseLeave={e => {
                    if (dragOver !== idx) {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.background = 'var(--surface)'
                    }
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'var(--surface-2)',
                    border: '2px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, color: 'var(--text-faint)',
                    transition: 'border-color .18s, color .18s',
                  }}>+</div>
                  <span style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 500 }}>
                    Add department
                  </span>
                </div>
              )
            }
          })}
        </div>

      </div>

      {/* ── Department picker overlay ── */}
      {picker !== null && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 200 }}
            onClick={() => { setPicker(null); setPickerSearch('') }}
          />
          <div style={{
            position: 'fixed',
            top: pickerAnchor?.top, left: pickerAnchor?.left,
            width: 320, background: '#fff',
            borderRadius: 8, boxShadow: '0 8px 32px rgba(9,30,66,.22)',
            overflow: 'hidden', zIndex: 201,
          }}>
            {/* Picker header */}
            <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 2px' }}>Add Department</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Choose a department to add to this slot</p>
            </div>

            {/* Picker search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                autoFocus
                type="text"
                placeholder="Search departments…"
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
                style={{ border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 13, color: 'var(--text)', outline: 'none', width: '100%' }}
              />
            </div>

            {/* Picker list */}
            <div style={{ maxHeight: 260, overflowY: 'auto', padding: '6px 0' }}>
              {availableGroups.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  {pickerSearch ? 'No departments match your search.' : 'All departments are already on the homepage.'}
                </div>
              ) : availableGroups.map(g => (
                <div
                  key={g.id}
                  onClick={() => addTile(g.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', transition: 'background .12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 4, background: '#DEEBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, overflow: 'hidden' }}>
                    {g.icon_image_url || g.icon_image
                      ? <img src={g.icon_image_url || g.icon_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : g.icon || '💬'
                    }
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{g.name}</div>
                    {g.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{g.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Fixed footer bar ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--surface)', borderTop: '1px solid var(--border)',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 50, boxShadow: '0 -2px 8px rgba(9,30,66,.08)',
      }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text)' }}>{filledCount}</strong> of {TOTAL_SLOTS} slots filled
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleCancel}
            style={{ background: 'none', border: '2px solid var(--border)', color: 'var(--text)', borderRadius: 4, padding: '8px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = '#b3b9c4' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >Cancel</button>
          <button onClick={handleSave} disabled={saveMutation.isPending}
            style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 4, padding: '9px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: saveMutation.isPending ? 0.7 : 1 }}
            onMouseEnter={e => { if (!saveMutation.isPending) e.currentTarget.style.background = 'var(--brand-hover)' }}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
          >{saveMutation.isPending ? 'Saving…' : 'Save Layout'}</button>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          padding: '12px 22px', borderRadius: 8,
          fontSize: 14, fontWeight: 500,
          boxShadow: 'var(--shadow-md)', zIndex: 300,
          display: 'flex', alignItems: 'center', gap: 10,
          whiteSpace: 'nowrap',
          background: toast.type === 'success' ? '#1B7F4B' : '#0052CC',
          color: '#fff',
        }}>
          {toast.type === 'success'
            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          }
          {toast.msg}
        </div>
      )}
    </div>
  )
}