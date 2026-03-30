import { useState } from 'react'
import { createLead } from '../lib/api'

const initialForm = {
  name: '',
  phone: '',
  email: '',
  budget: '',
  preferredLocation: '',
}

const budgetOptions = [
  { value: '', label: 'Select budget' },
  { value: '2-3Cr', label: '2 to 3 Crore' },
  { value: '3-5Cr', label: '3 to 5 Crore' },
  { value: '5Cr+', label: '5 Crore+' },
]

export function LeadForm({ showFillPrompt = false }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState({ type: 'idle', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [automationData, setAutomationData] = useState(null)

  function validate(values) {
    const nextErrors = {}

    if (!values.name.trim()) {
      nextErrors.name = 'Name is required.'
    }

    if (!/^\d{10}$/.test(values.phone.trim())) {
      nextErrors.phone = 'Phone must be exactly 10 digits.'
    }

    if (values.email && !/^\S+@\S+\.\S+$/.test(values.email.trim())) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!values.budget) {
      nextErrors.budget = 'Please select your budget.'
    }

    return nextErrors
  }

  function handleChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: name === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value,
    }))

    setErrors((current) => ({ ...current, [name]: '' }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validate(form)

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setStatus({ type: 'error', message: 'Fix the highlighted fields and resubmit.' })
      return
    }

    setIsSubmitting(true)
    setStatus({ type: 'idle', message: '' })
    setAutomationData(null)

    try {
      const result = await createLead(form)
      const webhookData = result.notifications?.webhook?.data ?? null

      setForm(initialForm)
      setStatus({
        type: 'success',
        message: result.message ?? 'Thank you! Our agent will contact you shortly.',
      })
      setAutomationData(webhookData)

      const whatsappNumber = import.meta.env.VITE_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, '')
      if (whatsappNumber) {
        const message = encodeURIComponent(
          `Hi, I submitted my interest for plots in Hyderabad.\nName: ${result.lead.name}\nPhone: ${result.lead.phone}`,
        )
        window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message ?? 'Unable to submit your details right now.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="glass-card animate-rise relative overflow-hidden p-6 sm:p-8">
      <div className="absolute inset-x-10 top-0 h-24 rounded-full bg-brand-accent/12 blur-3xl" />
      <div className="relative">
        <p className="text-kicker">Get Details Now</p>
        <h2 className="mt-3 font-display text-3xl font-bold text-brand-ink">
          Secure site plans, pricing, and location insights.
        </h2>
        <p className="mt-3 text-sm leading-6 text-brand-muted">
          Fill this form to get a callback, brochure, and current plot availability.
        </p>

        {showFillPrompt ? (
          <div className="mt-4 rounded-2xl border border-brand-accent/35 bg-brand-soft px-4 py-3 text-sm font-semibold text-brand-ink">
            Please fill the form below to get complete site details.
          </div>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Field
            label="Full Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            error={errors.name}
            required
            placeholder="Your name"
          />

          <Field
            label="Phone Number"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            error={errors.phone}
            required
            inputMode="numeric"
            placeholder="10-digit mobile number"
          />

          <Field
            label="Email Address"
            name="email"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
            placeholder="Optional"
          />

          <label className="block text-sm font-semibold text-brand-ink">
            Budget
            <select
              className="mt-2 w-full rounded-2xl border border-brand-ink/10 bg-white px-4 py-3 text-brand-ink outline-none transition focus:border-brand-accent"
              name="budget"
              value={form.budget}
              onChange={handleChange}
              required
            >
              {budgetOptions.map((option) => (
                <option key={option.value || 'empty'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.budget ? (
              <span className="mt-1 block text-xs text-red-600">{errors.budget}</span>
            ) : null}
          </label>

          <Field
            label="Preferred Location"
            name="preferredLocation"
            value={form.preferredLocation}
            onChange={handleChange}
            placeholder="Mokila, Shadnagar, Yadagirigutta..."
          />

          <button className="button-primary mt-2 w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Get Details Now'}
          </button>

          {status.message ? (
            <div
              className={`rounded-2xl px-4 py-3 text-sm ${
                status.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {status.message}
            </div>
          ) : null}

          {automationData ? (
            <div className="rounded-2xl border border-brand-ink/10 bg-brand-soft/70 px-4 py-3 text-sm text-brand-ink">
              <p className="font-semibold">Workflow response</p>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap wrap-break-word text-xs leading-6 text-brand-muted">
                {formatAutomationData(automationData)}
              </pre>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  )
}

function Field({ error, label, ...props }) {
  return (
    <label className="block text-sm font-semibold text-brand-ink">
      {label}
      <input
        className="mt-2 w-full rounded-2xl border border-brand-ink/10 bg-white px-4 py-3 text-brand-ink outline-none transition placeholder:text-brand-muted/65 focus:border-brand-accent"
        {...props}
      />
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </label>
  )
}

function formatAutomationData(data) {
  return typeof data === 'string' ? data : JSON.stringify(data, null, 2)
}
