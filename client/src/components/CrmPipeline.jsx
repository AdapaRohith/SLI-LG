import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const STAGES = [
  { id: 'new', label: 'New Lead', icon: '🟣', color: '#a855f7' },
  { id: 'contacted', label: 'Contacted', icon: '📞', color: '#3b82f6' },
  { id: 'qualified', label: 'Qualified', icon: '📋', color: '#06b6d4' },
  { id: 'proposal', label: 'Proposal', icon: '💰', color: '#f59e0b' },
  { id: 'won', label: 'Won', icon: '🎉', color: '#22c55e' },
  { id: 'lost', label: 'Lost', icon: '❌', color: '#ef4444' },
]

const STORAGE_KEY = 'crm_pipeline_deals'

function loadDeals() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveDeals(deals) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deals))
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function daysSince(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.max(0, Math.floor(diff / 86400000))
}

const emptyDeal = {
  name: '',
  phone: '',
  email: '',
  budget: '',
  location: '',
  notes: '',
  stage: 'new',
}

export function CrmPipeline({ leads = [] }) {
  const [deals, setDeals] = useState(loadDeals)
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverStage, setDragOverStage] = useState(null)
  const [selectedDeal, setSelectedDeal] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ ...emptyDeal })
  const [showImportModal, setShowImportModal] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')

  useEffect(() => {
    saveDeals(deals)
  }, [deals])

  // --- drag and drop ---
  const handleDragStart = useCallback((e, dealId) => {
    setDraggedId(dealId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', dealId)
  }, [])

  const handleDragOver = useCallback((e, stageId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStage(stageId)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverStage(null)
  }, [])

  const handleDrop = useCallback(
    (e, stageId) => {
      e.preventDefault()
      setDragOverStage(null)
      if (!draggedId) return

      setDeals((prev) =>
        prev.map((d) =>
          d.id === draggedId
            ? {
                ...d,
                stage: stageId,
                stageChangedAt: new Date().toISOString(),
                history: [
                  ...(d.history || []),
                  {
                    from: d.stage,
                    to: stageId,
                    at: new Date().toISOString(),
                  },
                ],
              }
            : d,
        ),
      )
      setDraggedId(null)
    },
    [draggedId],
  )

  const handleDragEnd = useCallback(() => {
    setDraggedId(null)
    setDragOverStage(null)
  }, [])

  // --- move deal between stages via buttons ---
  function moveDeal(dealId, newStage) {
    setDeals((prev) =>
      prev.map((d) =>
        d.id === dealId
          ? {
              ...d,
              stage: newStage,
              stageChangedAt: new Date().toISOString(),
              history: [
                ...(d.history || []),
                { from: d.stage, to: newStage, at: new Date().toISOString() },
              ],
            }
          : d,
      ),
    )
    if (selectedDeal?.id === dealId) {
      setSelectedDeal((prev) => ({ ...prev, stage: newStage }))
    }
  }

  // --- add deal ---
  function handleAddDeal(e) {
    e.preventDefault()
    const newDeal = {
      ...addForm,
      id: generateId(),
      createdAt: new Date().toISOString(),
      stageChangedAt: new Date().toISOString(),
      history: [],
    }
    setDeals((prev) => [...prev, newDeal])
    setAddForm({ ...emptyDeal })
    setShowAddModal(false)
  }

  // --- delete deal ---
  function deleteDeal(dealId) {
    setDeals((prev) => prev.filter((d) => d.id !== dealId))
    if (selectedDeal?.id === dealId) setSelectedDeal(null)
  }

  // --- update deal notes ---
  function updateDealNotes(dealId, notes) {
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, notes } : d)))
  }

  // --- import from leads ---
  const existingPhones = useMemo(() => new Set(deals.map((d) => d.phone)), [deals])

  const importableLeads = useMemo(
    () => leads.filter((l) => !existingPhones.has(l.phone)),
    [leads, existingPhones],
  )

  function importLead(lead) {
    const newDeal = {
      id: generateId(),
      name: lead.name,
      phone: lead.phone,
      email: lead.email || '',
      budget: lead.budget || '',
      location: lead.location || '',
      notes: '',
      stage: lead.score === 'High' ? 'qualified' : lead.score === 'Medium' ? 'contacted' : 'new',
      createdAt: lead.createdAt || new Date().toISOString(),
      stageChangedAt: new Date().toISOString(),
      history: [],
      importedFrom: 'leads',
    }
    setDeals((prev) => [...prev, newDeal])
  }

  function importAll() {
    const newDeals = importableLeads.map((lead) => ({
      id: generateId(),
      name: lead.name,
      phone: lead.phone,
      email: lead.email || '',
      budget: lead.budget || '',
      location: lead.location || '',
      notes: '',
      stage: lead.score === 'High' ? 'qualified' : lead.score === 'Medium' ? 'contacted' : 'new',
      createdAt: lead.createdAt || new Date().toISOString(),
      stageChangedAt: new Date().toISOString(),
      history: [],
      importedFrom: 'leads',
    }))
    setDeals((prev) => [...prev, ...newDeals])
    setShowImportModal(false)
  }

  // --- computed ---
  const filteredDeals = useMemo(() => {
    if (!searchFilter.trim()) return deals
    const q = searchFilter.toLowerCase()
    return deals.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.phone.includes(q) ||
        (d.email && d.email.toLowerCase().includes(q)),
    )
  }, [deals, searchFilter])

  const dealsByStage = useMemo(() => {
    const map = {}
    STAGES.forEach((s) => (map[s.id] = []))
    filteredDeals.forEach((d) => {
      if (map[d.stage]) map[d.stage].push(d)
    })
    return map
  }, [filteredDeals])

  const pipelineStats = useMemo(() => {
    const total = deals.length
    const won = deals.filter((d) => d.stage === 'won').length
    const lost = deals.filter((d) => d.stage === 'lost').length
    const active = total - won - lost
    return { total, won, lost, active }
  }, [deals])

  return (
    <div className="crm-pipeline-root">
      {/* Stats Row */}
      <div className="crm-stats-row">
        <div className="crm-stat-chip">
          <span className="crm-stat-number">{pipelineStats.total}</span>
          <span className="crm-stat-label">Total Deals</span>
        </div>
        <div className="crm-stat-chip">
          <span className="crm-stat-number" style={{ color: '#3b82f6' }}>{pipelineStats.active}</span>
          <span className="crm-stat-label">Active</span>
        </div>
        <div className="crm-stat-chip">
          <span className="crm-stat-number" style={{ color: '#22c55e' }}>{pipelineStats.won}</span>
          <span className="crm-stat-label">Won</span>
        </div>
        <div className="crm-stat-chip">
          <span className="crm-stat-number" style={{ color: '#ef4444' }}>{pipelineStats.lost}</span>
          <span className="crm-stat-label">Lost</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="crm-toolbar">
        <input
          className="crm-search-input"
          placeholder="Search deals..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
        />
        <div className="crm-toolbar-actions">
          <button className="button-secondary" onClick={() => setShowImportModal(true)} type="button">
            ⬇ Import Leads ({importableLeads.length})
          </button>
          <button className="button-primary" onClick={() => setShowAddModal(true)} type="button">
            + New Deal
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="crm-kanban">
        {STAGES.map((stage) => (
          <div
            key={stage.id}
            className={`crm-kanban-col ${dragOverStage === stage.id ? 'crm-kanban-col-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <div className="crm-kanban-col-header">
              <span className="crm-kanban-col-icon">{stage.icon}</span>
              <span className="crm-kanban-col-title">{stage.label}</span>
              <span className="crm-kanban-col-count" style={{ background: stage.color + '22', color: stage.color }}>
                {dealsByStage[stage.id]?.length || 0}
              </span>
            </div>
            <div className="crm-kanban-col-body">
              {dealsByStage[stage.id]?.map((deal) => (
                <div
                  key={deal.id}
                  className={`crm-deal-card ${draggedId === deal.id ? 'crm-deal-card-dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, deal.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setSelectedDeal(deal)}
                >
                  <div className="crm-deal-card-name">{deal.name}</div>
                  <div className="crm-deal-card-meta">{deal.phone}</div>
                  {deal.budget && <div className="crm-deal-card-budget">{deal.budget}</div>}
                  <div className="crm-deal-card-days">
                    {daysSince(deal.stageChangedAt)}d in stage
                  </div>
                </div>
              ))}
              {dealsByStage[stage.id]?.length === 0 && (
                <div className="crm-kanban-empty">Drop deals here</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Deal Modal */}
      {showAddModal && (
        <ModalOverlay onClose={() => setShowAddModal(false)}>
          <div className="crm-modal">
            <div className="crm-modal-header">
              <h3>New Deal</h3>
              <button onClick={() => setShowAddModal(false)} className="crm-modal-close">✕</button>
            </div>
            <form onSubmit={handleAddDeal} className="crm-modal-form">
              <label className="crm-field">
                <span>Name *</span>
                <input required value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} placeholder="Contact name" />
              </label>
              <label className="crm-field">
                <span>Phone *</span>
                <input required value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="10-digit number" inputMode="numeric" />
              </label>
              <label className="crm-field">
                <span>Email</span>
                <input value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} placeholder="Optional" />
              </label>
              <label className="crm-field">
                <span>Budget</span>
                <select value={addForm.budget} onChange={(e) => setAddForm((f) => ({ ...f, budget: e.target.value }))}>
                  <option value="">Select budget</option>
                  <option value="2-3Cr">2 to 3 Crore</option>
                  <option value="3-5Cr">3 to 5 Crore</option>
                  <option value="5Cr+">5 Crore+</option>
                </select>
              </label>
              <label className="crm-field">
                <span>Location</span>
                <input value={addForm.location} onChange={(e) => setAddForm((f) => ({ ...f, location: e.target.value }))} placeholder="Preferred area" />
              </label>
              <label className="crm-field">
                <span>Stage</span>
                <select value={addForm.stage} onChange={(e) => setAddForm((f) => ({ ...f, stage: e.target.value }))}>
                  {STAGES.map((s) => (
                    <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
                  ))}
                </select>
              </label>
              <label className="crm-field">
                <span>Notes</span>
                <textarea value={addForm.notes} onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Any notes..." rows={3} />
              </label>
              <div className="crm-modal-actions">
                <button type="button" className="button-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="button-primary">Create Deal</button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ModalOverlay onClose={() => setShowImportModal(false)}>
          <div className="crm-modal crm-modal-lg">
            <div className="crm-modal-header">
              <h3>Import Leads to Pipeline</h3>
              <button onClick={() => setShowImportModal(false)} className="crm-modal-close">✕</button>
            </div>
            <div className="crm-modal-body">
              {importableLeads.length === 0 ? (
                <p className="crm-empty-text">All leads have already been imported!</p>
              ) : (
                <>
                  <p className="text-sm text-brand-muted" style={{ marginBottom: '1rem' }}>
                    {importableLeads.length} leads available. High-intent leads go to "Qualified", Medium to "Contacted", Low to "New Lead".
                  </p>
                  <div className="crm-import-list">
                    {importableLeads.map((lead) => (
                      <div key={lead.id || lead.phone} className="crm-import-row">
                        <div className="crm-import-info">
                          <span className="crm-import-name">{lead.name}</span>
                          <span className="crm-import-phone">{lead.phone}</span>
                          <span className={`crm-import-score crm-score-${lead.score?.toLowerCase()}`}>{lead.score}</span>
                        </div>
                        <button
                          type="button"
                          className="button-primary"
                          style={{ padding: '0.4rem 1rem', fontSize: '0.75rem' }}
                          onClick={() => importLead(lead)}
                        >
                          Import
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="crm-modal-actions">
              <button type="button" className="button-secondary" onClick={() => setShowImportModal(false)}>Close</button>
              {importableLeads.length > 0 && (
                <button type="button" className="button-primary" onClick={importAll}>Import All ({importableLeads.length})</button>
              )}
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Deal Detail Modal */}
      {selectedDeal && (
        <ModalOverlay onClose={() => setSelectedDeal(null)}>
          <DealDetail
            deal={deals.find((d) => d.id === selectedDeal.id) || selectedDeal}
            onClose={() => setSelectedDeal(null)}
            onMove={moveDeal}
            onDelete={deleteDeal}
            onUpdateNotes={updateDealNotes}
          />
        </ModalOverlay>
      )}
    </div>
  )
}

function DealDetail({ deal, onClose, onMove, onDelete, onUpdateNotes }) {
  const [notes, setNotes] = useState(deal.notes || '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const currentIdx = STAGES.findIndex((s) => s.id === deal.stage)
  const currentStage = STAGES[currentIdx]

  function saveNotes() {
    onUpdateNotes(deal.id, notes)
  }

  return (
    <div className="crm-modal crm-modal-lg">
      <div className="crm-modal-header">
        <h3>{deal.name}</h3>
        <button onClick={onClose} className="crm-modal-close">✕</button>
      </div>
      <div className="crm-modal-body">
        <div className="crm-detail-grid">
          <div className="crm-detail-item">
            <span className="crm-detail-label">Phone</span>
            <span className="crm-detail-value">{deal.phone}</span>
          </div>
          <div className="crm-detail-item">
            <span className="crm-detail-label">Email</span>
            <span className="crm-detail-value">{deal.email || '—'}</span>
          </div>
          <div className="crm-detail-item">
            <span className="crm-detail-label">Budget</span>
            <span className="crm-detail-value">{deal.budget || '—'}</span>
          </div>
          <div className="crm-detail-item">
            <span className="crm-detail-label">Location</span>
            <span className="crm-detail-value">{deal.location || '—'}</span>
          </div>
          <div className="crm-detail-item">
            <span className="crm-detail-label">Current Stage</span>
            <span className="crm-detail-value" style={{ color: currentStage?.color }}>
              {currentStage?.icon} {currentStage?.label}
            </span>
          </div>
          <div className="crm-detail-item">
            <span className="crm-detail-label">Created</span>
            <span className="crm-detail-value">{new Date(deal.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Move buttons */}
        <div className="crm-stage-move">
          <p className="crm-detail-label" style={{ marginBottom: '0.5rem' }}>Move to Stage</p>
          <div className="crm-stage-buttons">
            {STAGES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`crm-stage-btn ${deal.stage === s.id ? 'crm-stage-btn-active' : ''}`}
                style={{ '--stage-color': s.color }}
                disabled={deal.stage === s.id}
                onClick={() => onMove(deal.id, s.id)}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="crm-notes-section">
          <p className="crm-detail-label" style={{ marginBottom: '0.5rem' }}>Notes</p>
          <textarea
            className="crm-notes-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this deal..."
            rows={4}
          />
          <button type="button" className="button-primary" style={{ marginTop: '0.5rem', padding: '0.5rem 1.2rem', fontSize: '0.8rem' }} onClick={saveNotes}>
            Save Notes
          </button>
        </div>

        {/* Stage History */}
        {deal.history && deal.history.length > 0 && (
          <div className="crm-history-section">
            <p className="crm-detail-label" style={{ marginBottom: '0.5rem' }}>Stage History</p>
            <div className="crm-history-list">
              {deal.history.map((h, i) => {
                const fromStage = STAGES.find((s) => s.id === h.from)
                const toStage = STAGES.find((s) => s.id === h.to)
                return (
                  <div key={i} className="crm-history-item">
                    <span className="crm-history-stages">
                      {fromStage?.icon} {fromStage?.label} → {toStage?.icon} {toStage?.label}
                    </span>
                    <span className="crm-history-date">{new Date(h.at).toLocaleString()}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="crm-modal-actions">
        {!confirmDelete ? (
          <button type="button" className="crm-delete-btn" onClick={() => setConfirmDelete(true)}>
            🗑 Delete Deal
          </button>
        ) : (
          <button type="button" className="crm-delete-btn crm-delete-confirm" onClick={() => onDelete(deal.id)}>
            Confirm Delete
          </button>
        )}
        <button type="button" className="button-secondary" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

function ModalOverlay({ children, onClose }) {
  const overlayRef = useRef(null)

  return (
    <div className="crm-overlay" ref={overlayRef} onClick={(e) => { if (e.target === overlayRef.current) onClose() }}>
      {children}
    </div>
  )
}
