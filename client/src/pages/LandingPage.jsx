import { Link } from 'react-router-dom'
import { LeadForm } from '../components/LeadForm'

const benefits = ['Clear Title', 'Ready for Construction', 'Near IT hubs']

const highlights = [
  { value: 'DTCP', label: 'Approved layouts with documentation clarity' },
  { value: '12%', label: 'Average appreciation focus across growth corridors' },
  { value: '24/7', label: 'Assisted booking and call-back support' },
]

const process = [
  'Submit your interest with budget and preferred location.',
  'Our agent qualifies the lead and shares matching plots instantly.',
  'High-intent leads are forwarded to the property owner via email or webhook-ready automation.',
]

export function LandingPage() {
  const clickToCall = import.meta.env.VITE_PUBLIC_CALL_NUMBER?.replace(/\D/g, '')

  return (
    <div className="overflow-x-hidden">
      <header className="shell py-6">
        <div className="glass-card flex items-center justify-between px-5 py-4 sm:px-6">
          <div>
            <p className="font-display text-xl font-bold text-brand-ink">SpaceLink Infra</p>
            <p className="text-sm text-brand-muted">Trusted plotted development opportunities in Hyderabad</p>
          </div>
          <div className="flex items-center gap-3">
            <Link className="button-secondary hidden sm:inline-flex" to="/admin">
              Admin Dashboard
            </Link>
            {clickToCall ? (
              <a className="button-primary" href={`tel:${clickToCall}`}>
                Click to Call
              </a>
            ) : (
              <a className="button-primary" href="#lead-form">
                Get Details Now
              </a>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="shell pb-12 pt-6 sm:pb-16">
          <div className="hero-grid glass-card relative overflow-hidden p-6 sm:p-10 lg:p-12">
            <div className="absolute -left-24 top-10 h-48 w-48 rounded-full bg-orange-200/50 blur-3xl" />
            <div className="absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-sky-200/50 blur-3xl" />

            <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div className="animate-rise">
                <p className="text-kicker">SpaceLink Infra Signature Plots</p>
                <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight text-brand-ink sm:text-5xl lg:text-6xl">
                  Premium Open Plots in Hyderabad Limited Availability
                </h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-brand-muted">
                  SpaceLink Infra brings you DTCP-approved plotted developments in high-growth
                  Hyderabad corridors, curated for secure ownership, construction readiness, and
                  strong long-term appreciation.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <a className="button-primary" href="#lead-form">
                    Get Details Now
                  </a>
                  {clickToCall ? (
                    <a className="button-secondary" href={`tel:${clickToCall}`}>
                      Talk to an Advisor
                    </a>
                  ) : null}
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  {benefits.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-brand-ink/10 bg-white/80 px-4 py-2 text-sm font-semibold text-brand-ink"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                <div className="mt-10 grid gap-4 sm:grid-cols-3">
                  {highlights.map((item, index) => (
                    <div
                      key={item.label}
                      className="animate-fade rounded-[24px] border border-brand-ink/10 bg-white/85 p-5"
                      style={{ animationDelay: `${index * 120}ms` }}
                    >
                      <p className="font-display text-3xl font-bold text-brand-ink">{item.value}</p>
                      <p className="mt-2 text-sm leading-6 text-brand-muted">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div id="lead-form" className="lg:pl-4">
                <LeadForm />
              </div>
            </div>
          </div>
        </section>

        <section className="shell pb-8 sm:pb-12">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="glass-card p-8">
              <p className="text-kicker">Why SpaceLink Infra</p>
              <h2 className="section-title mt-3">Plotted investments presented with clarity and trust.</h2>
              <p className="mt-4 text-base leading-7 text-brand-muted">
                We focus on serious buyers who value legal clarity, future-ready infrastructure,
                and plotted communities positioned near Hyderabad’s fastest-growing zones.
              </p>

              <div className="mt-6 space-y-4">
                {benefits.map((benefit) => (
                  <div
                    key={benefit}
                    className="rounded-[22px] border border-brand-ink/10 bg-brand-soft p-4"
                  >
                    <p className="font-semibold text-brand-ink">{benefit}</p>
                    <p className="mt-1 text-sm text-brand-muted">
                      Clear communication that matches buyer intent and speeds up response time.
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-kicker">Urgency</p>
                  <h2 className="section-title mt-3">Only few plots left</h2>
                </div>
                <span className="rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-600">
                  Limited inventory this month
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {process.map((step, index) => (
                  <div
                    key={step}
                    className="rounded-[24px] border border-brand-ink/10 bg-white p-5"
                  >
                    <p className="font-display text-2xl font-bold text-brand-accent">0{index + 1}</p>
                    <p className="mt-3 text-sm leading-6 text-brand-muted">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
