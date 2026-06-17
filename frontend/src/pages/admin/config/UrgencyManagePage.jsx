import ConfigManagePage from './ConfigManagePage'
import { urgencyAPI } from '../../../api/config'

const FIELDS = [
  { key: 'name',        label: 'Name',             required: true, placeholder: 'e.g. Critical' },
  { key: 'slug',        label: 'Slug',              required: true, placeholder: 'e.g. critical', hint: 'Unique identifier. Lowercase and underscores only.' },
  { key: 'colour_hex',  label: 'Background Colour', type: 'color', default: '#F1F2F4' },
  { key: 'text_colour', label: 'Text Colour',       type: 'color', default: '#172B4D' },
  { key: 'border_hex',  label: 'Border Colour',     type: 'color', default: '#DFE1E6' },
  { key: 'description', label: 'Description',       type: 'textarea', placeholder: 'Describe when this urgency level applies' },
  { key: 'order',       label: 'Order',             type: 'number', default: 0 },
  { key: 'is_active',   label: 'Status',            type: 'toggle', default: true },
]

const COLUMNS = [
  {
    header: 'Urgency',
    render: (item) => (
      <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: item.colour_hex, color: item.text_colour, border: `1.5px solid ${item.border_hex}` }}>
        {item.name}
      </span>
    ),
  },
  {
    header: 'Slug',
    render: (item) => <code style={{ fontSize: 12, background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 3 }}>{item.slug}</code>,
  },
  {
    header: 'Description',
    render: (item) => <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.description || '—'}</span>,
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

export default function UrgencyManagePage() {
  return (
    <ConfigManagePage
      title="Urgency Management"
      queryKey="config-urgencies"
      api={urgencyAPI}
      fields={FIELDS}
      columns={COLUMNS}
      breadcrumb="Admin › Urgency Management"
    />
  )
}