import ConfigManagePage from './ConfigManagePage'
import { ticketsAPI } from '../../../api/tickets'

const labelAPI = {
  list:   ()         => ticketsAPI.listLabels(),
  create: (data)     => ticketsAPI.createLabel(data),
  update: (id, data) => ticketsAPI.updateLabel(id, data),
  delete: (id)       => ticketsAPI.deleteLabel(id),
}

const FIELDS = [
  { key: 'name',       label: 'Name',       required: true, placeholder: 'e.g. Bug' },
  { key: 'colour_hex', label: 'Colour',     type: 'color', default: '#0052CC' },
  { key: 'is_active',  label: 'Status',     type: 'toggle', default: true },
]

const COLUMNS = [
  {
    header: 'Label',
    render: (item) => (
      <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: (item.colour_hex || '#0052CC') + '22', color: item.colour_hex || '#0052CC' }}>
        {item.name}
      </span>
    ),
  },
  {
    header: 'Colour',
    render: (item) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: item.colour_hex || '#0052CC', border: '1px solid var(--border)' }} />
        <code style={{ fontSize: 12 }}>{item.colour_hex}</code>
      </div>
    ),
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

export default function LabelManagePage() {
  return (
    <ConfigManagePage
      title="Label Management"
      queryKey="config-labels"
      api={labelAPI}
      fields={FIELDS}
      columns={COLUMNS}
      breadcrumb="Admin › Label Management"
    />
  )
}