import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'crm_activities'
const ACTIVITY_TYPES = [
  { id: 'call', icon: '📞', label: 'Call', color: '#3b82f6' },
  { id: 'email', icon: '📧', label: 'Email', color: '#8b5cf6' },
  { id: 'meeting', icon: '🤝', label: 'Meeting', color: '#06b6d4' },
  { id: 'note', icon: '📝', label: 'Note', color: '#f59e0b' },
  { id: 'whatsapp', icon: '💬', label: 'WhatsApp', color: '#22c55e' },
  { id: 'site_visit', icon: '🏗', label: 'Site Visit', color: '#ef7d34' },
]

function loadActivities() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveActivities(activities) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(activities))
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function groupByDate(activities) {
  const groups = {}
  activities.forEach((a) => {
    const date = new Date(a.createdAt).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    if (!groups[date]) groups[date] = []
    groups[date].push(a)
  })
  return groups
}

export function CrmActivity() {
  const [activities, setActivities] = useState(loadActivities)
  const [showForm, setShowForm] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [form, setForm] = useState({
    type: 'call',
    contactName: '',
    summary: '',
    details: '',
  })

  useEffect(() => {
    saveActivities(activities)
  }, [activities])

  const filtered = useMemo(() => {
    let list = [...activities].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    if (typeFilter) list = list.filter((a) => a.type === typeFilter)
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase()
      list = list.filter(
        (a) =>
          a.contactName.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          (a.details && a.details.toLowerCase().includes(q)),
      )
    }
    return list
  }, [activities, typeFilter, searchFilter])

  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  const typeCounts = useMemo(() => {
    const counts = {}
    ACTIVITY_TYPES.forEach((t) => (counts[t.id] = 0))
    activities.forEach((a) => {
      if (counts[a.type] !== undefined) counts[a.type]++
    })
    return counts
  }, [activities])

  function handleAdd(e) {
    e.preventDefault()
    const activity = {
      id: generateId(),
      type: form.type,
      contactName: form.contactName,
      summary: form.summary,
      details: form.details,
      createdAt: new Date().toISOString(),
    }
    setActivities((prev) => [activity, ...prev])
    setForm({ type: 'call', contactName: '', summary: '', details: '' })
    setShowForm(false)
  }

  function deleteActivity(id) {
    setActivities((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="crm-activity-root">
      {/* Type Stats */}
      <div className="crm-activity-type-stats">
        {ACTIVITY_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`crm-activity-type-chip ${typeFilter === t.id ? 'crm-activity-type-chip-active' : ''}`}
            style={{ '--type-color': t.color }}
            onClick={() => setTypeFilter(typeFilter === t.id ? '' : t.id)}
          >
            <span>{t.icon}</span>
            <span className="crm-activity-type-label">{t.label}</span>
            <span className="crm-activity-type-count">{typeCounts[t.id]}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="crm-toolbar">
        <input
          className="crm-search-input"
          placeholder="Search activities..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
        />
        <div className="crm-toolbar-actions">
          <button className="button-primary" onClick={() => setShowForm(true)} type="button">+ Log Activity</button>
        </div>
      </div>

      {/* Counter */}
      <p className="crm-counter">{filtered.length} activit{filtered.length !== 1 ? 'ies' : 'y'}</p>

      {/* Timeline */}
      <div className="crm-timeline">
        {Object.keys(grouped).length === 0 ? (
          <div className="crm-empty-text" style={{ padding: '3rem', textAlign: 'center' }}>
            {activities.length === 0
              ? 'No activities logged yet. Click "+ Log Activity" to start.'
              : 'No activities match your filters.'}
          </div>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="crm-timeline-group">
              <div className="crm-timeline-date">{date}</div>
              {items.map((activity) => {
                const actType = ACTIVITY_TYPES.find((t) => t.id === activity.type) || ACTIVITY_TYPES[0]
                return (
                  <div key={activity.id} className="crm-timeline-item">
                    <div className="crm-timeline-icon" style={{ background: actType.color + '22', color: actType.color }}>
                      {actType.icon}
                    </div>
                    <div className="crm-timeline-content">
                      <div className="crm-timeline-header">
                        <span className="crm-timeline-type" style={{ color: actType.color }}>{actType.label}</span>
                        <span className="crm-timeline-contact">{activity.contactName}</span>
                        <span className="crm-timeline-time">{timeAgo(activity.createdAt)}</span>
                      </div>
                      <div className="crm-timeline-summary">{activity.summary}</div>
                      {activity.details && (
                        <div className="crm-timeline-details">{activity.details}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="crm-timeline-delete"
                      onClick={() => deleteActivity(activity.id)}
                      title="Delete activity"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      {/* Add Activity Modal */}
      {showForm && (
        <div className="crm-overlay" onClick={(e) => { if (e.target.classList.contains('crm-overlay')) setShowForm(false) }}>
          <div className="crm-modal">
            <div className="crm-modal-header">
              <h3>Log Activity</h3>
              <button onClick={() => setShowForm(false)} className="crm-modal-close">✕</button>
            </div>
            <form onSubmit={handleAdd} className="crm-modal-form">
              <div className="crm-field">
                <span>Type</span>
                <div className="crm-activity-type-picker">
                  {ACTIVITY_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`crm-activity-type-pick ${form.type === t.id ? 'crm-activity-type-pick-active' : ''}`}
                      style={{ '--type-color': t.color }}
                      onClick={() => setForm((f) => ({ ...f, type: t.id }))}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="crm-field">
                <span>Contact Name *</span>
                <input required value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} placeholder="Who was this with?" />
              </label>
              <label className="crm-field">
                <span>Summary *</span>
                <input required value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} placeholder="Brief summary" />
              </label>
              <label className="crm-field">
                <span>Details</span>
                <textarea value={form.details} onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))} placeholder="Additional details..." rows={4} />
              </label>
              <div className="crm-modal-actions">
                <button type="button" className="button-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="button-primary">Log Activity</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
