import ConfigManagePage from './ConfigManagePage'
import { priorityAPI } from '../../../api/config'

// ── SVG Priority Icons — matching TicketDetailPage exactly ───────────────────
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

const FIELDS = [
  { key: 'name',       label: 'Name',    required: true, placeholder: 'e.g. Critical'  },
  { key: 'slug',       label: 'Slug',    required: true, placeholder: 'e.g. critical',
    hint: 'Unique identifier. Lowercase and underscores only. Use: highest, high, medium, low, lowest' },
  { key: 'colour_hex', label: 'Colour',  type: 'color',  default: '#DFE1E6' },
  { key: 'level',      label: 'Level',   type: 'number', default: 1, min: 1,
    hint: 'Lower number = higher priority (1 = highest).' },
  { key: 'is_active',  label: 'Status',  type: 'toggle', default: true },
]

const COLUMNS = [
  {
    header: 'Priority',
    render: (item) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <PriorityIcon slug={item.slug} colour={item.colour_hex} />
        <span style={{ fontSize: 13, fontWeight: 600, color: item.colour_hex || 'var(--text)' }}>
          {item.name}
        </span>
      </div>
    ),
  },
  {
    header: 'Slug',
    render: (item) => (
      <code style={{ fontSize: 12, background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 3 }}>
        {item.slug}
      </code>
    ),
  },
  {
    header: 'Level',
    render: (item) => <span style={{ color: 'var(--text-muted)' }}>{item.level}</span>,
  },
  {
    header: 'Status',
    render: (item) => (
      <span style={{ fontSize: 12, fontWeight: 600, color: item.is_active ? '#006644' : '#BF2600', display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.is_active ? '#36B37E' : '#FF5630', display: 'inline-block' }} />
        {item.is_active ? 'Active' : 'Inactive'}
      </span>
    ),
  },
]

export default function PriorityManagePage() {
  return (
    <ConfigManagePage
      title="Priority Management"
      queryKey="config-priorities"
      api={priorityAPI}
      fields={FIELDS}
      columns={COLUMNS}
      breadcrumb="Admin › Priority Management"
    />
  )
}