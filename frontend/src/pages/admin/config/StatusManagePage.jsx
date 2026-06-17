import ConfigManagePage from './ConfigManagePage'
import { statusAPI } from '../../../api/config'

const FIELDS = [
  { key: 'name',        label: 'Name',        required: true,  placeholder: 'e.g. In Review' },
  { key: 'slug',        label: 'Slug',         required: true,  placeholder: 'e.g. in_review', hint: 'Unique identifier. Use lowercase letters and underscores only.' },
  { key: 'colour_hex',  label: 'Background Colour', type: 'color', default: '#F1F2F4' },
  { key: 'text_colour', label: 'Text Colour',  type: 'color', default: '#172B4D' },
  { key: 'description', label: 'Description',  type: 'textarea', placeholder: 'Optional description' },
  { key: 'order',       label: 'Order',        type: 'number', default: 0, hint: 'Lower number appears first.' },
  { key: 'is_active',   label: 'Status',       type: 'toggle', default: true },
]

const COLUMNS = [
  {
    header: 'Name',
    render: (item) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: item.colour_hex, color: item.text_colour }}>
          {item.name}
        </span>
      </div>
    ),
  },
  { header: 'Slug',  render: (item) => <code style={{ fontSize: 12, background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 3 }}>{item.slug}</code> },
  { header: 'Order', render: (item) => <span style={{ color: 'var(--text-muted)' }}>{item.order}</span> },
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

export default function StatusManagePage() {
  return (
    <ConfigManagePage
      title="Status Management"
      queryKey="config-statuses"
      api={statusAPI}
      fields={FIELDS}
      columns={COLUMNS}
      breadcrumb="Admin › Status Management"
    />
  )
}