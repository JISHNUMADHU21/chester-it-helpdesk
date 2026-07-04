import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ticketsAPI } from '../../api/tickets'
import { groupsAPI } from '../../api/groups'
import { statusAPI } from '../../api/config'
import { useAuth } from '../../context/AuthContext'

const URGENCY_STYLES = {
  critical: { bg: '#FFEBE6', color: '#BF2600', border: '#FF8F73' },
  high:     { bg: '#FFF0E0', color: '#974F0C', border: '#FFB900' },
  medium:   { bg: '#FFFAE6', color: '#7A5200', border: '#FFD700' },
  low:      { bg: '#E3FCEF', color: '#006644', border: '#ABF5D1' },
}

const PRIORITY_ICONS = {
  highest: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 9L8 4L13 9" stroke="#E2483D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 13L8 8L13 13" stroke="#E2483D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  high:    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 11L8 6L13 11" stroke="#E2483D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  medium:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><line x1="2" y1="5.5" x2="14" y2="5.5" stroke="#E97F33" strokeWidth="2.2" strokeLinecap="round"/><line x1="2" y1="10.5" x2="14" y2="10.5" stroke="#E97F33" strokeWidth="2.2" strokeLinecap="round"/></svg>,
  low:     <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 5L8 10L13 5" stroke="#4C9AFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  lowest:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3L8 8L13 3" stroke="#4C9AFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 7L8 12L13 7" stroke="#4C9AFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
}

function DetailCard({ title, count, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
      <div onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: open ? '1px solid var(--border)' : 'none', cursor: 'pointer', userSelect: 'none' }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
          {title}
          {count !== undefined && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>{count}</span>}
        </h3>
        <span style={{ fontSize: 11, color: 'var(--text-faint)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', display: 'inline-block' }}>▾</span>
      </div>
      {open && <div style={{ padding: 18 }}>{children}</div>}
    </div>
  )
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-faint)', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>{children}</div>
}

function FieldLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>{children}</div>
}

// ── Status Dropdown ───────────────────────────────────────────────────────────
// Design: neutral rectangle container, coloured oval pill centered inside,
// chevron outside the pill on the right — matching the admin Status page.
// Dropdown items use the same oval pill style as the admin list.
function StatusDropdown({ statuses, currentStatus, onSelect, canChange }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    function h(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const current = statuses.find(s => s.slug === currentStatus) || null

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {/* ── Trigger button ──
          Rectangle: neutral grey background, border, full width.
          Inside: pill centered + chevron outside to the right. */}
      <button
        onClick={() => canChange && setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px',
          borderRadius: 6,
          border: '1.5px solid var(--border)',
          background: '#F4F5F7',
          cursor: canChange ? 'pointer' : 'default',
          fontFamily: 'inherit',
          transition: 'border-color .15s, background .15s',
        }}
        onMouseEnter={e => { if (canChange) { e.currentTarget.style.borderColor = '#B3BAC5'; e.currentTarget.style.background = '#EBECF0' } }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = '#F4F5F7' }}
      >
        {/* Pill — centered in the rectangle */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          {current ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '4px 14px', borderRadius: 20,
              fontSize: 12, fontWeight: 600,
              background: current.colour_hex,
              color: current.text_colour,
              letterSpacing: '0.02em',
            }}>
              {current.name}
            </span>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic' }}>
              {currentStatus?.replace(/_/g, ' ') || 'Unknown'}
            </span>
          )}
        </div>
        {/* Chevron — outside the pill, right side */}
        {canChange && (
          <span style={{
            fontSize: 12, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform .2s', display: 'inline-block',
          }}>▾</span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {open && canChange && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: '#fff', border: '1.5px solid var(--border)',
          borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          zIndex: 200, overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 14px 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            Change Status
          </div>
          {statuses.map((s, idx) => (
            <div key={s.id}
              onClick={() => { onSelect(s.slug); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 14px', cursor: 'pointer',
                borderBottom: idx < statuses.length - 1 ? '1px solid var(--border)' : 'none',
                background: currentStatus === s.slug ? '#F4F5F7' : '#fff',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F4F5F7'}
              onMouseLeave={e => e.currentTarget.style.background = currentStatus === s.slug ? '#F4F5F7' : '#fff'}
            >
              {/* Same oval pill as admin Status Management page */}
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '4px 14px', borderRadius: 20,
                fontSize: 12, fontWeight: 600,
                background: s.colour_hex, color: s.text_colour,
              }}>
                {s.name}
              </span>
              {currentStatus === s.slug && (
                <span style={{ fontSize: 14, color: s.colour_hex, fontWeight: 700 }}>✓</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── renderCommentBody — parses stored markup and renders @mentions as pills ───
function renderCommentBody(body) {
  if (!body) return null
  const parts = []
  const regex = /@\[([^\]]+)\]\((user|group):(\d+)\)/g
  let last = 0, match
  while ((match = regex.exec(body)) !== null) {
    if (match.index > last) parts.push(body.slice(last, match.index))
    const [, name, type] = match
    parts.push(
      <span key={match.index} style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 8px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: type === 'group' ? '#EAE6FF' : '#DEEBFF', color: type === 'group' ? '#403294' : '#0052CC', margin: '0 2px' }}>
        @{name}
      </span>
    )
    last = regex.lastIndex
  }
  if (last < body.length) parts.push(body.slice(last))
  return parts
}

// ── MentionCommentBox ─────────────────────────────────────────────────────────
function MentionCommentBox({ onSave, isSaving }) {
  const editorRef    = useRef(null)
  const searchTimer  = useRef(null)
  const mentionState = useRef({ active: false, startNode: null, startOffset: 0, query: '' })

  const [mentionOpen,    setMentionOpen]    = useState(false)
  const [mentionResults, setMentionResults] = useState([])
  const [mentionIndex,   setMentionIndex]   = useState(0)
  const [dropdownStyle,  setDropdownStyle]  = useState({})
  const [isEmpty,        setIsEmpty]        = useState(true)

  function serialise() {
    const el = editorRef.current
    if (!el) return { body: '', mentionIds: [] }
    const mentionIds = []
    let body = ''
    el.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        body += node.textContent
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const dataset = node.dataset
        if (dataset.mentionType && dataset.mentionId && dataset.mentionName) {
          body += `@[${dataset.mentionName}](${dataset.mentionType}:${dataset.mentionId})`
          if (dataset.mentionType === 'user') mentionIds.push(parseInt(dataset.mentionId))
        } else if (node.tagName === 'BR') {
          body += '\n'
        } else {
          body += node.textContent
        }
      }
    })
    return { body: body.trim(), mentionIds }
  }

  function checkEmpty() {
    const el = editorRef.current
    if (!el) return
    setIsEmpty((el.innerText || '').trim() === '')
  }

  function getCaretRect() {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return null
    const range = sel.getRangeAt(0).cloneRange()
    range.collapse(true)
    const rects = range.getClientRects()
    if (rects.length > 0) return rects[0]
    const span = document.createElement('span')
    span.textContent = '\u200B'
    range.insertNode(span)
    const rect = span.getBoundingClientRect()
    span.parentNode.removeChild(span)
    return rect
  }

  function positionDropdown() {
    const caretRect = getCaretRect()
    if (!caretRect) return
    const ddWidth = 300, ddHeight = 340, margin = 8
    const vw = window.innerWidth, vh = window.innerHeight
    let left = caretRect.right + 8
    let top  = caretRect.top
    if (left + ddWidth > vw - margin) left = caretRect.left - ddWidth - 8
    if (left < margin) left = margin
    if (top + ddHeight > vh - margin) top = caretRect.bottom - ddHeight
    if (top < margin) top = margin
    setDropdownStyle({ top, left, width: ddWidth })
  }

  function triggerSearch(query) {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      try {
        const res  = await groupsAPI.search(query)
        const data = res.data?.results ?? res.data ?? []
        setMentionResults(Array.isArray(data) ? data : [])
        setMentionIndex(0)
      } catch { setMentionResults([]) }
    }, 150)
  }

  function insertMention(result) {
    const el = editorRef.current
    if (!el) return
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range     = sel.getRangeAt(0)
    const startNode = mentionState.current.startNode
    const startOff  = mentionState.current.startOffset
    if (startNode && startNode.parentNode) {
      const deleteRange = document.createRange()
      deleteRange.setStart(startNode, startOff)
      deleteRange.setEnd(range.endContainer, range.endOffset)
      deleteRange.deleteContents()
    }
    const chip = document.createElement('span')
    chip.contentEditable = 'false'
    chip.dataset.mentionType = result.type
    chip.dataset.mentionId   = result.id
    chip.dataset.mentionName = result.name
    chip.textContent = `@${result.name}`
    chip.style.cssText = [
      'display:inline-flex', 'align-items:center',
      'padding:1px 8px', 'border-radius:20px',
      'font-size:12px', 'font-weight:600',
      'margin:0 2px', 'cursor:default', 'user-select:all',
      result.type === 'group' ? 'background:#EAE6FF;color:#403294' : 'background:#DEEBFF;color:#0052CC',
    ].join(';')
    const space    = document.createTextNode('\u00A0')
    const newRange = window.getSelection().getRangeAt(0)
    newRange.insertNode(space)
    newRange.insertNode(chip)
    const afterRange = document.createRange()
    afterRange.setStartAfter(space)
    afterRange.collapse(true)
    sel.removeAllRanges()
    sel.addRange(afterRange)
    setMentionOpen(false)
    mentionState.current = { active: false, startNode: null, startOffset: 0, query: '' }
    checkEmpty()
    el.focus()
  }

  function handleInput() {
    checkEmpty()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range  = sel.getRangeAt(0)
    const node   = range.startContainer
    const offset = range.startOffset
    if (node.nodeType !== Node.TEXT_NODE) { setMentionOpen(false); return }
    const textBefore = node.textContent.slice(0, offset)
    const atMatch    = textBefore.match(/@([^@]*)$/)
    if (atMatch) {
      const query = atMatch[1]
      if (!mentionState.current.active) {
        mentionState.current = { active: true, startNode: node, startOffset: offset - atMatch[0].length, query }
      } else {
        mentionState.current.query = query
      }
      setMentionOpen(true)
      triggerSearch(query)
      requestAnimationFrame(positionDropdown)
    } else {
      setMentionOpen(false)
      mentionState.current.active = false
    }
  }

  function handleKeyDown(e) {
    if (mentionOpen && mentionResults.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, mentionResults.length - 1)); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); if (mentionResults[mentionIndex]) insertMention(mentionResults[mentionIndex]); return }
      if (e.key === 'Escape')    { setMentionOpen(false); return }
    }
    if (e.key === 'Enter' && !e.shiftKey && !mentionOpen) { e.preventDefault(); handleSave() }
  }

  function handleSave() {
    const { body, mentionIds } = serialise()
    if (!body) return
    onSave(body, mentionIds)
    if (editorRef.current) { editorRef.current.innerHTML = ''; setIsEmpty(true) }
  }

  function handleClear() {
    if (editorRef.current) { editorRef.current.innerHTML = ''; setIsEmpty(true) }
    setMentionOpen(false)
  }

  function insertAtSign() {
    const el = editorRef.current
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    const text  = document.createTextNode('@')
    range.insertNode(text)
    range.setStartAfter(text)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
    handleInput()
  }

  useEffect(() => {
    function h(e) { if (editorRef.current && !editorRef.current.contains(e.target)) setMentionOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function renderAvatar(result) {
    if (result.type === 'group') return <div style={{ width: 28, height: 28, borderRadius: 5, background: '#EAE6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{result.icon || '👥'}</div>
    const initials = (result.name || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    return <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#DEEBFF', color: '#0052CC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10, flexShrink: 0 }}>{initials}</div>
  }

  return (
    <>
      <div style={{ border: '1.5px solid var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: 16, background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '6px 10px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', flexWrap: 'wrap' }}>
          {[{ label: 'B', s: { fontWeight: 'bold' } }, { label: 'I', s: { fontStyle: 'italic' } }, { label: 'U', s: { textDecoration: 'underline' } }].map(btn => (
            <button key={btn.label} style={{ width: 26, height: 26, border: 'none', background: 'none', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', ...btn.s }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >{btn.label}</button>
          ))}
          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 3px' }} />
          {['☰', '</>', '🔗'].map(icon => (
            <button key={icon} style={{ width: 26, height: 26, border: 'none', background: 'none', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >{icon}</button>
          ))}
          <button onClick={insertAtSign} title="Mention someone (@)"
            style={{ width: 26, height: 26, border: 'none', background: 'none', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--brand)', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >@</button>
        </div>
        <div style={{ position: 'relative' }}>
          <div ref={editorRef} contentEditable suppressContentEditableWarning
            onInput={handleInput} onKeyDown={handleKeyDown}
            style={{ minHeight: 80, padding: '10px 12px', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', lineHeight: 1.6, outline: 'none', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
          />
          {isEmpty && (
            <div style={{ position: 'absolute', top: '10px', left: '12px', fontSize: 13, color: 'var(--text-faint)', pointerEvents: 'none', userSelect: 'none' }}>
              Add a comment… type @ to mention someone
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 15, cursor: 'pointer', padding: 4 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >📎</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleClear} style={{ background: 'none', border: '1.5px solid var(--border)', color: 'var(--text)', borderRadius: 4, padding: '6px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >Cancel</button>
            <button onClick={handleSave} disabled={isEmpty || isSaving}
              style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 4, padding: '7px 16px', fontSize: 13, fontWeight: 500, cursor: isEmpty ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: isEmpty ? 0.5 : 1 }}
              onMouseEnter={e => { if (!isEmpty) e.currentTarget.style.background = 'var(--brand-hover)' }}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
            >{isSaving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </div>
      {mentionOpen && (
        <div style={{ position: 'fixed', top: dropdownStyle.top, left: dropdownStyle.left, width: dropdownStyle.width || 300, background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.16)', zIndex: 9999, overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Mention</span>
            {mentionState.current.query && <span style={{ fontSize: 11, fontWeight: 500, color: '#0052CC', background: '#DEEBFF', padding: '1px 7px', borderRadius: 10, textTransform: 'none', letterSpacing: 0 }}>"{mentionState.current.query}"</span>}
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {mentionResults.length === 0 ? (
              <div style={{ padding: '16px 14px', fontSize: 13, color: 'var(--text-faint)', textAlign: 'center' }}>
                {mentionState.current.query ? `No matches for "${mentionState.current.query}"` : 'Type to search…'}
              </div>
            ) : mentionResults.map((result, idx) => (
              <div key={result.type + '-' + result.id}
                onMouseDown={e => { e.preventDefault(); insertMention(result) }}
                onMouseEnter={() => setMentionIndex(idx)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', borderBottom: idx < mentionResults.length - 1 ? '1px solid var(--border)' : 'none', background: idx === mentionIndex ? 'var(--surface-2)' : '#fff', transition: 'background .1s' }}
              >
                {renderAvatar(result)}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.name}</div>
                  {result.type === 'group' && result.description && <div style={{ fontSize: 11, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.description}</div>}
                  {result.type === 'user' && result.designation && <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{result.designation}</div>}
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, flexShrink: 0, padding: '2px 7px', borderRadius: 4, background: result.type === 'group' ? '#EAE6FF' : '#DEEBFF', color: result.type === 'group' ? '#403294' : '#0052CC' }}>
                  {result.type === 'group' ? 'Group' : 'Person'}
                </span>
              </div>
            ))}
          </div>
          <div style={{ padding: '5px 14px', fontSize: 10, color: 'var(--text-faint)', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', gap: 14 }}>
            <span>↑↓ navigate</span><span>↵ select</span><span>Esc close</span>
          </div>
        </div>
      )}
    </>
  )
}

export default function TicketDetailPage() {
  const { id }              = useParams()
  const navigate            = useNavigate()
  const { user, isManager } = useAuth()
  const queryClient         = useQueryClient()

  const [assigneeOpen,    setAssigneeOpen]    = useState(false)
  const [assigneeSearch,  setAssigneeSearch]  = useState('')
  const [assigneeResults, setAssigneeResults] = useState([])
  const [activeTab,       setActiveTab]       = useState('all')

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn:  () => ticketsAPI.get(id).then(r => r.data),
  })

  const { data: statusesData } = useQuery({
    queryKey: ['statuses'],
    queryFn:  () => statusAPI.list().then(r => r.data.results || r.data),
  })
  const statuses = statusesData || []

  const claimMutation   = useMutation({ mutationFn: () => ticketsAPI.claim(id), onSuccess: () => queryClient.invalidateQueries(['ticket', id]) })
  const statusMutation  = useMutation({ mutationFn: (s) => ticketsAPI.changeStatus(id, s), onSuccess: () => queryClient.invalidateQueries(['ticket', id]) })
  const assignMutation  = useMutation({ mutationFn: (data) => ticketsAPI.assign(id, data), onSuccess: () => { queryClient.invalidateQueries(['ticket', id]); setAssigneeOpen(false) } })
  const commentMutation = useMutation({
    mutationFn: ({ body, mentionIds }) => ticketsAPI.addComment(id, body, mentionIds),
    onSuccess:  () => queryClient.invalidateQueries(['ticket', id]),
  })

  async function searchAssignees(q) {
    setAssigneeSearch(q)
    if (!q.trim()) { setAssigneeResults([]); return }
    const res = await groupsAPI.search(q)
    setAssigneeResults(res.data?.results ?? res.data ?? [])
  }

  function selectAssignee(result) {
    if (result.type === 'group') {
      assignMutation.mutate({ assigned_group_id: result.id, assigned_user_id: null })
    } else {
      const groupId = result.groups?.[0]?.id
      if (groupId) assignMutation.mutate({ assigned_group_id: groupId, assigned_user_id: result.id })
    }
    setAssigneeOpen(false); setAssigneeSearch(''); setAssigneeResults([])
  }

  if (isLoading) return <div className="page-loader"><div className="spinner spinner-lg" /></div>
  if (!ticket)   return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Ticket not found.</div>

  const canClaim  = !ticket.is_locked
  const canAssign = isManager
  const canStatus = isManager || ticket.assigned_user?.id === user?.id

  const comments = ticket.comments || []
  const feed = activeTab === 'comments' ? comments
    : activeTab === 'history' ? []
    : [...comments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  const u = ticket.urgency ? (URGENCY_STYLES[ticket.urgency] || {}) : null

  const createdAt = new Date(ticket.created_at)
  const now       = new Date()
  const elapsedH  = Math.floor((now - createdAt) / (1000 * 60 * 60))
  const elapsedD  = Math.floor(elapsedH / 24)
  const slaStatus = ticket.status === 'resolved' ? 'ok' : ticket.status === 'escalated' ? 'overdue' : elapsedD >= 2 ? 'warning' : 'ok'
  const slaColour = { ok: '#006644', warning: '#974F0C', overdue: '#DE350B' }

  const labels      = ticket.ticket_labels?.map(tl => tl.label).filter(Boolean) || []
  const outbound    = ticket.outbound_links  || []
  const inbound     = ticket.inbound_links   || []
  const linkedItems = [...outbound, ...inbound]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* TOP BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 28px', background: '#fff', borderBottom: '1px solid var(--border)', flexShrink: 0, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1.5px solid var(--border)', color: 'var(--text-muted)', borderRadius: 4, padding: '6px 12px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >← Back</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#DEEBFF', color: 'var(--brand)', borderRadius: 4, padding: '5px 12px', fontSize: 13, fontWeight: 700 }}>
            {ticket.group?.icon} {ticket.key}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {canClaim && (
            <button onClick={() => claimMutation.mutate()} disabled={claimMutation.isPending}
              style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 4, padding: '7px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
            >{claimMutation.isPending ? 'Claiming...' : 'Assign to me'}</button>
          )}
          {['👁', '🔗', '⋯'].map(icon => (
            <button key={icon} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 4, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--text-muted)', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >{icon}</button>
          ))}
        </div>
      </div>

      {/* BODY */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* LEFT PANEL */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/')} onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>Home</span>
            <span style={{ margin: '0 4px' }}>›</span>
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/my-tickets')} onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>My Tickets</span>
            <span style={{ margin: '0 4px' }}>›</span>
            <span>{ticket.key}</span>
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 6, lineHeight: 1.3 }}>
            <span style={{ color: 'var(--brand)', fontWeight: 700 }}>{ticket.key}</span>{' — '}{ticket.summary}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>{ticket.group?.icon} <strong>{ticket.group?.name}</strong></span>
            <span>•</span>
            <span>☑ {ticket.work_type?.replace(/_/g, ' ')}</span>
            <span>•</span>
            <span>Created <strong>{new Date(ticket.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, {new Date(ticket.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</strong></span>
            <span>•</span>
            <span>Updated <strong>{new Date(ticket.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, {new Date(ticket.updated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</strong></span>
          </div>

          <DetailCard title="Description" defaultOpen={true}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', background: 'var(--surface-2)', borderRadius: 4, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: '#FFC400', color: '#172B4D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>
                {ticket.reporter?.first_name?.[0]}{ticket.reporter?.last_name?.[0]}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{ticket.reporter?.full_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Raised this request via Portal · {new Date(ticket.created_at).toLocaleString('en-GB')}</div>
              </div>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>
              {ticket.description || <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>No description provided.</span>}
            </p>
          </DetailCard>

          <DetailCard title="Attachments" count={ticket.attachments?.length || 0} defaultOpen={true}>
            {ticket.attachments?.length > 0 ? (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {ticket.attachments.map(att => (
                  <a key={att.id} href={att.file} target="_blank" rel="noreferrer"
                    style={{ border: '1.5px solid var(--border)', borderRadius: 4, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, background: '#FAFBFC', textDecoration: 'none', minWidth: 200, transition: 'border-color .15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <span style={{ fontSize: 22 }}>📎</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{att.original_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{Math.round(att.file_size / 1024)} KB · {new Date(att.uploaded_at).toLocaleDateString('en-GB')}</div>
                    </div>
                  </a>
                ))}
              </div>
            ) : <p style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic', margin: 0 }}>No attachments yet.</p>}
          </DetailCard>

          <DetailCard title="Linked Work Items" count={linkedItems.length} defaultOpen={false}>
            {linkedItems.length > 0 ? linkedItems.map(link => {
              const isOutbound    = outbound.includes(link)
              const linkedKey     = isOutbound ? link.target_ticket : link.source_ticket
              const linkedSummary = isOutbound
                ? (typeof link.target_ticket === 'object' ? link.target_ticket?.summary : '')
                : (typeof link.source_ticket === 'object' ? link.source_ticket?.summary : '')
              return (
                <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>{link.relationship}</span>
                  <span style={{ color: 'var(--brand)', fontWeight: 600, flexShrink: 0, cursor: 'pointer' }}
                    onClick={() => navigate('/tickets/' + (isOutbound ? link.target_ticket?.id || link.target_ticket : link.source_ticket?.id || link.source_ticket))}
                  >{typeof linkedKey === 'object' ? linkedKey?.key : linkedKey}</span>
                  {linkedSummary && <span style={{ color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{linkedSummary}</span>}
                </div>
              )
            }) : <p style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic', margin: 0 }}>No linked items.</p>}
          </DetailCard>

          <DetailCard title="Activity" defaultOpen={true}>
            <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 16 }}>
              {[['all', 'All'], ['comments', 'Comments'], ['history', 'History']].map(([tab, label]) => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '8px 16px', fontSize: 13, fontWeight: activeTab === tab ? 600 : 500, color: activeTab === tab ? 'var(--brand)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === tab ? '2px solid var(--brand)' : '2px solid transparent', marginBottom: -2, fontFamily: 'inherit' }}>{label}</button>
              ))}
            </div>

            <MentionCommentBox
              onSave={(body, mentionIds) => commentMutation.mutate({ body, mentionIds })}
              isSaving={commentMutation.isPending}
            />

            {feed.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: '16px 0' }}>No activity yet</p>
            ) : feed.map(item => (
              <div key={item.id} style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, marginTop: 2, background: '#DEEBFF', color: '#0747A6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>
                  {item.author?.first_name?.[0]}{item.author?.last_name?.[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.author?.full_name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{new Date(item.created_at).toLocaleString('en-GB')}</span>
                  </div>
                  <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 4, padding: '12px 14px', fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                    {renderCommentBody(item.body)}
                  </div>
                </div>
              </div>
            ))}
          </DetailCard>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ width: 280, flexShrink: 0, borderLeft: '1px solid var(--border)', background: '#fff', overflowY: 'auto', padding: '20px 18px' }}>

          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-faint)', marginBottom: 10 }}>SLA</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Time to first response</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#006644' }}>✓ Met</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Time to resolution</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: slaColour[slaStatus] }}>
                {ticket.status === 'resolved' ? '✓ Met' : elapsedD > 0 ? elapsedD + 'd ' + (elapsedH % 24) + 'h elapsed' : elapsedH + 'h elapsed'}
              </span>
            </div>
          </div>

          {/* People */}
          <div style={{ marginBottom: 16 }}>
            <SectionTitle>People</SectionTitle>
            <div style={{ marginBottom: 12 }}>
              <FieldLabel>Reporter</FieldLabel>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: '#FFC400', color: '#172B4D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                  {ticket.reporter?.first_name?.[0]}{ticket.reporter?.last_name?.[0]}
                </div>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{ticket.reporter?.full_name}</span>
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <FieldLabel>Assignee</FieldLabel>
              <div onClick={() => canAssign && setAssigneeOpen(!assigneeOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 4, margin: '-5px -8px', cursor: canAssign ? 'pointer' : 'default', transition: 'background .13s' }}
                onMouseEnter={e => { if (canAssign) e.currentTarget.style.background = 'var(--surface-2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                {ticket.assigned_user ? (
                  <>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: '#DEEBFF', color: '#0747A6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                      {ticket.assigned_user.first_name?.[0]}{ticket.assigned_user.last_name?.[0]}
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text)' }}>{ticket.assigned_user.full_name}</span>
                  </>
                ) : <span style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic' }}>Unassigned</span>}
                {canAssign && <span style={{ marginLeft: 'auto', color: 'var(--text-faint)', fontSize: 11 }}>▾</span>}
              </div>
              {canAssign && (
                <button onClick={() => selectAssignee({ type: 'user', id: user.id, name: user.full_name, groups: ticket.assigned_group ? [ticket.assigned_group] : [] })}
                  style={{ fontSize: 11, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, padding: 0, fontFamily: 'inherit', display: 'block' }}
                >Assign to me</button>
              )}
              {assigneeOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setAssigneeOpen(false)} />
                  <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1.5px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow-md)', zIndex: 100, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                      <input autoFocus type="text" placeholder="Search people..." value={assigneeSearch}
                        onChange={e => searchAssignees(e.target.value)} onClick={e => e.stopPropagation()}
                        style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '1.5px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', outline: 'none', backgroundColor: '#fff' }}
                        onFocus={e => e.target.style.borderColor = '#4C9AFF'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'}
                      />
                    </div>
                    <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                      <div onClick={() => selectAssignee({ type: 'user', id: user.id, name: user.full_name, groups: ticket.assigned_group ? [ticket.assigned_group] : [] })}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: '#FFC400', color: '#172B4D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>
                          {user?.first_name?.[0]}{user?.last_name?.[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.first_name} {user?.last_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Assign to me</div>
                        </div>
                      </div>
                      {assigneeResults.map(result => (
                        <div key={result.type + '-' + result.id} onClick={() => selectAssignee(result)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          {result.type === 'group'
                            ? <span style={{ fontSize: 18 }}>{result.icon}</span>
                            : <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: '#DEEBFF', color: '#0747A6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>{result.name?.[0]}</div>
                          }
                          <span style={{ fontSize: 13 }}>{result.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── STATUS — below People ── */}
          {statuses.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ height: 1, background: 'var(--border)', marginBottom: 14 }} />
              <SectionTitle>Status</SectionTitle>
              <StatusDropdown
                statuses={statuses}
                currentStatus={ticket.status}
                onSelect={(slug) => statusMutation.mutate(slug)}
                canChange={canStatus}
              />
            </div>
          )}

          <div style={{ height: 1, background: 'var(--border)', margin: '0 0 14px' }} />

          {/* Details */}
          <div style={{ marginBottom: 16 }}>
            <SectionTitle>Details</SectionTitle>
            <div style={{ marginBottom: 12 }}>
              <FieldLabel>Priority</FieldLabel>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)' }}>
                {PRIORITY_ICONS[ticket.priority]}
                {ticket.priority ? ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1) : '—'}
              </div>
            </div>
            {ticket.urgency && u && (
              <div style={{ marginBottom: 12 }}>
                <FieldLabel>Urgency</FieldLabel>
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', background: u.bg, color: u.color, border: '1.5px solid ' + u.border }}>
                  {ticket.urgency.charAt(0).toUpperCase() + ticket.urgency.slice(1)}
                </span>
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <FieldLabel>Work Type</FieldLabel>
              <div style={{ fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                ☑ {ticket.work_type ? ticket.work_type.replace(/_/g, ' ') : '—'}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <FieldLabel>Department</FieldLabel>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>{ticket.group?.icon} {ticket.group?.name || '—'}</div>
            </div>
            {ticket.components && (
              <div style={{ marginBottom: 12 }}>
                <FieldLabel>Component</FieldLabel>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>{ticket.components}</div>
              </div>
            )}
            {labels.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <FieldLabel>Label</FieldLabel>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {labels.map(label => (
                    <span key={label.id} style={{ display: 'inline-flex', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: (label.colour_hex || '#0052CC') + '22', color: label.colour_hex || '#0052CC' }}>{label.name}</span>
                  ))}
                </div>
              </div>
            )}
            {ticket.due_date && (
              <div style={{ marginBottom: 12 }}>
                <FieldLabel>Due Date</FieldLabel>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>
                  {new Date(ticket.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}