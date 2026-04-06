import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { exportLeadsCsv, getHealth, getLeads } from '../lib/api'
import { CrmPipeline } from '../components/CrmPipeline'
import { CrmContacts } from '../components/CrmContacts'
import { CrmActivity } from '../components/CrmActivity'

const scoreStyles = {
  High: 'bg-emerald-100 text-emerald-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-slate-200 text-slate-700',
}

const TABS = [
  { id: 'leads', label: 'Leads', icon: '📊' },
  { id: 'pipeline', label: 'Pipeline', icon: '🔀' },
  { id: 'contacts', label: 'Contacts', icon: '👥' },
  { id: 'activity', label: 'Activity', icon: '📋' },
]

export function AdminPage() {
  const location = useLocation()
  const [adminKey, setAdminKey] = useState(() => window.sessionStorage.getItem('admin_access_key') || '')
  const [accessInput, setAccessInput] = useState('')
  const [isUnlocked, setIsUnlocked] = useState(() => Boolean(window.sessionStorage.getItem('admin_access_key')))
  const [authError, setAuthError] = useState('')
  const [activeTab, setActiveTab] = useState('leads')
  const [filters, setFilters] = useState({
    score: '',
    search: '',
    startDate: '',
    endDate: '',
  })
  const [leads, setLeads] = useState([])
  const [meta, setMeta] = useState({ total: 0, storageMode: 'mongo' })
  const [status, setStatus] = useState({ loading: true, error: '' })
  const [isExporting, setIsExporting] = useState(false)
  const [serverStatus, setServerStatus] = useState({
    loading: true,
    adminAccessConfigured: true,
  })

  useEffect(() => {
    let ignore = false

    async function loadHealth() {
      try {
        const response = await getHealth()

        if (!ignore) {
          setServerStatus({
            loading: false,
            adminAccessConfigured: Boolean(response.adminAccessConfigured),
          })
        }
      } catch (_error) {
        if (!ignore) {
          setServerStatus({
            loading: false,
            adminAccessConfigured: true,
          })
        }
      }
    }

    loadHealth()
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (serverStatus.loading) {
      return
    }

    if (!serverStatus.adminAccessConfigured) {
      window.sessionStorage.removeItem('admin_access_key')
      setAdminKey('')
      setIsUnlocked(false)
      setStatus({ loading: false, error: '' })
      setLeads([])
      setMeta({ total: 0, storageMode: 'mongo' })
      setAuthError('Admin dashboard access key is not configured on the server yet.')
      return
    }

    if (!isUnlocked || !adminKey) {
      setStatus({ loading: false, error: '' })
      setLeads([])
      setMeta({ total: 0, storageMode: 'mongo' })
      return
    }

    let ignore = false

    async function loadLeads() {
      setStatus({ loading: true, error: '' })

      try {
        const response = await getLeads(filters, adminKey)

        if (!ignore) {
          setLeads(response.leads)
          setMeta(response.meta)
          setStatus({ loading: false, error: '' })
          setAuthError('')
        }
      } catch (error) {
        if (!ignore) {
          if (error.status === 401 || error.status === 403) {
            window.sessionStorage.removeItem('admin_access_key')
            setAdminKey('')
            setIsUnlocked(false)
            setAuthError('Access denied. Enter a valid admin access key.')
            setStatus({ loading: false, error: '' })
            return
          }

          if (error.status === 503) {
            window.sessionStorage.removeItem('admin_access_key')
            setAdminKey('')
            setIsUnlocked(false)
            setAuthError(error.message ?? 'Admin dashboard access key is not configured on the server yet.')
            setStatus({ loading: false, error: '' })
            return
          }

          setStatus({
            loading: false,
            error: error.message ?? 'Unable to load leads.',
          })
        }
      }
    }

    loadLeads()
    return () => {
      ignore = true
    }
  }, [adminKey, filters, isUnlocked, serverStatus])

  const stats = useMemo(
    () =>
      leads.reduce(
        (accumulator, lead) => {
          accumulator[lead.score] += 1
          return accumulator
        },
        { High: 0, Medium: 0, Low: 0 },
      ),
    [leads],
  )

  function handleChange(event) {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
  }

  function handleUnlock(event) {
    event.preventDefault()

    if (!serverStatus.adminAccessConfigured) {
      setAuthError('Admin dashboard access key is not configured on the server yet.')
      return
    }

    const trimmed = accessInput.trim()
    if (!trimmed) {
      setAuthError('Enter your admin access key to continue.')
      return
    }

    window.sessionStorage.setItem('admin_access_key', trimmed)
    setAdminKey(trimmed)
    setIsUnlocked(true)
    setAuthError('')
  }

  const handleLock = useCallback(() => {
    window.sessionStorage.removeItem('admin_access_key')
    setAdminKey('')
    setAccessInput('')
    setIsUnlocked(false)
    setAuthError('')
  }, [])

  // Auto-lock when admin navigates away from this page
  useEffect(() => {
    return () => {
      window.sessionStorage.removeItem('admin_access_key')
    }
  }, [location])

  async function handleExport() {
    try {
      setIsExporting(true)
      const { blob, fileName } = await exportLeadsCsv(filters, adminKey)
      const downloadUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = downloadUrl
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        handleLock()
        setAuthError('Access denied. Enter a valid admin access key.')
        return
      }

      if (error.status === 503) {
        handleLock()
        setAuthError(error.message ?? 'Admin dashboard access key is not configured on the server yet.')
        return
      }

      setStatus({ loading: false, error: error.message ?? 'Unable to export leads right now.' })
    } finally {
      setIsExporting(false)
    }
  }

  if (!isUnlocked) {
    return (
      <div className="shell py-8 sm:py-10">
        <div className="glass-card p-6 sm:p-8">
          <p className="text-kicker">Restricted Access</p>
          <h1 className="mt-3 font-display text-4xl font-bold text-brand-ink">Admin Dashboard</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-muted">
            This page is restricted. Enter the admin access key to view lead details.
          </p>

          {!serverStatus.loading && !serverStatus.adminAccessConfigured ? (
            <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
              The server has not been configured with `ADMIN_ACCESS_KEY` yet, so the dashboard is temporarily unavailable.
            </p>
          ) : null}

          <form className="mt-6 max-w-xl space-y-4" onSubmit={handleUnlock}>
            <label className="block text-sm font-semibold text-brand-ink">
              Admin Access Key
              <input
                className="mt-2 w-full rounded-2xl border border-brand-ink/10 bg-white px-4 py-3 outline-none focus:border-brand-accent"
                type="password"
                value={accessInput}
                onChange={(event) => setAccessInput(event.target.value)}
                placeholder="Enter access key"
              />
            </label>

            {authError ? <p className="text-sm font-semibold text-red-600">{authError}</p> : null}

            <div className="flex flex-wrap gap-3">
              <button className="button-primary" type="submit">
                Unlock Dashboard
              </button>
              <Link className="button-secondary" to="/">
                Back to Landing Page
              </Link>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="shell py-8 sm:py-10">
      <div className="glass-card p-6 sm:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-kicker">Lead Operations</p>
            <h1 className="mt-3 font-display text-4xl font-bold text-brand-ink">
              Admin Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-muted">
              Manage your leads pipeline, contacts, and track all activities in one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link className="button-secondary" to="/">
              View Landing Page
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="crm-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`crm-tab ${activeTab === tab.id ? 'crm-tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="crm-tab-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'leads' && (
          <div className="crm-tab-content">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <h2 className="font-display text-xl font-bold text-brand-ink">Captured Leads</h2>
              <button className="button-primary" onClick={handleExport} type="button" disabled={isExporting}>
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total Leads" value={meta.total} />
              <StatCard label="High Intent" value={stats.High} accent="text-emerald-600" />
              <StatCard label="Medium Intent" value={stats.Medium} accent="text-amber-600" />
              <StatCard
                label="Storage"
                value={meta.storageMode === 'mongo' ? 'MongoDB' : 'Memory'}
                accent="text-sky-600"
              />
            </div>

            <div className="mt-8 grid gap-4 rounded-3xl border border-brand-ink/10 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Search by Name or Phone">
                <input
                  className="mt-2 w-full rounded-2xl border border-brand-ink/10 bg-white px-4 py-3 outline-none focus:border-brand-accent"
                  name="search"
                  value={filters.search}
                  onChange={handleChange}
                  placeholder="Search"
                />
              </Field>

              <Field label="Intent">
                <select
                  className="mt-2 w-full rounded-2xl border border-brand-ink/10 bg-white px-4 py-3 outline-none focus:border-brand-accent"
                  name="score"
                  value={filters.score}
                  onChange={handleChange}
                >
                  <option value="">All</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </Field>

              <Field label="From Date">
                <input
                  className="mt-2 w-full rounded-2xl border border-brand-ink/10 bg-white px-4 py-3 outline-none focus:border-brand-accent"
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleChange}
                />
              </Field>

              <Field label="To Date">
                <input
                  className="mt-2 w-full rounded-2xl border border-brand-ink/10 bg-white px-4 py-3 outline-none focus:border-brand-accent"
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleChange}
                />
              </Field>
            </div>

            <div className="mt-8 overflow-hidden rounded-3xl border border-brand-ink/10 bg-white">
              {status.loading ? (
                <div className="p-8 text-sm text-brand-muted">Loading leads...</div>
              ) : status.error ? (
                <div className="p-8 text-sm text-red-600">{status.error}</div>
              ) : leads.length === 0 ? (
                <div className="p-8 text-sm text-brand-muted">No leads match the current filters.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-brand-muted">
                      <tr>
                        {['Name', 'Phone', 'Budget', 'Location', 'Score', 'Date'].map((column) => (
                          <th key={column} className="px-5 py-4 font-semibold">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead) => (
                        <tr key={lead.id} className="border-t border-brand-ink/8">
                          <td className="px-5 py-4">
                            <p className="font-semibold text-brand-ink">{lead.name}</p>
                            <p className="text-xs text-brand-muted">{lead.email || 'No email'}</p>
                          </td>
                          <td className="px-5 py-4 text-brand-ink">{lead.phone}</td>
                          <td className="px-5 py-4 text-brand-ink">{lead.budget}</td>
                          <td className="px-5 py-4 text-brand-ink">{lead.location || 'Not specified'}</td>
                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${scoreStyles[lead.score]}`}
                            >
                              {lead.score}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-brand-muted">
                            {new Date(lead.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'pipeline' && (
          <div className="crm-tab-content">
            <CrmPipeline leads={leads} />
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="crm-tab-content">
            <CrmContacts />
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="crm-tab-content">
            <CrmActivity />
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ children, label }) {
  return (
    <label className="block text-sm font-semibold text-brand-ink">
      {label}
      {children}
    </label>
  )
}

function StatCard({ accent = 'text-brand-ink', label, value }) {
  return (
    <div className="rounded-3xl border border-brand-ink/10 bg-white p-5">
      <p className="text-sm font-semibold text-brand-muted">{label}</p>
      <p className={`mt-3 font-display text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  )
}
