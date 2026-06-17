import { useState, useRef, useEffect } from 'react'

/**
 * Reusable multi-select dropdown component.
 *
 * Props:
 *   options      — [{ value, label }]
 *   selected     — [value, ...]
 *   onChange     — (newSelected) => void
 *   placeholder  — string shown when nothing selected
 *   width        — CSS width string (default '200px')
 */
export default function MultiSelect({ options, selected, onChange, placeholder = 'All', width = '200px' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggle(value) {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  function clearAll(e) {
    e.stopPropagation()
    onChange([])
  }

  const activeOptions = options.filter(o => selected.includes(o.value))
  const hasSelection  = selected.length > 0

  return (
    <div ref={ref} style={{ position: 'relative', width }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 10px', border: '1.5px solid ' + (open ? '#4C9AFF' : 'var(--border)'),
          borderRadius: 4, background: '#fff', cursor: 'pointer',
          fontSize: 13, color: hasSelection ? 'var(--text)' : 'var(--text-muted)',
          minWidth: 0, transition: 'border-color .15s',
          boxShadow: open ? '0 0 0 2px rgba(76,154,255,.2)' : 'none',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 6 }}>
          {hasSelection
            ? activeOptions.length === 1
              ? activeOptions[0].label
              : `${activeOptions.length} selected`
            : placeholder
          }
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {hasSelection && (
            <span
              onClick={clearAll}
              style={{ fontSize: 14, color: 'var(--text-faint)', lineHeight: 1, cursor: 'pointer', padding: '0 2px' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}
            >✕</span>
          )}
          <span style={{
            fontSize: 10, color: 'var(--text-muted)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform .15s', display: 'inline-block',
          }}>▾</span>
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0,
          minWidth: '100%', background: '#fff',
          border: '1.5px solid var(--border)', borderRadius: 6,
          boxShadow: 'var(--shadow-md)', zIndex: 150,
          overflow: 'hidden',
        }}>
          {/* Select all / clear all */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '7px 12px', borderBottom: '1px solid var(--border)',
            background: 'var(--surface-2)',
          }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
              {selected.length} of {options.length} selected
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => onChange(options.map(o => o.value))}
                style={{ fontSize: 11, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >All</button>
              <button
                type="button"
                onClick={() => onChange([])}
                style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >Clear</button>
            </div>
          </div>

          {/* Options */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {options.map(opt => {
              const isSelected = selected.includes(opt.value)
              return (
                <div
                  key={opt.value}
                  onClick={() => toggle(opt.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                    background: isSelected ? '#F0F4FF' : 'none',
                    transition: 'background .12s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--surface-2)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'none' }}
                >
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
                  <span style={{ color: isSelected ? 'var(--brand)' : 'var(--text)', fontWeight: isSelected ? 500 : 400 }}>
                    {opt.label}
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