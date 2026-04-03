import { useCallback, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'crm_messaging_limits'

const TIERS = [
  { value: 250, label: '250' },
  { value: 2000, label: '2,000' },
  { value: 10000, label: '10,000' },
  { value: 100000, label: '100,000' },
  { value: Infinity, label: 'Unlimited' },
]

const QUALITY_LEVELS = [
  { id: 'green', label: 'High', color: '#16a34a', icon: '🟢' },
  { id: 'yellow', label: 'Medium', color: '#eab308', icon: '🟡' },
  { id: 'red', label: 'Low', color: '#ef4444', icon: '🔴' },
]

function getDefaults() {
  return {
    currentLimit: 250,
    conversationsUsed: 0,
    uniqueCustomers7d: 0,
    qualityRating: 'green',
    updatedAt: new Date().toISOString(),
    history: [],
    dailyUsage: [],
    notificationsEnabled: true,
    alertThreshold: 80,
  }
}

function loadLimits() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...getDefaults(), ...parsed }
    }
  } catch {
    // ignore
  }
  return getDefaults()
}

function saveLimits(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const day = d.getDate()
  const month = d.toLocaleString('en-US', { month: 'short' })
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const offset = -d.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const oh = Math.floor(Math.abs(offset) / 60).toString().padStart(1, '0')
  const om = (Math.abs(offset) % 60).toString().padStart(2, '0')
  return `Updated on ${day} ${month}, ${hours}:${minutes} GMT${sign}${oh}:${om}`
}

function formatFullDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function CrmLimits() {
  const [limits, setLimits] = useState(loadLimits)
  const [showHistory, setShowHistory] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showUsageModal, setShowUsageModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showUpgradeConfirm, setShowUpgradeConfirm] = useState(null)
  const [toast, setToast] = useState(null)
  const [editForm, setEditForm] = useState({
    conversationsUsed: 0,
    uniqueCustomers7d: 0,
  })
  const [settingsForm, setSettingsForm] = useState({
    alertThreshold: 80,
    notificationsEnabled: true,
  })

  useEffect(() => {
    saveLimits(limits)
  }, [limits])

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const currentTierIndex = TIERS.findIndex((t) => t.value === limits.currentLimit)
  const nextTier = currentTierIndex < TIERS.length - 1 ? TIERS[currentTierIndex + 1] : null

  const usagePercent = useMemo(() => {
    if (limits.currentLimit === Infinity) return 0
    return Math.min(100, Math.round((limits.conversationsUsed / limits.currentLimit) * 100))
  }, [limits.conversationsUsed, limits.currentLimit])

  const remaining = useMemo(() => {
    if (limits.currentLimit === Infinity) return '∞'
    return Math.max(0, limits.currentLimit - limits.conversationsUsed).toLocaleString()
  }, [limits.conversationsUsed, limits.currentLimit])

  const usageStatus = useMemo(() => {
    if (usagePercent >= 95) return { level: 'critical', label: 'Critical', color: '#ef4444' }
    if (usagePercent >= limits.alertThreshold) return { level: 'warning', label: 'Warning', color: '#eab308' }
    return { level: 'normal', label: 'Normal', color: '#16a34a' }
  }, [usagePercent, limits.alertThreshold])

  const qualityInfo = QUALITY_LEVELS.find((q) => q.id === limits.qualityRating) || QUALITY_LEVELS[0]

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  // --- Handlers ---
  function handleUpgradeTier(tier) {
    if (tier.value <= limits.currentLimit) return
    setShowUpgradeConfirm(tier)
  }

  function confirmUpgrade() {
    if (!showUpgradeConfirm) return
    const oldLimit = limits.currentLimit
    const newLimit = showUpgradeConfirm.value
    setLimits((prev) => ({
      ...prev,
      currentLimit: newLimit,
      updatedAt: new Date().toISOString(),
      history: [
        {
          date: new Date().toISOString(),
          from: oldLimit,
          to: newLimit,
          reason: 'Manual upgrade',
          type: 'upgrade',
        },
        ...prev.history,
      ],
    }))
    showToast(`Limit upgraded to ${showUpgradeConfirm.label}`)
    setShowUpgradeConfirm(null)
  }

  function handleOpenUsageModal() {
    setEditForm({
      conversationsUsed: limits.conversationsUsed,
      uniqueCustomers7d: limits.uniqueCustomers7d,
    })
    setShowUsageModal(true)
  }

  function handleSaveUsage(e) {
    e.preventDefault()
    const used = Math.max(0, parseInt(editForm.conversationsUsed) || 0)
    const customers = Math.max(0, parseInt(editForm.uniqueCustomers7d) || 0)

    setLimits((prev) => {
      const newDailyUsage = [
        ...(prev.dailyUsage || []),
        { date: new Date().toISOString(), used, customers },
      ].slice(-30) // keep last 30 entries

      return {
        ...prev,
        conversationsUsed: used,
        uniqueCustomers7d: customers,
        updatedAt: new Date().toISOString(),
        dailyUsage: newDailyUsage,
        history: [
          {
            date: new Date().toISOString(),
            from: prev.conversationsUsed,
            to: used,
            reason: `Usage updated: ${used.toLocaleString()} conversations, ${customers.toLocaleString()} unique customers`,
            type: 'usage_update',
          },
          ...prev.history,
        ],
      }
    })
    showToast('Usage stats updated')
    setShowUsageModal(false)
  }

  function handleQualityChange(qualityId) {
    setLimits((prev) => ({
      ...prev,
      qualityRating: qualityId,
      updatedAt: new Date().toISOString(),
      history: [
        {
          date: new Date().toISOString(),
          from: prev.qualityRating,
          to: qualityId,
          reason: `Quality rating changed to ${QUALITY_LEVELS.find((q) => q.id === qualityId)?.label}`,
          type: 'quality_change',
        },
        ...prev.history,
      ],
    }))
    showToast(`Quality rating set to ${QUALITY_LEVELS.find((q) => q.id === qualityId)?.label}`)
  }

  function handleOpenSettings() {
    setSettingsForm({
      alertThreshold: limits.alertThreshold,
      notificationsEnabled: limits.notificationsEnabled,
    })
    setShowSettingsModal(true)
  }

  function handleSaveSettings(e) {
    e.preventDefault()
    const threshold = Math.min(100, Math.max(1, parseInt(settingsForm.alertThreshold) || 80))
    setLimits((prev) => ({
      ...prev,
      alertThreshold: threshold,
      notificationsEnabled: settingsForm.notificationsEnabled,
      updatedAt: new Date().toISOString(),
    }))
    showToast('Settings saved')
    setShowSettingsModal(false)
  }

  function handleResetAll() {
    if (!window.confirm('Reset all messaging limits data? This cannot be undone.')) return
    const fresh = getDefaults()
    setLimits(fresh)
    showToast('All limits data has been reset', 'info')
  }

  function handleClearHistory() {
    if (!window.confirm('Clear all history records?')) return
    setLimits((prev) => ({ ...prev, history: [] }))
    showToast('History cleared', 'info')
  }

  const historyIcons = {
    upgrade: '⬆️',
    usage_update: '📊',
    quality_change: '🎯',
  }

  // Usage sparkline from dailyUsage
  const sparkData = useMemo(() => {
    const data = limits.dailyUsage || []
    if (data.length < 2) return null
    const values = data.map((d) => d.used)
    const max = Math.max(...values, 1)
    return values.map((v) => Math.round((v / max) * 100))
  }, [limits.dailyUsage])

  return (
    <div className="crm-limits-root">
      {/* Toast */}
      {toast && (
        <div className={`crm-limits-toast crm-limits-toast-${toast.type}`}>
          <span>{toast.type === 'success' ? '✓' : 'ℹ'}</span>
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} className="crm-limits-toast-close">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="crm-limits-header">
        <div className="crm-limits-title-row">
          <h2 className="crm-limits-title">
            Messaging limits
            <span className="crm-limits-info-icon" title="Business-initiated conversation limits for your WhatsApp Business account">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 7v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="8" cy="5" r="0.75" fill="currentColor"/>
              </svg>
            </span>
          </h2>
          <span className="crm-limits-updated">{formatDate(limits.updatedAt)}</span>
        </div>
        <div className="crm-limits-header-actions">
          <button type="button" className="crm-limits-header-btn" onClick={handleOpenSettings} title="Settings">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6.5 1.5h3l.4 1.8.9.4 1.6-.8 2.1 2.1-.8 1.6.4.9 1.8.4v3l-1.8.4-.4.9.8 1.6-2.1 2.1-1.6-.8-.9.4-.4 1.8h-3l-.4-1.8-.9-.4-1.6.8-2.1-2.1.8-1.6-.4-.9-1.8-.4v-3l1.8-.4.4-.9-.8-1.6 2.1-2.1 1.6.8.9-.4.4-1.8z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/></svg>
          </button>
          <button type="button" className="crm-limits-history-btn" onClick={() => setShowHistory(true)}>
            View History
          </button>
        </div>
      </div>

      {/* Usage Alert Banner */}
      {usageStatus.level !== 'normal' && limits.notificationsEnabled && (
        <div className={`crm-limits-alert crm-limits-alert-${usageStatus.level}`}>
          <span className="crm-limits-alert-icon">{usageStatus.level === 'critical' ? '🚨' : '⚠️'}</span>
          <div className="crm-limits-alert-content">
            <strong>{usageStatus.level === 'critical' ? 'Critical:' : 'Warning:'}</strong>{' '}
            You've used {usagePercent}% of your messaging limit ({limits.conversationsUsed.toLocaleString()} / {limits.currentLimit === Infinity ? '∞' : limits.currentLimit.toLocaleString()}).
            {nextTier && ` Consider upgrading to ${nextTier.label}.`}
          </div>
          {nextTier && (
            <button type="button" className="crm-limits-alert-btn" onClick={() => handleUpgradeTier(nextTier)}>
              Upgrade
            </button>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="crm-limits-stats">
        <div className="crm-limits-stat-card">
          <div className="crm-limits-stat-header">
            <span className="crm-limits-stat-icon">💬</span>
            <span className="crm-limits-stat-title">Conversations Used</span>
          </div>
          <div className="crm-limits-stat-value">{limits.conversationsUsed.toLocaleString()}</div>
          <div className="crm-limits-stat-sub">of {limits.currentLimit === Infinity ? 'Unlimited' : limits.currentLimit.toLocaleString()}</div>
          {/* Progress Bar */}
          {limits.currentLimit !== Infinity && (
            <div className="crm-limits-progress-wrap">
              <div className="crm-limits-progress-bar">
                <div
                  className="crm-limits-progress-fill"
                  style={{
                    width: `${usagePercent}%`,
                    background: usageStatus.color,
                  }}
                />
              </div>
              <span className="crm-limits-progress-pct" style={{ color: usageStatus.color }}>{usagePercent}%</span>
            </div>
          )}
        </div>

        <div className="crm-limits-stat-card">
          <div className="crm-limits-stat-header">
            <span className="crm-limits-stat-icon">📬</span>
            <span className="crm-limits-stat-title">Remaining</span>
          </div>
          <div className="crm-limits-stat-value">{remaining}</div>
          <div className="crm-limits-stat-sub">conversations left</div>
        </div>

        <div className="crm-limits-stat-card">
          <div className="crm-limits-stat-header">
            <span className="crm-limits-stat-icon">👥</span>
            <span className="crm-limits-stat-title">Unique Customers (7d)</span>
          </div>
          <div className="crm-limits-stat-value">{limits.uniqueCustomers7d.toLocaleString()}</div>
          <div className="crm-limits-stat-sub">
            {limits.uniqueCustomers7d >= 1000 ? (
              <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Requirement met</span>
            ) : (
              <span>{Math.max(0, 1000 - limits.uniqueCustomers7d).toLocaleString()} more needed</span>
            )}
          </div>
        </div>

        <div className="crm-limits-stat-card">
          <div className="crm-limits-stat-header">
            <span className="crm-limits-stat-icon">🎯</span>
            <span className="crm-limits-stat-title">Quality Rating</span>
          </div>
          <div className="crm-limits-stat-value" style={{ fontSize: '1.4rem' }}>
            {qualityInfo.icon} {qualityInfo.label}
          </div>
          <div className="crm-limits-quality-pills">
            {QUALITY_LEVELS.map((q) => (
              <button
                key={q.id}
                type="button"
                className={`crm-limits-quality-pill ${limits.qualityRating === q.id ? 'crm-limits-quality-pill-active' : ''}`}
                style={{ '--pill-color': q.color }}
                onClick={() => handleQualityChange(q.id)}
              >
                {q.icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="crm-limits-actions-row">
        <button type="button" className="button-primary" onClick={handleOpenUsageModal}>
          📊 Update Usage
        </button>
        {nextTier && (
          <button type="button" className="button-secondary" onClick={() => handleUpgradeTier(nextTier)}>
            ⬆️ Request Upgrade to {nextTier.label}
          </button>
        )}
        <button type="button" className="crm-limits-reset-btn" onClick={handleResetAll}>
          🔄 Reset All
        </button>
      </div>

      {/* Sparkline Mini Chart */}
      {sparkData && sparkData.length > 1 && (
        <div className="crm-limits-sparkline-section">
          <h3 className="crm-limits-section-title">Usage Trend (recent entries)</h3>
          <div className="crm-limits-sparkline">
            {sparkData.map((val, i) => (
              <div key={i} className="crm-limits-spark-bar-wrap">
                <div
                  className="crm-limits-spark-bar"
                  style={{ height: `${Math.max(4, val)}%` }}
                  title={`${limits.dailyUsage[i]?.used?.toLocaleString()} conversations`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tier Display */}
      <div className="crm-limits-tiers">
        {TIERS.map((tier) => {
          const isCurrent = tier.value === limits.currentLimit
          const isBelow = tier.value < limits.currentLimit
          const isAbove = tier.value > limits.currentLimit
          const isActive = isCurrent || isBelow
          return (
            <div
              key={tier.value === Infinity ? 'inf' : tier.value}
              className={`crm-limits-tier ${isCurrent ? 'crm-limits-tier-current' : ''} ${isActive ? 'crm-limits-tier-active' : 'crm-limits-tier-inactive'} ${isAbove ? 'crm-limits-tier-clickable' : ''}`}
              onClick={() => isAbove && handleUpgradeTier(tier)}
              role={isAbove ? 'button' : undefined}
              tabIndex={isAbove ? 0 : undefined}
              onKeyDown={(e) => isAbove && e.key === 'Enter' && handleUpgradeTier(tier)}
            >
              {isCurrent && <span className="crm-limits-current-badge">Current</span>}
              {isBelow && <span className="crm-limits-passed-badge">✓</span>}
              {isCurrent && (
                <span className="crm-limits-tier-value">{limits.currentLimit === Infinity ? '∞' : limits.currentLimit.toLocaleString()}</span>
              )}
              {isCurrent && (
                <span className="crm-limits-tier-desc">
                  Business-initiated conversations in a rolling 24-hour period
                </span>
              )}
              {!isCurrent && (
                <span className="crm-limits-tier-label">{tier.label}</span>
              )}
              {isAbove && (
                <span className="crm-limits-tier-upgrade-hint">Click to upgrade</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Increase Limit Section */}
      {nextTier && (
        <div className="crm-limits-upgrade">
          <h3 className="crm-limits-upgrade-title">Increase your messaging limit</h3>
          <p className="crm-limits-upgrade-desc">
            Once you meet all of these requirements, your messaging limit will increase to{' '}
            <strong>{nextTier.label}</strong> business-initiated conversations.
          </p>
          <p className="crm-limits-upgrade-note">Upgrades can take up to 24 hours.</p>

          <div className="crm-limits-requirements">
            <div className="crm-limits-requirement">
              <div className="crm-limits-req-radio">
                <div className="crm-limits-radio-outer">
                  <div className={`crm-limits-radio-inner ${limits.uniqueCustomers7d >= 1000 ? 'crm-limits-radio-filled' : ''}`} />
                </div>
              </div>
              <div className="crm-limits-req-content">
                <p className="crm-limits-req-label">
                  Start high-quality business-initiated conversations with 1,000 unique customers in a rolling seven-day period
                </p>
                <p className="crm-limits-req-progress">
                  You started <strong>{limits.uniqueCustomers7d.toLocaleString()}</strong> conversations with unique customers in the last seven days.
                </p>
                {/* Progress toward 1000 */}
                <div className="crm-limits-req-minibar-wrap">
                  <div className="crm-limits-req-minibar">
                    <div
                      className="crm-limits-req-minibar-fill"
                      style={{ width: `${Math.min(100, (limits.uniqueCustomers7d / 1000) * 100)}%` }}
                    />
                  </div>
                  <span className="crm-limits-req-minibar-label">{Math.min(100, Math.round((limits.uniqueCustomers7d / 1000) * 100))}%</span>
                </div>
                <a href="#" className="crm-limits-req-link" onClick={(e) => e.preventDefault()}>What are high-quality messages</a>
              </div>
            </div>

            <div className="crm-limits-requirement">
              <div className="crm-limits-req-radio">
                <div className="crm-limits-radio-outer">
                  <div className={`crm-limits-radio-inner ${limits.qualityRating === 'green' ? 'crm-limits-radio-filled' : ''}`} />
                </div>
              </div>
              <div className="crm-limits-req-content">
                <p className="crm-limits-req-label">
                  Maintain a High quality rating for your phone number
                </p>
                <p className="crm-limits-req-progress">
                  Your current quality rating is <strong style={{ color: qualityInfo.color }}>{qualityInfo.icon} {qualityInfo.label}</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Confirmation Modal */}
      {showUpgradeConfirm && (
        <div className="crm-overlay" onClick={(e) => { if (e.target.classList.contains('crm-overlay')) setShowUpgradeConfirm(null) }}>
          <div className="crm-modal">
            <div className="crm-modal-header">
              <h3>Confirm Upgrade</h3>
              <button onClick={() => setShowUpgradeConfirm(null)} className="crm-modal-close">✕</button>
            </div>
            <div className="crm-modal-body">
              <p style={{ fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                Are you sure you want to upgrade your messaging limit from{' '}
                <strong>{limits.currentLimit === Infinity ? 'Unlimited' : limits.currentLimit.toLocaleString()}</strong> to{' '}
                <strong>{showUpgradeConfirm.label}</strong> business-initiated conversations?
              </p>
              <p style={{ fontSize: '0.82rem', color: '#5c6b77', marginTop: '0.5rem' }}>
                This change will be recorded in your history.
              </p>
            </div>
            <div className="crm-modal-actions">
              <button type="button" className="button-secondary" onClick={() => setShowUpgradeConfirm(null)}>Cancel</button>
              <button type="button" className="button-primary" onClick={confirmUpgrade}>Confirm Upgrade</button>
            </div>
          </div>
        </div>
      )}

      {/* Update Usage Modal */}
      {showUsageModal && (
        <div className="crm-overlay" onClick={(e) => { if (e.target.classList.contains('crm-overlay')) setShowUsageModal(false) }}>
          <div className="crm-modal">
            <div className="crm-modal-header">
              <h3>Update Usage Stats</h3>
              <button onClick={() => setShowUsageModal(false)} className="crm-modal-close">✕</button>
            </div>
            <form onSubmit={handleSaveUsage} className="crm-modal-form">
              <label className="crm-field">
                <span>Conversations Used (24h)</span>
                <input
                  type="number"
                  min="0"
                  value={editForm.conversationsUsed}
                  onChange={(e) => setEditForm((f) => ({ ...f, conversationsUsed: e.target.value }))}
                  required
                />
              </label>
              <label className="crm-field">
                <span>Unique Customers (7 days)</span>
                <input
                  type="number"
                  min="0"
                  value={editForm.uniqueCustomers7d}
                  onChange={(e) => setEditForm((f) => ({ ...f, uniqueCustomers7d: e.target.value }))}
                  required
                />
              </label>
              <div className="crm-modal-actions">
                <button type="button" className="button-secondary" onClick={() => setShowUsageModal(false)}>Cancel</button>
                <button type="submit" className="button-primary">Save Usage</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="crm-overlay" onClick={(e) => { if (e.target.classList.contains('crm-overlay')) setShowSettingsModal(false) }}>
          <div className="crm-modal">
            <div className="crm-modal-header">
              <h3>Limits Settings</h3>
              <button onClick={() => setShowSettingsModal(false)} className="crm-modal-close">✕</button>
            </div>
            <form onSubmit={handleSaveSettings} className="crm-modal-form">
              <label className="crm-field">
                <span>Alert Threshold (%)</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settingsForm.alertThreshold}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, alertThreshold: e.target.value }))}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: '#5c6b77' }}>
                  Show warning when usage exceeds this percentage
                </span>
              </label>
              <label className="crm-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.6rem' }}>
                <input
                  type="checkbox"
                  checked={settingsForm.notificationsEnabled}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, notificationsEnabled: e.target.checked }))}
                  style={{ width: 18, height: 18, accentColor: '#ef7d34' }}
                />
                <span>Enable usage alerts</span>
              </label>
              <div className="crm-modal-actions">
                <button type="button" className="button-secondary" onClick={() => setShowSettingsModal(false)}>Cancel</button>
                <button type="submit" className="button-primary">Save Settings</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="crm-overlay" onClick={(e) => { if (e.target.classList.contains('crm-overlay')) setShowHistory(false) }}>
          <div className="crm-modal crm-modal-lg">
            <div className="crm-modal-header">
              <h3>Limit History</h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {limits.history.length > 0 && (
                  <button type="button" className="crm-limits-reset-btn" onClick={handleClearHistory} style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                    Clear All
                  </button>
                )}
                <button onClick={() => setShowHistory(false)} className="crm-modal-close">✕</button>
              </div>
            </div>
            <div className="crm-limits-history-list">
              {limits.history.length === 0 ? (
                <p className="crm-empty-text" style={{ padding: '2rem', textAlign: 'center' }}>
                  No history available yet. Changes to limits, usage, and quality will be recorded here.
                </p>
              ) : (
                limits.history.map((entry, i) => (
                  <div key={i} className="crm-limits-history-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>{historyIcons[entry.type] || '📝'}</span>
                      <div>
                        <div className="crm-limits-history-date">{formatFullDate(entry.date)}</div>
                        <div className="crm-limits-history-reason">{entry.reason}</div>
                      </div>
                    </div>
                    {entry.type === 'upgrade' && (
                      <div className="crm-limits-history-change">
                        {typeof entry.from === 'number' ? entry.from.toLocaleString() : entry.from} → {typeof entry.to === 'number' ? (entry.to === Infinity ? 'Unlimited' : entry.to.toLocaleString()) : entry.to}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
