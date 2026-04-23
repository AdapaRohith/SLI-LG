import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getHealth, getLeadDetail, getLeads, searchLeads } from '../lib/api'
import { clearAdminAuthentication } from '../lib/auth'

const statusStyles = {
  hot: 'bg-red-50 text-red-700 border-red-200',
  warm: 'bg-amber-50 text-amber-700 border-amber-200',
  cold: 'bg-slate-100 text-slate-700 border-slate-200',
}

const EMPTY_DETAIL_STATE = {
  loading: false,
  error: '',
  lead: null,
  messages: [],
}

export function AdminPage() {
  const navigate = useNavigate()
  const leadItemRefs = useRef(new Map())
  const conversationSectionRef = useRef(null)
  const [health, setHealth] = useState({ loading: true, error: '', status: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [leadsState, setLeadsState] = useState({ loading: true, error: '', items: [] })
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeSourceFilter, setActiveSourceFilter] = useState('all')
  const [detailState, setDetailState] = useState(EMPTY_DETAIL_STATE)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeTab, setActiveTab] = useState('overview')
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportMessage, setExportMessage] = useState(null)
  const [exportDateRange, setExportDateRange] = useState(getDefaultExportDateRange)

  useEffect(() => {
    let ignore = false

    async function loadHealth() {
      try {
        const response = await getHealth()

        if (!ignore) {
          setHealth({
            loading: false,
            error: '',
            status: response?.status ?? 'API running',
          })
        }
      } catch (error) {
        if (!ignore) {
          setHealth({
            loading: false,
            error: error.message ?? 'Unable to reach the external API.',
            status: '',
          })
        }
      }
    }

    loadHealth()

    return () => {
      ignore = true
    }
  }, [refreshKey])

  useEffect(() => {
    let ignore = false

    async function loadLeads() {
      setLeadsState((current) => ({ ...current, loading: true, error: '' }))

      try {
        const items = searchQuery.trim() ? await searchLeads(searchQuery) : await getLeads()

        if (!ignore) {
          setLeadsState({ loading: false, error: '', items })
        }
      } catch (error) {
        if (!ignore) {
          setLeadsState({
            loading: false,
            error: error.message ?? 'Unable to load leads.',
            items: [],
          })
        }
      }
    }

    const timeoutId = window.setTimeout(loadLeads, searchQuery.trim() ? 250 : 0)

    return () => {
      ignore = true
      window.clearTimeout(timeoutId)
    }
  }, [refreshKey, searchQuery])

  const stats = useMemo(() => {
    return leadsState.items.reduce(
      (summary, lead) => {
        const status = getLeadTemperature(lead.score)

        summary.total += 1
        summary.escalated += lead.escalated ? 1 : 0
        summary.scoreTotal += Number(lead.score ?? 0)

        if (status === 'hot') {
          summary.hot += 1
        } else if (status === 'warm') {
          summary.warm += 1
        } else {
          summary.cold += 1
        }

        return summary
      },
      { total: 0, hot: 0, warm: 0, cold: 0, escalated: 0, scoreTotal: 0 },
    )
  }, [leadsState.items])

  const sourceFilterOptions = useMemo(() => {
    const sourceCounts = leadsState.items.reduce((counts, lead) => {
      const sourceKey = getLeadSourceKey(lead)
      const current = counts.get(sourceKey) ?? {
        key: sourceKey,
        label: formatLeadSource(lead?.source),
        count: 0,
      }

      current.count += 1
      counts.set(sourceKey, current)

      return counts
    }, new Map())

    return [
      { key: 'all', label: 'All sources', count: leadsState.items.length },
      ...Array.from(sourceCounts.values()).sort((first, second) => first.label.localeCompare(second.label)),
    ]
  }, [leadsState.items])

  const filteredLeads = useMemo(() => {
    return leadsState.items.filter((lead) => {
      const matchesStatus = activeFilter === 'all' || getLeadTemperature(lead.score) === activeFilter
      const matchesSource = activeSourceFilter === 'all' || getLeadSourceKey(lead) === activeSourceFilter

      return matchesStatus && matchesSource
    })
  }, [activeFilter, activeSourceFilter, leadsState.items])

  const activeLeadId = useMemo(() => {
    if (filteredLeads.length === 0) {
      return ''
    }

    return filteredLeads.some((lead) => lead.id === selectedLeadId) ? selectedLeadId : filteredLeads[0].id
  }, [filteredLeads, selectedLeadId])

  useEffect(() => {
    if (!activeLeadId) {
      return
    }

    let ignore = false

    async function loadLeadDetail() {
      setDetailState({ ...EMPTY_DETAIL_STATE, loading: true, error: '' })

      try {
        const detail = await getLeadDetail(activeLeadId)

        if (!ignore) {
          setDetailState({
            loading: false,
            error: '',
            lead: detail?.lead ?? null,
            messages: Array.isArray(detail?.messages) ? detail.messages : [],
          })
        }
      } catch (error) {
        if (!ignore) {
          setDetailState({
            ...EMPTY_DETAIL_STATE,
            error: error.message ?? 'Unable to load this lead.',
          })
        }
      }
    }

    loadLeadDetail()

    return () => {
      ignore = true
    }
  }, [activeLeadId])

  useEffect(() => {
    if (!activeLeadId) {
      return
    }

    const activeLeadNode = leadItemRefs.current.get(activeLeadId)
    activeLeadNode?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeLeadId, leadsState.items.length])

  useEffect(() => {
    if (activeTab !== 'chat' || !activeLeadId) {
      return
    }

    conversationSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeLeadId, activeTab, detailState.messages.length])

  const detailViewState = activeLeadId ? detailState : EMPTY_DETAIL_STATE
  const averageScore = stats.total > 0 ? (stats.scoreTotal / stats.total).toFixed(1) : '0.0'
  const selectedLead = detailViewState.lead ?? filteredLeads.find((lead) => lead.id === activeLeadId) ?? null
  const selectedLeadTemperature = selectedLead ? getLeadTemperature(selectedLead.score) : 'cold'
  const showConversation = activeTab === 'chat'
  const exportDateRangeError = getExportDateRangeError(exportDateRange)
  const exportLeads = useMemo(() => {
    if (exportDateRangeError) {
      return []
    }

    return filterLeadsByCreatedAt(filteredLeads, exportDateRange)
  }, [exportDateRange, exportDateRangeError, filteredLeads])

  function handleLogout() {
    clearAdminAuthentication()
    navigate('/login', { replace: true })
  }

  function handleSelectLead(leadId) {
    setSelectedLeadId(leadId)
    setActiveTab('overview')
    setIsMobileDetailOpen(true)
  }

  function handleBackToList() {
    setIsMobileDetailOpen(false)
  }

  function handleSelectFilter(filterKey) {
    setActiveFilter(filterKey)
    setIsMobileDetailOpen(false)
  }

  function handleSelectSourceFilter(sourceKey) {
    setActiveSourceFilter(sourceKey)
    setIsMobileDetailOpen(false)
  }

  async function handleExport() {
    if (exportDateRangeError) {
      setExportMessage(exportDateRangeError)
      setTimeout(() => setExportMessage(null), 3000)
      return
    }

    const leads = exportLeads
    if (!leads.length || isExporting) return

    setIsExporting(true)
    try {
      const payload = []

      for (const lead of leads) {
        let detail = null
        let chats = ''

        if ((lead.message_count ?? 0) > 0) {
          try {
            detail = await getLeadDetail(lead.id)
            if (detail?.messages?.length > 0) {
              chats = detail.messages
                .map(
                  (message) =>
                    `[${formatExportDateTime(message.created_at)}] ${
                      message.role === 'user' ? 'Lead' : 'Assistant'
                    }: ${message.message_text}`,
                )
                .join('\n')
            }
          } catch {
            chats = 'Error fetching chat'
          }
        }

        payload.push({
          Name: safeText(lead.name, ''),
          Phone: safeText(lead.phone, ''),
          Date: formatExportDate(getFirstReceivedAt(detail?.messages, lead)),
          Score: lead.score ?? 0,
          Status: getLeadTemperature(lead.score).toUpperCase(),
          Source: formatLeadSource(lead.source),
          Messages: lead.message_count ?? 0,
          Escalated: lead.escalated ? 'Yes' : 'No',
          BudgetMin: lead.budget_min ?? '',
          BudgetMax: lead.budget_max ?? '',
          Estimate: lead.budget_estimate ?? '',
          Locations: formatPreferredLocations(lead.preferred_locations),
          Size: safeText(lead.size_preference, ''),
          Facing: safeText(lead.facing, ''),
          Created: formatExportDateTime(lead.created_at),
          Updated: formatExportDateTime(getLastMessageAt(detail?.messages, lead)),
          Chats: chats,
        })
      }

      const response = await fetch('https://n8n-bak.avlokai.com/webhook/cc87c364-355f-4cf1-9387-b6589bc009b0', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: payload }),
      })

      if (!response.ok) {
        throw new Error('Webhook error')
      }
      setExportMessage('Exported successfully')
      setTimeout(() => setExportMessage(null), 3000)
    } catch (err) {
      console.error('Export failed:', err)
      setExportMessage('Export failed')
      setTimeout(() => setExportMessage(null), 3000)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="crm-admin-page shell py-8 sm:py-10">
      <div className="crm-admin-shell p-4 sm:p-6 lg:p-8">
        <AdminHero
          activeFilter={activeFilter}
          activeSourceFilter={activeSourceFilter}
          averageScore={averageScore}
          exportDateRange={exportDateRange}
          exportDateRangeError={exportDateRangeError}
          exportLeadsCount={exportLeads.length}
          health={health}
          onExport={handleExport}
          isExporting={isExporting}
          onExportDateRangeChange={setExportDateRange}
          onLogout={handleLogout}
          onRefresh={() => setRefreshKey((value) => value + 1)}
          onSelectFilter={handleSelectFilter}
          onSelectSourceFilter={handleSelectSourceFilter}
          sourceFilterOptions={sourceFilterOptions}
          stats={stats}
        />

        <div className={`crm-dashboard-grid mt-8 ${isMobileDetailOpen ? 'crm-mobile-detail-open' : ''}`}>
          <LeadSidebar
            activeLeadId={activeLeadId}
            activeFilter={activeFilter}
            activeSourceFilter={activeSourceFilter}
            filteredCount={filteredLeads.length}
            leadItemRefs={leadItemRefs}
            leadsState={leadsState}
            onCloseMobileDetail={handleBackToList}
            onSelectLead={handleSelectLead}
            onSelectSourceFilter={handleSelectSourceFilter}
            searchQuery={searchQuery}
            setActiveFilter={handleSelectFilter}
            setSearchQuery={setSearchQuery}
            sourceFilterOptions={sourceFilterOptions}
            stats={stats}
            visibleLeads={filteredLeads}
          />

          <LeadWorkspace
            conversationSectionRef={conversationSectionRef}
            detailViewState={detailViewState}
            onBackToList={handleBackToList}
            onSelectTab={setActiveTab}
            selectedLead={selectedLead}
            selectedLeadTemperature={selectedLeadTemperature}
            showConversation={showConversation}
            activeTab={activeTab}
          />
        </div>
      </div>

      {exportMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-brand-ink px-6 py-4 text-sm font-medium text-white shadow-xl">
          {exportMessage}
        </div>
      )}
    </div>
  )
}

function AdminHero({
  activeFilter,
  activeSourceFilter,
  averageScore,
  exportDateRange,
  exportDateRangeError,
  exportLeadsCount,
  health,
  isExporting,
  onExport,
  onExportDateRangeChange,
  onLogout,
  onRefresh,
  onSelectFilter,
  onSelectSourceFilter,
  sourceFilterOptions,
  stats,
}) {
  return (
    <section className="crm-admin-hero crm-fade-up">
      <div className="crm-admin-hero-card relative overflow-hidden rounded-[32px] border border-brand-ink/8 bg-white/88 p-6 shadow-[0_22px_60px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="crm-admin-orb crm-admin-orb-primary" />
        <div className="crm-admin-orb crm-admin-orb-secondary" />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <p className="text-kicker">Workspace</p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-brand-ink sm:text-5xl">
              Leads
            </h1>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <HealthBadge health={health} />
              <button className="button-secondary" onClick={onRefresh} type="button">
                Refresh
              </button>
              <Link className="button-secondary" to="/">
                Home
              </Link>
              <button className="button-secondary" onClick={onLogout} type="button">
                Sign out
              </button>
            </div>

            <ExportControls
              activeSourceFilter={activeSourceFilter}
              exportDateRange={exportDateRange}
              exportDateRangeError={exportDateRangeError}
              exportLeadsCount={exportLeadsCount}
              isExporting={isExporting}
              onExport={onExport}
              onExportDateRangeChange={onExportDateRangeChange}
              onSelectSourceFilter={onSelectSourceFilter}
              sourceFilterOptions={sourceFilterOptions}
            />
          </div>

          <div className="grid w-full gap-4 sm:grid-cols-2 xl:w-[520px] xl:grid-cols-3">
            <StatCard
              label="All"
              value={stats.total}
              description="Leads"
              isActive={activeFilter === 'all'}
              onClick={() => onSelectFilter('all')}
            />
            <StatCard
              label="Priority"
              value={stats.hot}
              accent="text-red-600"
              description="High score"
              isActive={activeFilter === 'hot'}
              onClick={() => onSelectFilter('hot')}
            />
            <StatCard
              label="Active"
              value={stats.warm}
              accent="text-amber-600"
              description="Mid score"
              isActive={activeFilter === 'warm'}
              onClick={() => onSelectFilter('warm')}
            />
            <StatCard
              label="Others"
              value={stats.cold}
              accent="text-slate-700"
              description="Low score"
              isActive={activeFilter === 'cold'}
              onClick={() => onSelectFilter('cold')}
            />
            <StatCard label="Escalated" value={stats.escalated} accent="text-emerald-600" description="Flagged" />
            <StatCard label="Avg. Score" value={averageScore} accent="text-sky-600" description="Average" />
          </div>
        </div>
      </div>
    </section>
  )
}

function LeadSidebar({
  activeFilter,
  activeLeadId,
  activeSourceFilter,
  filteredCount,
  leadItemRefs,
  leadsState,
  onCloseMobileDetail,
  onSelectLead,
  onSelectSourceFilter,
  searchQuery,
  setActiveFilter,
  setSearchQuery,
  sourceFilterOptions,
  stats,
  visibleLeads,
}) {
  const filters = [
    { key: 'all', label: 'All', count: leadsState.items.length },
    { key: 'hot', label: 'Priority', count: stats.hot },
    { key: 'warm', label: 'Active', count: stats.warm },
    { key: 'cold', label: 'Others', count: stats.cold },
  ]

  return (
    <aside className="crm-admin-panel crm-lead-sidebar crm-fade-up crm-fade-up-delay-1 p-5">
      <div className="crm-lead-sidebar-top">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-muted">People</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-brand-ink">Lead list</h2>
          </div>
          <div className="rounded-full border border-brand-accent/15 bg-brand-soft px-3 py-2 text-xs font-semibold text-brand-ink">
            {filteredCount}
          </div>
        </div>

        <label className="mt-5 block text-sm font-semibold text-brand-ink">
          Search
          <input
            className="crm-lead-search mt-2 w-full rounded-2xl border border-brand-ink/10 bg-white px-4 py-3 outline-none transition focus:border-brand-accent"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Name or number"
          />
        </label>

        <div className="crm-filter-row mt-5">
          {filters.map((filterOption) => (
            <button
              key={filterOption.key}
              type="button"
              className={`crm-filter-chip ${activeFilter === filterOption.key ? 'crm-filter-chip-active' : ''}`}
              onClick={() => {
                onCloseMobileDetail()
                setActiveFilter(filterOption.key)
              }}
            >
              <span>{filterOption.label}</span>
              <span className="crm-filter-chip-count">{filterOption.count}</span>
            </button>
          ))}
        </div>

        <label className="mt-5 block text-sm font-semibold text-brand-ink">
          Source
          <select
            className="crm-lead-search mt-2 w-full rounded-2xl border border-brand-ink/10 bg-white px-4 py-3 outline-none transition focus:border-brand-accent"
            value={activeSourceFilter}
            onChange={(event) => {
              onCloseMobileDetail()
              onSelectSourceFilter(event.target.value)
            }}
          >
            {sourceFilterOptions.map((sourceOption) => (
              <option key={sourceOption.key} value={sourceOption.key}>
                {sourceOption.label} ({sourceOption.count})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="crm-lead-scroll mt-5 space-y-3 pr-1">
        {leadsState.loading ? <EmptyState message="Loading..." /> : null}
        {!leadsState.loading && leadsState.error ? <ErrorState message={leadsState.error} /> : null}
        {!leadsState.loading && !leadsState.error && visibleLeads.length === 0 ? (
          <EmptyState
            message={
              searchQuery.trim()
                ? 'No matches'
                : activeFilter === 'all'
                  ? 'No leads'
                  : 'No leads'
            }
          />
        ) : null}

            {!leadsState.loading && !leadsState.error
          ? visibleLeads.map((lead, index) => {
              const isActive = lead.id === activeLeadId
              const leadTemperature = getLeadTemperature(lead.score)
              const badgeClass = statusStyles[leadTemperature] ?? statusStyles.cold

              return (
                <button
                  key={lead.id}
                  ref={(node) => {
                    if (node) {
                      leadItemRefs.current.set(lead.id, node)
                    } else {
                      leadItemRefs.current.delete(lead.id)
                    }
                  }}
                  type="button"
                  onClick={() => onSelectLead(lead.id)}
                  className={`crm-lead-card crm-fade-up-subtle w-full rounded-[26px] border p-4 text-left ${
                    isActive ? 'crm-lead-card-active border-brand-accent/40 bg-brand-soft/80' : 'border-brand-ink/10 bg-white/88'
                  }`}
                  style={{ '--crm-enter-delay': `${Math.min(index * 35, 280)}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="crm-avatar shrink-0">{getInitials(lead.name)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-brand-ink">{safeText(lead.name, 'Unknown lead')}</p>
                          <p className="mt-1 truncate text-sm text-brand-muted">{safeText(lead.phone, 'Phone unavailable')}</p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${badgeClass}`}>
                          {formatTemperatureLabel(leadTemperature)}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <InlineMetric label="Score" value={lead.score ?? 0} />
                        <InlineMetric label="Chat" value={lead.message_count ?? 0} />
                        <InlineMetric label="Seen" value={formatShortDate(lead.last_message_at)} />
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-brand-muted">
                        <span>{formatBudgetRange(lead)}</span>
                        <span className="crm-source-pill">{formatLeadSource(lead.source)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })
          : null}
      </div>
    </aside>
  )
}

function ExportControls({
  activeSourceFilter,
  exportDateRange,
  exportDateRangeError,
  exportLeadsCount,
  isExporting,
  onExport,
  onExportDateRangeChange,
  onSelectSourceFilter,
  sourceFilterOptions,
}) {
  return (
    <div className="mt-6 rounded-[24px] border border-brand-ink/8 bg-white/82 p-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
        <label className="block text-xs font-bold uppercase tracking-[0.16em] text-brand-muted">
          From
          <ExportDateField
            label="From"
            value={exportDateRange.from}
            onChange={(value) => onExportDateRangeChange((current) => ({ ...current, from: value }))}
          />
        </label>
        <label className="block text-xs font-bold uppercase tracking-[0.16em] text-brand-muted">
          To
          <ExportDateField
            label="To"
            value={exportDateRange.to}
            onChange={(value) => onExportDateRangeChange((current) => ({ ...current, to: value }))}
          />
        </label>
        <label className="block text-xs font-bold uppercase tracking-[0.16em] text-brand-muted">
          Source
          <select
            className="crm-lead-search mt-2 block w-full rounded-2xl border border-brand-ink/10 bg-white px-4 py-3 text-sm font-medium normal-case tracking-normal text-brand-ink outline-none transition focus:border-brand-accent"
            value={activeSourceFilter}
            onChange={(event) => onSelectSourceFilter(event.target.value)}
          >
            {sourceFilterOptions.map((sourceOption) => (
              <option key={sourceOption.key} value={sourceOption.key}>
                {sourceOption.label} ({sourceOption.count})
              </option>
            ))}
          </select>
        </label>
        <button
          className="button-secondary w-full justify-center md:w-auto"
          onClick={onExport}
          disabled={isExporting || Boolean(exportDateRangeError) || exportLeadsCount === 0}
          type="button"
        >
          {isExporting ? 'Exporting...' : `Export ${exportLeadsCount} leads`}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-brand-muted">
        <span>{exportDateRangeError || `${exportLeadsCount} matching created date`}</span>
        {(exportDateRange.from || exportDateRange.to) && (
          <button
            className="font-bold text-brand-accent transition hover:text-brand-ink"
            onClick={() => onExportDateRangeChange(getDefaultExportDateRange())}
            type="button"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

function ExportDateField({ label, onChange, value }) {
  const inputRef = useRef(null)

  function openPicker() {
    const input = inputRef.current
    if (!input) {
      return
    }

    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker()
      } else {
        input.focus()
        input.click()
      }
    } catch {
      input.focus()
    }
  }

  return (
    <span className="relative mt-2 block">
      <button
        className="crm-lead-search block w-full rounded-2xl border border-brand-ink/10 bg-white px-4 py-3 text-left text-sm font-medium normal-case tracking-normal text-brand-ink outline-none transition focus:border-brand-accent"
        onClick={openPicker}
        type="button"
      >
        {formatDatePickerDisplay(value) || 'Select date and time'}
      </button>
      <input
        aria-label={label}
        className="absolute left-4 top-1/2 h-px w-px -translate-y-1/2 opacity-0"
        ref={inputRef}
        type="datetime-local"
        step="1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </span>
  )
}

function LeadWorkspace({
  activeTab,
  conversationSectionRef,
  detailViewState,
  onBackToList,
  onSelectTab,
  selectedLead,
  selectedLeadTemperature,
  showConversation,
}) {
  if (detailViewState.error && !selectedLead) {
    return <ErrorState message={detailViewState.error} />
  }

  if (!selectedLead) {
    return <EmptyState message="No lead selected" />
  }

  const leadPhone = normalizePhoneNumber(selectedLead.phone)
  const whatsappLink = leadPhone ? `https://wa.me/${leadPhone}` : ''

  return (
    <article className="crm-admin-panel crm-workspace-panel crm-fade-up crm-fade-up-delay-2 overflow-hidden">
      <div className="crm-lead-hero crm-workspace-header px-5 py-6 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-start gap-4">
            <div className="crm-avatar crm-avatar-lg shrink-0">{getInitials(selectedLead.name)}</div>
            <div className="min-w-0">
              <div className="mb-4 lg:hidden">
                <button className="button-secondary xl:hidden" onClick={onBackToList} type="button">
                  Back
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-3xl font-bold text-brand-ink">{safeText(selectedLead.name, 'Unknown lead')}</h2>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${
                    statusStyles[selectedLeadTemperature] ?? statusStyles.cold
                  }`}
                >
                  {formatTemperatureLabel(selectedLeadTemperature)}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-brand-muted">{safeText(selectedLead.phone, 'Unavailable')}</p>

              <div className="mt-5 flex flex-wrap gap-3">
                {leadPhone ? (
                  <a className="button-primary" href={`tel:${leadPhone}`}>
                    Call
                  </a>
                ) : null}
                {whatsappLink ? (
                  <a className="button-secondary" href={whatsappLink} rel="noreferrer" target="_blank">
                    WhatsApp
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid min-w-[220px] gap-3 sm:grid-cols-2">
            <HighlightCard label="Score" value={selectedLead.score ?? 0} />
            <HighlightCard label="Updated" value={formatShortDate(selectedLead.updated_at ?? selectedLead.created_at)} />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryChip label="Source" value={formatLeadSource(selectedLead.source)} />
          <SummaryChip label="Escalated" value={selectedLead.escalated ? 'Yes' : 'No'} />
          <SummaryChip label="Chat" value={selectedLead.message_count ?? 0} />
          <SummaryChip label="Budget" value={formatBudgetRange(selectedLead)} />
          <SummaryChip label="Last seen" value={formatShortDate(selectedLead.last_message_at)} />
        </div>
      </div>

      <div className="crm-workspace-scroll space-y-6 px-5 py-6 sm:px-6">
        {detailViewState.loading ? (
          <div className="rounded-3xl border border-dashed border-brand-ink/15 bg-brand-soft/40 px-4 py-5 text-sm text-brand-muted">
            Loading...
          </div>
        ) : null}
        {detailViewState.error ? <ErrorState message={detailViewState.error} /> : null}

        <div className="crm-tabs mt-0">
          <button
            className={`crm-tab ${activeTab === 'overview' ? 'crm-tab-active' : ''}`}
            onClick={() => onSelectTab('overview')}
            type="button"
          >
            Overview
          </button>
          <button
            className={`crm-tab ${activeTab === 'chat' ? 'crm-tab-active' : ''}`}
            onClick={() => onSelectTab('chat')}
            type="button"
          >
            Chat
            <span className="crm-filter-chip-count">{detailViewState.messages.length}</span>
          </button>
        </div>

        {!showConversation ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DetailCard label="Name" value={safeText(selectedLead.name, 'Unknown lead')} />
            <DetailCard label="Phone" value={safeText(selectedLead.phone, 'Unavailable')} />
            <DetailCard label="Source" value={formatLeadSource(selectedLead.source)} />
            <DetailCard label="Status" value={formatTemperatureLabel(selectedLeadTemperature)} />
            <DetailCard label="Score" value={selectedLead.score ?? 0} />
            <DetailCard label="Budget" value={formatBudgetRange(selectedLead)} />
            <DetailCard label="Preferred Locations" value={formatPreferredLocations(selectedLead.preferred_locations)} />
            <DetailCard label="Size Preference" value={safeText(selectedLead.size_preference, 'Not captured')} />
            <DetailCard label="Facing" value={safeText(selectedLead.facing, 'Not captured')} />
            <DetailCard label="Updated" value={formatDateTime(selectedLead.updated_at ?? selectedLead.created_at)} />
          </div>
        ) : (
          <div ref={conversationSectionRef} className="crm-section-card crm-conversation-panel p-4">
            {detailViewState.messages.length === 0 ? (
              <p className="text-sm text-brand-muted">No chat yet.</p>
            ) : (
              <div className="crm-conversation-scroll space-y-3">
                {detailViewState.messages.map((message, index) => {
                  const isUser = message.role === 'user'

                  return (
                    <article
                      key={message.id}
                      className={`crm-chat-message rounded-3xl border px-4 py-4 ${
                        isUser
                          ? 'crm-chat-message-user bg-white border-brand-ink/10'
                          : 'crm-chat-message-assistant border-brand-accent/15 bg-brand-soft/75'
                      }`}
                      style={{ '--crm-enter-delay': `${Math.min(index * 45, 240)}ms` }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-muted">
                          {isUser ? 'Lead' : 'Assistant'}
                        </p>
                        <p className="text-xs text-brand-muted">{formatDateTime(message.created_at)}</p>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-brand-ink">
                        {safeText(message.message_text, '[Empty message]')}
                      </p>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

function HealthBadge({ health }) {
  if (health.loading) {
    return <div className="rounded-full border border-brand-ink/10 bg-white px-4 py-2 text-sm font-semibold text-brand-muted">Checking</div>
  }

  if (health.error) {
    return <div className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">Offline</div>
  }

  return <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">Online</div>
}

function StatCard({ accent = 'text-brand-ink', description, isActive = false, label, onClick, value }) {
  const sharedClassName = `crm-top-stat rounded-[24px] border border-white/80 bg-white/92 p-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)] ${
    isActive ? 'crm-top-stat-active' : ''
  }`

  if (onClick) {
    return (
      <button className={`${sharedClassName} text-left`} onClick={onClick} type="button">
        <p className="text-sm font-semibold text-brand-muted">{label}</p>
        <p className={`mt-3 font-display text-3xl font-bold ${accent}`}>{value}</p>
        <p className="mt-2 text-xs font-medium leading-5 text-brand-muted">{description}</p>
      </button>
    )
  }

  return (
    <div className={sharedClassName}>
      <p className="text-sm font-semibold text-brand-muted">{label}</p>
      <p className={`mt-3 font-display text-3xl font-bold ${accent}`}>{value}</p>
      <p className="mt-2 text-xs font-medium leading-5 text-brand-muted">{description}</p>
    </div>
  )
}

function InlineMetric({ label, value }) {
  return (
    <div className="crm-inline-metric rounded-2xl border border-brand-ink/8 bg-white/95 px-3 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-brand-ink">{value}</p>
    </div>
  )
}

function DetailCard({ label, value }) {
  return (
    <div className="crm-detail-card rounded-3xl border border-brand-ink/10 bg-slate-50/90 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-muted">{label}</p>
      <p className="mt-2 text-sm font-semibold text-brand-ink">{value}</p>
    </div>
  )
}

function HighlightCard({ label, value }) {
  return (
    <div className="crm-highlight-card rounded-[24px] border border-white/70 bg-white/92 px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-brand-ink">{value}</p>
    </div>
  )
}

function SummaryChip({ label, value }) {
  return (
    <div className="crm-summary-chip rounded-2xl border border-white/70 bg-white/88 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-brand-ink">{value}</p>
    </div>
  )
}

function EmptyState({ message }) {
  return <div className="rounded-3xl border border-dashed border-brand-ink/15 bg-slate-50 px-4 py-6 text-sm text-brand-muted">{message}</div>
}

function ErrorState({ message }) {
  return <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-6 text-sm font-semibold text-red-700">{message}</div>
}

function formatBudgetRange(lead) {
  const min = lead?.budget_min
  const max = lead?.budget_max
  const estimate = lead?.budget_estimate

  if (min || max) {
    return [min ? formatCurrency(min) : 'Any', max ? formatCurrency(max) : 'Any'].join(' - ')
  }

  if (estimate) {
    return formatCurrency(estimate)
  }

  return 'Not captured'
}

function formatCurrency(value) {
  const numeric = Number(value)

  if (!Number.isFinite(numeric)) {
    return safeText(value, 'Not captured')
  }

  return `${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: Number.isInteger(numeric) ? 0 : 1,
    maximumFractionDigits: 2,
  }).format(numeric)} Cr`
}

function formatPreferredLocations(value) {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : 'Manikonda'
  }

  return safeText(value, 'Manikonda')
}

function safeText(value, fallback) {
  if (value === null || value === undefined) {
    return fallback
  }

  const text = String(value).trim()
  if (!text || text.toLowerCase() === 'undefined' || text.toLowerCase() === 'null') {
    return fallback
  }

  return text
}

function getLeadSourceKey(lead) {
  return safeText(lead?.source, 'unknown').toLowerCase()
}

function formatLeadSource(value) {
  const source = safeText(value, 'Unknown')

  return source
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      const lowerPart = part.toLowerCase()

      if (['utm', 'seo', 'ppc'].includes(lowerPart)) {
        return lowerPart.toUpperCase()
      }

      if (lowerPart === 'fb') {
        return 'Facebook'
      }

      return `${lowerPart.charAt(0).toUpperCase()}${lowerPart.slice(1)}`
    })
    .join(' ')
}

function getFirstReceivedAt(messages, lead) {
  if (Array.isArray(messages) && messages.length > 0) {
    const firstUserMessage = messages.find((message) => message?.role === 'user' && message?.created_at)
    if (firstUserMessage?.created_at) {
      return firstUserMessage.created_at
    }

    const firstMessage = messages.find((message) => message?.created_at)
    if (firstMessage?.created_at) {
      return firstMessage.created_at
    }
  }

  return lead?.created_at ?? ''
}

function getLastMessageAt(messages, lead) {
  if (Array.isArray(messages) && messages.length > 0) {
    const lastMessage = [...messages].reverse().find((message) => message?.created_at)
    if (lastMessage?.created_at) {
      return lastMessage.created_at
    }
  }

  return lead?.last_message_at ?? lead?.updated_at ?? lead?.created_at ?? ''
}

function filterLeadsByCreatedAt(leads, range) {
  const hasRange = Boolean(range.from || range.to)
  if (!hasRange) {
    return leads
  }

  const fromTime = parseDateInputTime(range.from)
  const toTime = parseDateInputTime(range.to)

  return leads.filter((lead) => {
    const createdAt = new Date(lead?.created_at).getTime()
    if (!Number.isFinite(createdAt)) {
      return false
    }

    if (fromTime !== null && createdAt < fromTime) {
      return false
    }

    if (toTime !== null && createdAt > toTime) {
      return false
    }

    return true
  })
}

function getExportDateRangeError(range) {
  const fromTime = parseDateInputTime(range.from)
  const toTime = parseDateInputTime(range.to)

  if (range.from && fromTime === null) {
    return 'Enter a valid from timestamp'
  }

  if (range.to && toTime === null) {
    return 'Enter a valid to timestamp'
  }

  if (fromTime !== null && toTime !== null && fromTime > toTime) {
    return 'From timestamp must be before to timestamp'
  }

  return ''
}

function parseDateInputTime(value) {
  if (!value) {
    return null
  }

  const trimmedValue = String(value).trim()
  const customMatch = trimmedValue.match(
    /^(\d{1,2})-([a-z]+)-(\d{4})(?:\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm))?$/i,
  )

  if (customMatch) {
    const [, dayValue, monthValue, yearValue, hourValue, minuteValue = '0', meridiemValue] = customMatch
    const monthIndex = getExportMonthIndex(monthValue)

    if (monthIndex === -1) {
      return null
    }

    let hours = Number(hourValue ?? 0)
    const minutes = Number(minuteValue)

    if (meridiemValue) {
      if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
        return null
      }

      const meridiem = meridiemValue.toLowerCase()
      if (meridiem === 'pm' && hours < 12) {
        hours += 12
      }

      if (meridiem === 'am' && hours === 12) {
        hours = 0
      }
    } else if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null
    }

    const parsed = new Date(Number(yearValue), monthIndex, Number(dayValue), hours, minutes)
    if (
      parsed.getFullYear() !== Number(yearValue) ||
      parsed.getMonth() !== monthIndex ||
      parsed.getDate() !== Number(dayValue)
    ) {
      return null
    }

    return parsed.getTime()
  }

  const fallbackTime = new Date(trimmedValue).getTime()
  return Number.isNaN(fallbackTime) ? null : fallbackTime
}

function getDefaultExportDateRange() {
  return { from: '', to: getCurrentDateTimeInputValue() }
}

function getCurrentDateTimeInputValue() {
  const now = new Date()
  const timezoneOffset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 19)
}

function getExportMonthIndex(value) {
  return getExportMonthNames().indexOf(String(value ?? '').trim().toLowerCase())
}

function getExportMonthNames() {
  return [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ]
}

function formatExportDate(value) {
  if (!value) {
    return ''
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return formatExportDatePart(parsed)
}

function formatExportDateTime(value) {
  if (!value) {
    return ''
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return `${formatExportDatePart(parsed)} ${formatExportTimePart(parsed)}`
}

function formatDatePickerDisplay(value) {
  return formatExportDateTime(value)
}

function formatExportDatePart(date) {
  const months = getExportMonthNames()

  return `${date.getDate()}-${months[date.getMonth()]}-${date.getFullYear()}`
}

function formatExportTimePart(date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

function formatDateTime(value) {
  if (!value) {
    return 'N/A'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'N/A'
  }

  return `${formatExportDatePart(parsed)} ${formatExportTimePart(parsed)}`
}

function formatShortDate(value) {
  if (!value) {
    return 'N/A'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'N/A'
  }

  return formatExportDatePart(parsed)
}

function getInitials(value) {
  const text = safeText(value, 'Unknown Lead')
  const initials = text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return initials || 'UL'
}

function getLeadTemperature(score) {
  const numericScore = Number(score ?? 0)

  if (numericScore >= 75) {
    return 'hot'
  }

  if (numericScore >= 40) {
    return 'warm'
  }

  return 'cold'
}

function formatTemperatureLabel(value) {
  const text = String(value ?? 'cold').trim().toLowerCase()
  if (text === 'hot') {
    return 'Priority'
  }

  if (text === 'warm') {
    return 'Active'
  }

  return 'Others'
}

function normalizePhoneNumber(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits.length >= 10 ? digits : ''
}
