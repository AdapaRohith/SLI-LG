import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getHealth,
  getLeadDetail,
  getLeadInsights,
  getLeads,
  getLeadSignals,
  searchLeads,
} from '../lib/api'
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
  insights: {},
  signals: [],
}

export function AdminPage() {
  const navigate = useNavigate()
  const [health, setHealth] = useState({ loading: true, error: '', status: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [leadsState, setLeadsState] = useState({ loading: true, error: '', items: [] })
  const [activeLeadId, setActiveLeadId] = useState('')
  const [detailState, setDetailState] = useState(EMPTY_DETAIL_STATE)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showConversation, setShowConversation] = useState(false)

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
          setActiveLeadId((current) => {
            if (items.length === 0) {
              return ''
            }

            return items.some((lead) => lead.id === current) ? current : items[0].id
          })
        }
      } catch (error) {
        if (!ignore) {
          setLeadsState({
            loading: false,
            error: error.message ?? 'Unable to load leads.',
            items: [],
          })
          setActiveLeadId('')
        }
      }
    }

    const timeoutId = window.setTimeout(loadLeads, searchQuery.trim() ? 250 : 0)

    return () => {
      ignore = true
      window.clearTimeout(timeoutId)
    }
  }, [refreshKey, searchQuery])

  useEffect(() => {
    if (!activeLeadId) {
      return
    }

    let ignore = false

    async function loadLeadDetail() {
      setDetailState((current) => ({ ...current, loading: true, error: '' }))

      try {
        const [detail, insights, signals] = await Promise.all([
          getLeadDetail(activeLeadId),
          getLeadInsights(activeLeadId),
          getLeadSignals(activeLeadId),
        ])

        if (!ignore) {
          setDetailState({
            loading: false,
            error: '',
            lead: detail?.lead ?? null,
            messages: Array.isArray(detail?.messages) ? detail.messages : [],
            insights: insights && typeof insights === 'object' ? insights : {},
            signals: Array.isArray(signals) ? signals : [],
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
    setShowConversation(false)
  }, [activeLeadId])

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

  const detailViewState = activeLeadId ? detailState : EMPTY_DETAIL_STATE
  const averageScore = stats.total > 0 ? (stats.scoreTotal / stats.total).toFixed(1) : '0.0'
  const selectedLead = detailViewState.lead ?? leadsState.items.find((lead) => lead.id === activeLeadId) ?? null
  const selectedLeadTemperature = selectedLead ? getLeadTemperature(selectedLead.score) : 'cold'

  function handleLogout() {
    clearAdminAuthentication()
    navigate('/login', { replace: true })
  }

  return (
    <div className="shell py-8 sm:py-10">
      <div className="crm-admin-shell p-4 sm:p-6 lg:p-8">
        <AdminHero
          averageScore={averageScore}
          health={health}
          onLogout={handleLogout}
          onRefresh={() => setRefreshKey((value) => value + 1)}
          stats={stats}
        />

        <div className="mt-8 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <LeadSidebar
            activeLeadId={activeLeadId}
            leadsState={leadsState}
            searchQuery={searchQuery}
            setActiveLeadId={setActiveLeadId}
            setSearchQuery={setSearchQuery}
            stats={stats}
          />

          <LeadWorkspace
            detailViewState={detailViewState}
            selectedLead={selectedLead}
            selectedLeadTemperature={selectedLeadTemperature}
            showConversation={showConversation}
            onToggleConversation={() => setShowConversation((current) => !current)}
          />
        </div>
      </div>
    </div>
  )
}

function AdminHero({ averageScore, health, onLogout, onRefresh, stats }) {
  return (
    <section className="crm-admin-hero">
      <div className="relative overflow-hidden rounded-[32px] border border-brand-ink/8 bg-white/88 p-6 shadow-[0_22px_60px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="crm-admin-orb crm-admin-orb-primary" />
        <div className="crm-admin-orb crm-admin-orb-secondary" />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <p className="text-kicker">Sales Workspace</p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-brand-ink sm:text-5xl">
              Lead Dashboard
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-brand-muted sm:text-base">
              A cleaner CRM view for triaging inbound leads, reviewing intent, and opening chat history only when the team needs it.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <HealthBadge health={health} />
              <button className="button-secondary" onClick={onRefresh} type="button">
                Refresh Data
              </button>
              <Link className="button-secondary" to="/">
                View Landing Page
              </Link>
              <button className="button-secondary" onClick={onLogout} type="button">
                Log Out
              </button>
            </div>
          </div>

          <div className="grid w-full gap-4 sm:grid-cols-2 xl:w-[520px] xl:grid-cols-3">
            <StatCard label="Total Leads" value={stats.total} description="Tracked in workspace" />
            <StatCard label="Hot" value={stats.hot} accent="text-red-600" description="Ready for fast follow-up" />
            <StatCard label="Warm" value={stats.warm} accent="text-amber-600" description="Qualified and active" />
            <StatCard label="Cold" value={stats.cold} accent="text-slate-700" description="Needs more nurturing" />
            <StatCard label="Escalated" value={stats.escalated} accent="text-emerald-600" description="Handed to team" />
            <StatCard label="Avg. Score" value={averageScore} accent="text-sky-600" description="Across visible leads" />
          </div>
        </div>
      </div>
    </section>
  )
}

function LeadSidebar({ activeLeadId, leadsState, searchQuery, setActiveLeadId, setSearchQuery, stats }) {
  return (
    <aside className="crm-admin-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-muted">Pipeline</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-brand-ink">Lead Queue</h2>
        </div>
        <div className="rounded-full border border-brand-accent/15 bg-brand-soft px-3 py-2 text-xs font-semibold text-brand-ink">
          {leadsState.items.length} visible
        </div>
      </div>

      <label className="mt-5 block text-sm font-semibold text-brand-ink">
        Search leads
        <input
          className="mt-2 w-full rounded-2xl border border-brand-ink/10 bg-white px-4 py-3 outline-none transition focus:border-brand-accent"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Name or phone"
        />
      </label>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <MiniStat label="Hot" value={stats.hot} tone="text-red-600" />
        <MiniStat label="Warm" value={stats.warm} tone="text-amber-600" />
        <MiniStat label="Cold" value={stats.cold} tone="text-slate-700" />
      </div>

      <div className="crm-lead-scroll mt-5 space-y-3 pr-1">
        {leadsState.loading ? <EmptyState message="Loading leads from the API..." /> : null}
        {!leadsState.loading && leadsState.error ? <ErrorState message={leadsState.error} /> : null}
        {!leadsState.loading && !leadsState.error && leadsState.items.length === 0 ? (
          <EmptyState message={searchQuery.trim() ? 'No leads matched this search.' : 'No leads are available yet.'} />
        ) : null}

        {!leadsState.loading && !leadsState.error
          ? leadsState.items.map((lead) => {
              const isActive = lead.id === activeLeadId
              const leadTemperature = getLeadTemperature(lead.score)
              const badgeClass = statusStyles[leadTemperature] ?? statusStyles.cold

              return (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => setActiveLeadId(lead.id)}
                  className={`crm-lead-card w-full rounded-[26px] border p-4 text-left transition ${
                    isActive ? 'crm-lead-card-active border-brand-accent/40 bg-brand-soft/80' : 'border-brand-ink/10 bg-white/88'
                  }`}
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
                        <InlineMetric label="Msgs" value={lead.message_count ?? 0} />
                        <InlineMetric label="Status" value={formatTemperatureLabel(leadTemperature)} />
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-brand-muted">
                        <span>{formatBudgetRange(lead)}</span>
                        <span>Seen {formatDateTime(lead.last_message_at)}</span>
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

function LeadWorkspace({ detailViewState, onToggleConversation, selectedLead, selectedLeadTemperature, showConversation }) {
  if (detailViewState.error && !selectedLead) {
    return <ErrorState message={detailViewState.error} />
  }

  if (!selectedLead) {
    return <EmptyState message="Select a lead to inspect profile details, intent, and scoring history." />
  }

  return (
    <article className="crm-admin-panel overflow-hidden">
      <div className="crm-lead-hero px-5 py-6 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-start gap-4">
            <div className="crm-avatar crm-avatar-lg shrink-0">{getInitials(selectedLead.name)}</div>
            <div className="min-w-0">
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
              <p className="mt-3 max-w-2xl text-sm leading-7 text-brand-muted">
                Lead details are visible immediately for quick qualification. Conversation stays tucked away until someone explicitly opens it.
              </p>
            </div>
          </div>

          <div className="grid min-w-[220px] gap-3 sm:grid-cols-2">
            <HighlightCard label="Score" value={selectedLead.score ?? 0} />
            <HighlightCard label="Updated" value={formatDateTime(selectedLead.updated_at ?? selectedLead.created_at)} />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryChip label="Escalated" value={selectedLead.escalated ? 'Yes' : 'No'} />
          <SummaryChip label="Messages" value={selectedLead.message_count ?? 0} />
          <SummaryChip label="Budget" value={formatBudgetRange(selectedLead)} />
          <SummaryChip label="Status" value={formatTemperatureLabel(selectedLeadTemperature)} />
        </div>
      </div>

      <div className="space-y-6 px-5 py-6 sm:px-6">
        {detailViewState.loading ? (
          <div className="rounded-3xl border border-dashed border-brand-ink/15 bg-brand-soft/40 px-4 py-5 text-sm text-brand-muted">
            Loading deeper lead data...
          </div>
        ) : null}
        {detailViewState.error ? <ErrorState message={detailViewState.error} /> : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DetailCard label="Name" value={safeText(selectedLead.name, 'Unknown lead')} />
          <DetailCard label="Phone" value={safeText(selectedLead.phone, 'Unavailable')} />
          <DetailCard label="Status" value={formatTemperatureLabel(selectedLeadTemperature)} />
          <DetailCard label="Score" value={selectedLead.score ?? 0} />
          <DetailCard label="Preferred Locations" value={formatPreferredLocations(selectedLead.preferred_locations)} />
          <DetailCard label="Size Preference" value={safeText(selectedLead.size_preference, 'Not captured')} />
          <DetailCard label="Facing" value={safeText(selectedLead.facing, 'Not captured')} />
        </div>

        <div className="crm-section-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="font-display text-xl font-bold text-brand-ink">Conversation</h3>
              <p className="mt-1 text-sm text-brand-muted">
                Hidden by default so the team can focus on lead qualification first.
              </p>
            </div>
            <button className="button-secondary" onClick={onToggleConversation} type="button">
              {showConversation ? 'Hide Chat' : `Show Chat${detailViewState.messages.length ? ` (${detailViewState.messages.length})` : ''}`}
            </button>
          </div>

          {!showConversation ? (
            <div className="mt-4 rounded-2xl border border-dashed border-brand-ink/15 bg-slate-50 px-4 py-6 text-sm text-brand-muted">
              Conversation is collapsed. Open it only when someone wants to review the full transcript.
            </div>
          ) : detailViewState.messages.length === 0 ? (
            <p className="mt-4 text-sm text-brand-muted">This lead does not have any chat history yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {detailViewState.messages.map((message) => {
                const isUser = message.role === 'user'

                return (
                  <article
                    key={message.id}
                    className={`rounded-3xl border px-4 py-4 ${
                      isUser ? 'bg-white border-brand-ink/10' : 'border-brand-accent/15 bg-brand-soft/75'
                    }`}
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
      </div>
    </article>
  )
}

function HealthBadge({ health }) {
  if (health.loading) {
    return <div className="rounded-full border border-brand-ink/10 bg-white px-4 py-2 text-sm font-semibold text-brand-muted">Checking API...</div>
  }

  if (health.error) {
    return <div className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">API unavailable</div>
  }

  return <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">{health.status}</div>
}

function StatCard({ accent = 'text-brand-ink', description, label, value }) {
  return (
    <div className="rounded-[24px] border border-white/80 bg-white/92 p-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
      <p className="text-sm font-semibold text-brand-muted">{label}</p>
      <p className={`mt-3 font-display text-3xl font-bold ${accent}`}>{value}</p>
      <p className="mt-2 text-xs font-medium leading-5 text-brand-muted">{description}</p>
    </div>
  )
}

function InlineMetric({ label, value }) {
  return (
    <div className="rounded-2xl border border-brand-ink/8 bg-white/95 px-3 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-brand-ink">{value}</p>
    </div>
  )
}

function DetailCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-brand-ink/10 bg-slate-50/90 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-muted">{label}</p>
      <p className="mt-2 text-sm font-semibold text-brand-ink">{value}</p>
    </div>
  )
}

function MiniStat({ label, tone = 'text-brand-ink', value }) {
  return (
    <div className="rounded-2xl border border-brand-ink/10 bg-slate-50/90 px-3 py-3 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-muted">{label}</p>
      <p className={`mt-2 font-display text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  )
}

function HighlightCard({ label, value }) {
  return (
    <div className="rounded-[24px] border border-white/70 bg-white/92 px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-brand-ink">{value}</p>
    </div>
  )
}

function SummaryChip({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/88 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
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

function formatList(value) {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : 'Not captured'
  }

  return safeText(value, 'Not captured')
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

function formatDateTime(value) {
  if (!value) {
    return 'N/A'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'N/A'
  }

  return parsed.toLocaleString()
}

function formatKey(value) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function hasMeaningfulValue(value) {
  if (value === null || value === undefined) {
    return false
  }

  if (Array.isArray(value)) {
    return value.length > 0
  }

  if (typeof value === 'object') {
    return Object.keys(value).length > 0
  }

  return String(value).trim().length > 0
}

function renderValue(value) {
  if (Array.isArray(value)) {
    return value.join(', ')
  }

  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value)
  }

  return String(value)
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
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : 'Cold'
}
