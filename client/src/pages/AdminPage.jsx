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

  const stats = useMemo(() => {
    return leadsState.items.reduce(
      (summary, lead) => {
        const status = String(lead.status ?? 'cold').toLowerCase()

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
  const insightEntries = Object.entries(detailViewState.insights ?? {}).filter(([, value]) => hasMeaningfulValue(value))

  function handleLogout() {
    clearAdminAuthentication()
    navigate('/login', { replace: true })
  }

  return (
    <div className="shell py-8 sm:py-10">
      <div className="glass-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-kicker">CRM</p>
            <h1 className="mt-3 font-display text-4xl font-bold text-brand-ink">Lead Dashboard</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <HealthBadge health={health} />
            <button className="button-secondary" onClick={() => setRefreshKey((value) => value + 1)} type="button">
              Refresh Data
            </button>
            <button className="button-secondary" onClick={handleLogout} type="button">
              Log Out
            </button>
            <Link className="button-secondary" to="/">
              View Landing Page
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total Leads" value={stats.total} />
          <StatCard label="Hot" value={stats.hot} accent="text-red-600" />
          <StatCard label="Warm" value={stats.warm} accent="text-amber-600" />
          <StatCard label="Cold" value={stats.cold} accent="text-slate-700" />
          <StatCard label="Avg. Score" value={averageScore} accent="text-sky-600" />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-3xl border border-brand-ink/10 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold text-brand-ink">Lead List</h2>
              </div>
              <div className="rounded-full bg-brand-soft px-3 py-2 text-xs font-semibold text-brand-ink">
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

            <div className="mt-5 space-y-3">
              {leadsState.loading ? <EmptyState message="Loading leads from the API..." /> : null}
              {!leadsState.loading && leadsState.error ? <ErrorState message={leadsState.error} /> : null}
              {!leadsState.loading && !leadsState.error && leadsState.items.length === 0 ? (
                <EmptyState message={searchQuery.trim() ? 'No leads matched this search.' : 'No leads are available yet.'} />
              ) : null}

              {!leadsState.loading && !leadsState.error
                ? leadsState.items.map((lead) => {
                    const isActive = lead.id === activeLeadId
                    const badgeClass = statusStyles[String(lead.status ?? 'cold').toLowerCase()] ?? statusStyles.cold

                    return (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => setActiveLeadId(lead.id)}
                        className={`w-full rounded-3xl border p-4 text-left transition ${
                          isActive
                            ? 'border-brand-accent bg-brand-soft/60 shadow-[0_18px_40px_rgba(18,33,47,0.08)]'
                            : 'border-brand-ink/10 bg-slate-50 hover:border-brand-accent/40 hover:bg-white'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-brand-ink">{safeText(lead.name, 'Unknown lead')}</p>
                            <p className="mt-1 text-sm text-brand-muted">{safeText(lead.phone, 'Phone unavailable')}</p>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${badgeClass}`}>
                            {safeText(lead.status, 'cold')}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <InlineMetric label="Score" value={lead.score ?? 0} />
                          <InlineMetric label="Messages" value={lead.message_count ?? 0} />
                          <InlineMetric label="Last Seen" value={formatDateTime(lead.last_message_at)} />
                        </div>
                      </button>
                    )
                  })
                : null}
            </div>
          </section>

          <section className="rounded-3xl border border-brand-ink/10 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold text-brand-ink">Lead Detail</h2>
                <p className="mt-1 text-sm text-brand-muted">Conversation, extracted info, and scoring history.</p>
              </div>
              {selectedLead ? (
                <div className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-brand-muted">
                  Updated {formatDateTime(selectedLead.updated_at ?? selectedLead.created_at)}
                </div>
              ) : null}
            </div>

            <div className="mt-5 space-y-5">
              {detailViewState.loading ? <EmptyState message="Loading lead detail..." /> : null}
              {!detailViewState.loading && detailViewState.error ? <ErrorState message={detailViewState.error} /> : null}
              {!detailViewState.loading && !detailViewState.error && !selectedLead ? (
                <EmptyState message="Select a lead to inspect the chat, extracted insights, and score history." />
              ) : null}

              {!detailViewState.loading && !detailViewState.error && selectedLead ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <DetailCard label="Name" value={safeText(selectedLead.name, 'Unknown lead')} />
                    <DetailCard label="Phone" value={safeText(selectedLead.phone, 'Unavailable')} />
                    <DetailCard label="Status" value={safeText(selectedLead.status, 'cold')} />
                    <DetailCard label="Score" value={selectedLead.score ?? 0} />
                    <DetailCard label="Escalated" value={selectedLead.escalated ? 'Yes' : 'No'} />
                    <DetailCard label="Message Count" value={selectedLead.message_count ?? 0} />
                    <DetailCard label="Budget Range" value={formatBudgetRange(selectedLead)} />
                    <DetailCard label="Preferred Locations" value={formatList(selectedLead.preferred_locations)} />
                    <DetailCard label="Property Type" value={safeText(selectedLead.property_type, 'Not captured')} />
                    <DetailCard label="Size Preference" value={safeText(selectedLead.size_preference, 'Not captured')} />
                    <DetailCard label="Facing" value={safeText(selectedLead.facing, 'Not captured')} />
                    <DetailCard label="Intent Level" value={safeText(selectedLead.intent_level, 'Not captured')} />
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-3xl border border-brand-ink/10 bg-slate-50 p-4">
                      <h3 className="font-display text-xl font-bold text-brand-ink">Extracted Insights</h3>
                      {insightEntries.length === 0 ? (
                        <p className="mt-3 text-sm text-brand-muted">No extracted insight payload is available for this lead yet.</p>
                      ) : (
                        <dl className="mt-4 grid gap-3">
                          {insightEntries.map(([key, value]) => (
                            <div key={key} className="rounded-2xl border border-brand-ink/10 bg-white px-4 py-3">
                              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-brand-muted">{formatKey(key)}</dt>
                              <dd className="mt-2 text-sm text-brand-ink">{renderValue(value)}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </div>

                    <div className="rounded-3xl border border-brand-ink/10 bg-slate-50 p-4">
                      <h3 className="font-display text-xl font-bold text-brand-ink">Scoring Signals</h3>
                      {detailViewState.signals.length === 0 ? (
                        <p className="mt-3 text-sm text-brand-muted">No scoring history has been recorded for this lead yet.</p>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {detailViewState.signals.map((signal, index) => (
                            <div key={signal.id ?? `${signal.created_at ?? 'signal'}-${index}`} className="rounded-2xl border border-brand-ink/10 bg-white px-4 py-3">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-brand-ink">{safeText(signal.label ?? signal.reason ?? signal.signal_type, 'Signal event')}</p>
                                  <p className="mt-1 text-sm text-brand-muted">{safeText(signal.description ?? signal.summary, 'No description provided.')}</p>
                                </div>
                                <div className="text-right text-xs font-semibold text-brand-muted">
                                  <p>{signal.score ?? signal.delta ?? 'n/a'}</p>
                                  <p className="mt-1">{formatDateTime(signal.created_at ?? signal.timestamp)}</p>
                                </div>
                              </div>
                              {Object.keys(signal).length > 0 ? (
                                <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950 px-4 py-3 text-xs leading-6 text-slate-100">
                                  {JSON.stringify(signal, null, 2)}
                                </pre>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-brand-ink/10 bg-slate-50 p-4">
                    <h3 className="font-display text-xl font-bold text-brand-ink">Conversation</h3>
                    {detailViewState.messages.length === 0 ? (
                      <p className="mt-3 text-sm text-brand-muted">This lead does not have any chat history yet.</p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {detailViewState.messages.map((message) => {
                          const isUser = message.role === 'user'

                          return (
                            <article
                              key={message.id}
                              className={`rounded-3xl px-4 py-3 ${
                                isUser ? 'bg-white border border-brand-ink/10' : 'bg-brand-soft/70 border border-brand-accent/20'
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
                </>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function HealthBadge({ health }) {
  if (health.loading) {
    return <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-brand-muted">Checking API...</div>
  }

  if (health.error) {
    return <div className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">API unavailable</div>
  }

  return <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">{health.status}</div>
}

function StatCard({ accent = 'text-brand-ink', label, value }) {
  return (
    <div className="rounded-3xl border border-brand-ink/10 bg-white p-5">
      <p className="text-sm font-semibold text-brand-muted">{label}</p>
      <p className={`mt-3 font-display text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  )
}

function InlineMetric({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/90 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-brand-ink">{value}</p>
    </div>
  )
}

function DetailCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-brand-ink/10 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-muted">{label}</p>
      <p className="mt-2 text-sm font-semibold text-brand-ink">{value}</p>
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

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(numeric)
}

function formatList(value) {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : 'Not captured'
  }

  return safeText(value, 'Not captured')
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
