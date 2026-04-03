import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'crm_contacts'
const TAG_OPTIONS = ['Hot', 'Warm', 'Cold', 'VIP', 'Follow-up', 'Negotiating']
const TAG_COLORS = {
  Hot: { bg: '#fef2f2', fg: '#dc2626' },
  Warm: { bg: '#fffbeb', fg: '#d97706' },
  Cold: { bg: '#eff6ff', fg: '#2563eb' },
  VIP: { bg: '#faf5ff', fg: '#9333ea' },
  'Follow-up': { bg: '#ecfdf5', fg: '#059669' },
  Negotiating: { bg: '#fdf4ff', fg: '#c026d3' },
}

function loadContacts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveContacts(contacts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts))
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function getInitials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('')
}

const AVATAR_COLORS = [
  '#ef7d34', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#06b6d4', '#f59e0b', '#6366f1',
]

function avatarColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

const emptyContact = {
  name: '',
  phone: '',
  email: '',
  company: '',
  location: '',
  tags: [],
  notes: '',
}

export function CrmContacts() {
  const [contacts, setContacts] = useState(loadContacts)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ ...emptyContact })
  const [selectedContact, setSelectedContact] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  useEffect(() => {
    saveContacts(contacts)
  }, [contacts])

  const filtered = useMemo(() => {
    let list = contacts
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.company && c.company.toLowerCase().includes(q)),
      )
    }
    if (tagFilter) {
      list = list.filter((c) => c.tags?.includes(tagFilter))
    }
    return list
  }, [contacts, search, tagFilter])

  function openAdd() {
    setEditId(null)
    setForm({ ...emptyContact })
    setShowForm(true)
  }

  function openEdit(contact) {
    setEditId(contact.id)
    setForm({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || '',
      company: contact.company || '',
      location: contact.location || '',
      tags: contact.tags || [],
      notes: contact.notes || '',
    })
    setShowForm(true)
    setSelectedContact(null)
  }

  function handleSave(e) {
    e.preventDefault()
    if (editId) {
      setContacts((prev) =>
        prev.map((c) =>
          c.id === editId ? { ...c, ...form, updatedAt: new Date().toISOString() } : c,
        ),
      )
    } else {
      setContacts((prev) => [
        ...prev,
        { ...form, id: generateId(), createdAt: new Date().toISOString() },
      ])
    }
    setShowForm(false)
    setEditId(null)
    setForm({ ...emptyContact })
  }

  function handleDelete(id) {
    setContacts((prev) => prev.filter((c) => c.id !== id))
    setConfirmDeleteId(null)
    setSelectedContact(null)
  }

  function toggleTag(tag) {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }))
  }

  return (
    <div className="crm-contacts-root">
      {/* Toolbar */}
      <div className="crm-toolbar">
        <input
          className="crm-search-input"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="crm-toolbar-actions">
          <select
            className="crm-tag-filter"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          >
            <option value="">All Tags</option>
            {TAG_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button className="button-primary" onClick={openAdd} type="button">+ Add Contact</button>
        </div>
      </div>

      {/* Counter */}
      <p className="crm-counter">{filtered.length} contact{filtered.length !== 1 ? 's' : ''}</p>

      {/* Contact List */}
      <div className="crm-contact-list">
        {filtered.length === 0 ? (
          <div className="crm-empty-text" style={{ padding: '3rem', textAlign: 'center' }}>
            {contacts.length === 0
              ? 'No contacts yet. Click "+ Add Contact" to start.'
              : 'No contacts match your search.'}
          </div>
        ) : (
          filtered.map((contact) => (
            <div
              key={contact.id}
              className="crm-contact-card"
              onClick={() => setSelectedContact(contact)}
            >
              <div className="crm-contact-avatar" style={{ background: avatarColor(contact.name) }}>
                {getInitials(contact.name)}
              </div>
              <div className="crm-contact-info">
                <div className="crm-contact-name">{contact.name}</div>
                <div className="crm-contact-meta">
                  {contact.phone}
                  {contact.company && <> · {contact.company}</>}
                </div>
              </div>
              <div className="crm-contact-tags">
                {(contact.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="crm-tag"
                    style={{ background: TAG_COLORS[tag]?.bg, color: TAG_COLORS[tag]?.fg }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="crm-overlay" onClick={(e) => { if (e.target.classList.contains('crm-overlay')) setShowForm(false) }}>
          <div className="crm-modal">
            <div className="crm-modal-header">
              <h3>{editId ? 'Edit Contact' : 'New Contact'}</h3>
              <button onClick={() => setShowForm(false)} className="crm-modal-close">✕</button>
            </div>
            <form onSubmit={handleSave} className="crm-modal-form">
              <label className="crm-field">
                <span>Name *</span>
                <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" />
              </label>
              <label className="crm-field">
                <span>Phone *</span>
                <input required value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="10-digit" inputMode="numeric" />
              </label>
              <label className="crm-field">
                <span>Email</span>
                <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Optional" />
              </label>
              <label className="crm-field">
                <span>Company</span>
                <input value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} placeholder="Company name" />
              </label>
              <label className="crm-field">
                <span>Location</span>
                <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Area / City" />
              </label>
              <div className="crm-field">
                <span>Tags</span>
                <div className="crm-tag-picker">
                  {TAG_OPTIONS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`crm-tag-pick ${form.tags.includes(tag) ? 'crm-tag-pick-active' : ''}`}
                      style={{
                        '--tag-bg': TAG_COLORS[tag]?.bg,
                        '--tag-fg': TAG_COLORS[tag]?.fg,
                      }}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <label className="crm-field">
                <span>Notes</span>
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notes..." rows={3} />
              </label>
              <div className="crm-modal-actions">
                <button type="button" className="button-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="button-primary">{editId ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact Detail Modal */}
      {selectedContact && (
        <div className="crm-overlay" onClick={(e) => { if (e.target.classList.contains('crm-overlay')) setSelectedContact(null) }}>
          <div className="crm-modal crm-modal-lg">
            <div className="crm-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="crm-contact-avatar" style={{ background: avatarColor(selectedContact.name), width: 44, height: 44, fontSize: '1rem' }}>
                  {getInitials(selectedContact.name)}
                </div>
                <h3>{selectedContact.name}</h3>
              </div>
              <button onClick={() => setSelectedContact(null)} className="crm-modal-close">✕</button>
            </div>
            <div className="crm-modal-body">
              <div className="crm-detail-grid">
                <div className="crm-detail-item">
                  <span className="crm-detail-label">Phone</span>
                  <span className="crm-detail-value">{selectedContact.phone}</span>
                </div>
                <div className="crm-detail-item">
                  <span className="crm-detail-label">Email</span>
                  <span className="crm-detail-value">{selectedContact.email || '—'}</span>
                </div>
                <div className="crm-detail-item">
                  <span className="crm-detail-label">Company</span>
                  <span className="crm-detail-value">{selectedContact.company || '—'}</span>
                </div>
                <div className="crm-detail-item">
                  <span className="crm-detail-label">Location</span>
                  <span className="crm-detail-value">{selectedContact.location || '—'}</span>
                </div>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <span className="crm-detail-label">Tags</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                  {(selectedContact.tags || []).length > 0
                    ? selectedContact.tags.map((tag) => (
                        <span key={tag} className="crm-tag" style={{ background: TAG_COLORS[tag]?.bg, color: TAG_COLORS[tag]?.fg }}>
                          {tag}
                        </span>
                      ))
                    : <span className="crm-detail-value">—</span>}
                </div>
              </div>
              {selectedContact.notes && (
                <div style={{ marginTop: '1rem' }}>
                  <span className="crm-detail-label">Notes</span>
                  <p className="crm-detail-value" style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>{selectedContact.notes}</p>
                </div>
              )}
              <div style={{ marginTop: '0.75rem' }}>
                <span className="crm-detail-label">Added</span>
                <span className="crm-detail-value" style={{ marginLeft: '0.5rem' }}>
                  {selectedContact.createdAt ? new Date(selectedContact.createdAt).toLocaleDateString() : '—'}
                </span>
              </div>
            </div>
            <div className="crm-modal-actions">
              {confirmDeleteId === selectedContact.id ? (
                <button type="button" className="crm-delete-btn crm-delete-confirm" onClick={() => handleDelete(selectedContact.id)}>Confirm Delete</button>
              ) : (
                <button type="button" className="crm-delete-btn" onClick={() => setConfirmDeleteId(selectedContact.id)}>🗑 Delete</button>
              )}
              <button type="button" className="button-secondary" onClick={() => openEdit(selectedContact)}>✏ Edit</button>
              <button type="button" className="button-secondary" onClick={() => setSelectedContact(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
