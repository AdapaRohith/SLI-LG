import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getLeads, getLeadsExportUrl } from '../lib/api'

const scoreStyles = {
  High: 'bg-emerald-100 text-emerald-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-slate-200 text-slate-700',
}

export function AdminPage() {
  const [filters, setFilters] = useState({
    score: '',
    search: '',
    startDate: '',
    endDate: '',
  })
  const [leads, setLeads] = useState([])
  const [meta, setMeta] = useState({ total: 0, storageMode: 'mongo' })
  const [status, setStatus] = useState({ loading: true, error: '' })

  useEffect(() => {
    let ignore = false

    async function loadLeads() {
      setStatus({ loading: true, error: '' })

      try {
        const response = await getLeads(filters)

        if (!ignore) {
          setLeads(response.leads)
          setMeta(response.meta)
          setStatus({ loading: false, error: '' })
        }
      } catch (error) {
        if (!ignore) {
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
  }, [filters])

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

  return (
    <div className="shell py-8 sm:py-10">
      <div className="glass-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-kicker">Lead Operations</p>
            <h1 className="mt-3 font-display text-4xl font-bold text-brand-ink">
              Admin Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-muted">
              Review captured leads, search by buyer details, filter by intent and date, and
              export the current list to CSV.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link className="button-secondary" to="/">
              View Landing Page
            </Link>
            <a className="button-primary" href={getLeadsExportUrl(filters)}>
              Export CSV
            </a>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Leads" value={meta.total} />
          <StatCard label="High Intent" value={stats.High} accent="text-emerald-600" />
          <StatCard label="Medium Intent" value={stats.Medium} accent="text-amber-600" />
          <StatCard
            label="Storage"
            value={meta.storageMode === 'mongo' ? 'MongoDB' : 'Memory'}
            accent="text-sky-600"
          />
        </div>

        <div className="mt-8 grid gap-4 rounded-[24px] border border-brand-ink/10 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
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

        <div className="mt-8 overflow-hidden rounded-[24px] border border-brand-ink/10 bg-white">
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
    <div className="rounded-[24px] border border-brand-ink/10 bg-white p-5">
      <p className="text-sm font-semibold text-brand-muted">{label}</p>
      <p className={`mt-3 font-display text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  )
}
