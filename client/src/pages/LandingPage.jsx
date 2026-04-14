import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LeadForm } from '../components/LeadForm'

const benefits = ['Buying', 'Renting', 'Selling']

const highlights = [
  { value: '20+', label: 'Years of Experience' },
  { value: '100%', label: 'Client Satisfaction' },
  { value: 'End-to-End', label: 'Solutions' },
]

const navigationItems = [
  { label: 'Properties', href: '#properties' },
  { label: 'About', href: '#features' },
  { label: 'Process', href: '#process' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'Contact', href: '#lead-form' },
]

const featureCards = [
  {
    title: 'Buying & Selling',
    description: 'We help you find the ideal office space or property to buy or sell.',
  },
  {
    title: 'Real estate advisory',
    description: 'Expert advice on your real estate investments and property planning.',
  },
  {
    title: 'Leasing management',
    description: 'Comprehensive leasing and rental solutions tailored for you.',
  },
  {
    title: 'Legal compliance',
    description: 'Guiding you through all necessary legal obligations securely.',
  },
]

const whySpaceReasons = [
  {
    title: 'Honesty and Integrity',
    stat: 'Transparent Real Estate',
    detail: 'We are working to transform this industry through honesty, integrity, and exceptional service.',
  },
  {
    title: 'Expert Leadership',
    stat: '20+ years expertise',
    detail: 'Led by Mr. Karuna Kumar Vakalapudi with decades of competence in construction and finance.',
  },
  {
    title: 'Comprehensive Solutions',
    stat: 'End-to-End service',
    detail: 'Specialised end-to-end solutions for all your property, leasing, and investment needs.',
  },
]

const projects = [
  {
    title: 'Premium Apartments',
    location: 'Hyderabad',
    size: 'Various sizes',
    status: 'Available',
    image:
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'Interior of a premium modern apartment block',
    description: 'Explore our curated list of premium apartments across Hyderabad.',
    tags: ['Luxury', 'City Center', 'Modern amenities'],
  },
  {
    title: 'Premium Villas',
    location: 'Hyderabad',
    size: 'Spacious layouts',
    status: 'Available',
    image:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'Exterior view of a luxury premium villa',
    description: 'Spacious and luxurious villas for those who demand the best.',
    tags: ['Independent', 'Gated community', 'Premium lifestyle'],
  },
  {
    title: 'Office Space',
    location: 'Hyderabad',
    size: 'Flexible sizes',
    status: 'Available',
    image:
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'Modern open plan office space',
    description: 'Find the ideal office space tailored to meet your unique business goals.',
    tags: ['Commercial', 'IT corridors', 'Business hubs'],
  },
]

const process = [
  'Review projects.',
  'Contact the team.',
  'Open the dashboard.',
]

const metrics = [
  ['18+', 'Projects tracked'],
  ['4.8/5', 'Buyer rating'],
  ['90 min', 'Response time'],
]

const testimonials = [
  {
    name: 'Rama Krishna',
    role: 'Client',
    quote: 'Kumar delivered us the apartment with a great rental value in a good price. Thorough professional.',
  },
  {
    name: 'Jagadiesh A',
    role: 'Client',
    quote: 'Impressed with their transparency, service, and professionalism. ALWAYS available for home tours.',
  },
  {
    name: 'Satish Kumar',
    role: 'Client',
    quote: 'The best realtor we’ve ever worked with. Gets the work done seamlessly without stepping out of the house.',
  },
]

const signatureShowcaseImages = [
  {
    src: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1400&q=80',
    alt: 'AI concept render of high-rise building towers over a premium urban plot',
  },
  {
    src: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80',
    alt: 'AI concept render of modern avenue buildings around a development-ready land parcel',
  },
  {
    src: 'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80',
    alt: 'AI concept render of mixed-use towers and plotted residential zones',
  },
]

export function LandingPage() {
  const clickToCall = import.meta.env.VITE_PUBLIC_CALL_NUMBER?.replace(/\D/g, '')
  const [showFillPrompt, setShowFillPrompt] = useState(false)
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [activeNavLabel, setActiveNavLabel] = useState('Properties')
  const [activeWhyReason, setActiveWhyReason] = useState(0)

  function handleNavItemClick(label) {
    setActiveNavLabel(label)
    setIsNavOpen(false)
  }

  function handleVisitSite(event) {
    event.preventDefault()
    setShowFillPrompt(true)

    const leadFormSection = document.getElementById('lead-form')
    if (leadFormSection) {
      leadFormSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="overflow-x-hidden pb-10">
      <header className="shell py-6">
        <div className="nav-shell glass-card px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-display text-xl font-bold text-brand-ink">SpaceLink Infra</p>
              <p className="text-sm text-brand-muted">Open plots in Hyderabad</p>
            </div>

            <button
              aria-controls="main-navigation"
              aria-expanded={isNavOpen}
              className="button-secondary px-4 py-2 lg:hidden"
              onClick={() => setIsNavOpen((current) => !current)}
              type="button"
            >
              {isNavOpen ? 'Close' : 'Menu'}
            </button>
          </div>

          <div className="mt-4 hidden items-center justify-between gap-4 lg:flex">
            <nav className="nav-rail" id="main-navigation">
              {navigationItems.map((item) => (
                <a
                  key={item.href}
                  className={`nav-chip ${activeNavLabel === item.label ? 'nav-chip-active' : ''}`}
                  href={item.href}
                  onClick={() => handleNavItemClick(item.label)}
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="flex flex-wrap items-center gap-3">
              <Link className="button-secondary" to="/admin">
                Lead Dashboard
              </Link>
              {clickToCall ? (
                <a className="button-primary" href={`tel:${clickToCall}`}>
                  Click to Call
                </a>
              ) : (
                <a className="button-primary" href="#lead-form">
                  Contact Options
                </a>
              )}
            </div>
          </div>

          <div className={`nav-mobile-panel mt-4 lg:hidden ${isNavOpen ? 'block' : 'hidden'}`}>
            <nav className="grid gap-2" id="main-navigation">
              {navigationItems.map((item) => (
                <a
                  key={item.href}
                  className={`nav-chip w-full justify-start ${activeNavLabel === item.label ? 'nav-chip-active' : ''}`}
                  href={item.href}
                  onClick={() => handleNavItemClick(item.label)}
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="mt-3 grid gap-2">
              <Link className="button-secondary w-full" onClick={() => setIsNavOpen(false)} to="/admin">
                Lead Dashboard
              </Link>
              {clickToCall ? (
                <a className="button-primary w-full" href={`tel:${clickToCall}`}>
                  Click to Call
                </a>
              ) : (
                <a className="button-primary w-full" href="#lead-form" onClick={() => setIsNavOpen(false)}>
                  Contact Options
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="shell pb-10 pt-6 sm:pb-14" id="overview">
          <div className="hero-grid glass-card relative overflow-hidden p-6 sm:p-10 lg:p-12">
            <div className="absolute -left-24 top-10 h-48 w-48 rounded-full bg-orange-200/50 blur-3xl" />
            <div className="absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-sky-200/50 blur-3xl" />

            <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div className="animate-rise">
                <div className="inline-flex rounded-full border border-brand-accent/20 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-brand-accent">
                  Hyderabad Real Estate
                </div>
                <p className="mt-5 text-kicker">SpaceLink Infra</p>
                <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight text-brand-ink sm:text-5xl lg:text-6xl">
                  Comprehensive real estate solutions.
                </h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-brand-muted">
                  Space Link provides specialised services including buying, renting, and selling properties all around Hyderabad.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <a className="button-primary" href="#lead-form">
                    Contact Options
                  </a>
                  <a className="button-secondary" href="#properties">
                    View Properties
                  </a>
                  {clickToCall ? (
                    <a className="button-secondary" href={`tel:${clickToCall}`}>
                      Call Now
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
                      className="animate-fade rounded-3xl border border-brand-ink/10 bg-white/85 p-5"
                      style={{ animationDelay: `${index * 120}ms` }}
                    >
                      <p className="font-display text-3xl font-bold text-brand-ink">{item.value}</p>
                      <p className="mt-2 text-sm leading-6 text-brand-muted">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div id="lead-form" className="lg:pl-4">
                <LeadForm showFillPrompt={showFillPrompt} />
              </div>
            </div>
          </div>
        </section>

        <section className="shell pb-8 sm:pb-12" id="features">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="glass-card p-8">
              <p className="text-kicker">Why SpaceLink Infra</p>
              <h2 className="section-title mt-3">Clear, fast, reliable.</h2>

              <div className="mt-6 grid gap-3">
                {whySpaceReasons.map((reason, index) => (
                  <button
                    key={reason.title}
                    className={`reason-chip ${activeWhyReason === index ? 'reason-chip-active' : ''}`}
                    onClick={() => setActiveWhyReason(index)}
                    type="button"
                  >
                    <span className="text-sm font-bold uppercase tracking-[0.18em] text-brand-accent/80">
                      0{index + 1}
                    </span>
                    <span className="ml-3 font-semibold text-brand-ink">{reason.title}</span>
                  </button>
                ))}
              </div>

              <article className="reason-panel mt-5 rounded-3xl border border-brand-ink/10 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-muted">
                  {whySpaceReasons[activeWhyReason].stat}
                </p>
                <p className="mt-3 text-sm leading-7 text-brand-ink">
                  {whySpaceReasons[activeWhyReason].detail}
                </p>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-brand-ink/8">
                  <div
                    className="h-full rounded-full bg-brand-accent transition-all duration-500"
                    style={{ width: `${((activeWhyReason + 1) / whySpaceReasons.length) * 100}%` }}
                  />
                </div>
              </article>

              <div className="mt-5 flex flex-wrap gap-2">
                {benefits.map((benefit) => (
                  <span
                    key={benefit}
                    className="rounded-full border border-brand-ink/10 bg-brand-soft px-3 py-2 text-xs font-semibold text-brand-ink"
                  >
                    {benefit}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {featureCards.map((card) => (
                <article
                  key={card.title}
                  className="feature-panel rounded-3xl border border-brand-ink/10 p-6"
                >
                  <div className="feature-badge">Feature</div>
                  <h3 className="mt-5 font-display text-2xl font-bold text-brand-ink">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-brand-muted">{card.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="shell pb-8 sm:pb-12" id="properties">
          <div className="glass-card p-8 sm:p-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-kicker">Property Types</p>
                <h2 className="section-title mt-3">Available properties.</h2>
              </div>

              <div className="flex flex-wrap gap-3">
                <span className="rounded-full bg-brand-soft px-4 py-2 text-sm font-semibold text-brand-ink">
                  Apartments
                </span>
                <span className="rounded-full bg-brand-soft px-4 py-2 text-sm font-semibold text-brand-ink">
                  Villas
                </span>
                <span className="rounded-full bg-brand-soft px-4 py-2 text-sm font-semibold text-brand-ink">
                  Commercial
                </span>
              </div>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {projects.map((project) => (
                <article key={project.title} className="project-card rounded-3xl p-6">
                  <div className="project-image-frame group relative mb-5 min-h-52 overflow-hidden rounded-3xl">
                    <img
                      alt={project.imageAlt}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      src={project.image}
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,33,47,0.05),rgba(18,33,47,0.5))]" />
                    <div className="absolute bottom-3 left-3 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
                      Site preview
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-accent">
                        {project.location}
                      </p>
                      <h3 className="mt-3 font-display text-2xl font-bold text-brand-ink">
                        {project.title}
                      </h3>
                    </div>
                    <span className="rounded-full border border-brand-accent/25 bg-white/80 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-accent">
                      {project.status}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-brand-muted">{project.description}</p>

                  <div className="mt-5 rounded-2xl bg-white/80 px-4 py-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-muted">
                      Plot size range
                    </p>
                    <p className="mt-2 font-display text-2xl font-bold text-brand-ink">
                      {project.size}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-brand-ink/10 bg-white/70 px-3 py-2 text-xs font-semibold text-brand-ink"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="shell pb-8 sm:pb-12" id="process">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="glass-card p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-kicker">How It Works</p>
                  <h2 className="section-title mt-3">How it works.</h2>
                </div>
                <span className="rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-600">
                  Limited inventory
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {process.map((step, index) => (
                  <div
                    key={step}
                    className="rounded-3xl border border-brand-ink/10 bg-white p-5"
                  >
                    <p className="font-display text-2xl font-bold text-brand-accent">0{index + 1}</p>
                    <p className="mt-3 text-sm leading-6 text-brand-muted">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="metric-stack rounded-4xl p-8 text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-100">
                Metrics
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
                Quick view.
              </h2>

              <div className="mt-8 grid gap-4">
                {metrics.map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-[24px] border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-sm"
                  >
                    <p className="font-display text-3xl font-bold">{value}</p>
                    <p className="mt-2 text-sm leading-6 text-white/70">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="shell pb-8 sm:pb-12">
          <div className="showcase-panel relative overflow-hidden rounded-4xl border border-brand-ink/10 p-6 shadow-[0_24px_80px_rgba(18,33,47,0.08)] sm:p-8 lg:p-10">
            <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(239,125,52,0.18),transparent_60%)]" />
            <div className="relative">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-kicker">Showcase</p>
                  <h2 className="section-title mt-3">
                    Larger plot showcase.
                  </h2>
                </div>

                <div className="flex flex-wrap gap-3">
                  <span className="rounded-full border border-brand-ink/10 bg-white/80 px-4 py-2 text-sm font-semibold text-brand-ink">
                    Larger frontage
                  </span>
                  <span className="rounded-full border border-brand-ink/10 bg-white/80 px-4 py-2 text-sm font-semibold text-brand-ink">
                    Development-ready parcels
                  </span>
                </div>
              </div>

              <div className="mt-8">
                <article className="showcase-hero group relative overflow-hidden rounded-[28px] p-6 sm:p-8">
                  <div className="absolute right-6 top-6 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-white/90">
                    Plot demo
                  </div>

                  <div className="relative grid gap-6">
                    <div className="grid gap-4 sm:grid-cols-[1.15fr_0.85fr]">
                      <div className="showcase-image-card relative min-h-80 overflow-hidden rounded-3xl">
                        <img
                          src={signatureShowcaseImages[0].src}
                          alt={signatureShowcaseImages[0].alt}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,19,29,0.12),rgba(7,19,29,0.45))]" />
                      </div>

                      <div className="grid gap-4">
                        <div className="showcase-image-card relative min-h-38 overflow-hidden rounded-3xl">
                          <img
                            src={signatureShowcaseImages[1].src}
                            alt={signatureShowcaseImages[1].alt}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,19,29,0.08),rgba(7,19,29,0.72))]" />
                        </div>

                        <div className="showcase-image-card relative min-h-38 overflow-hidden rounded-3xl">
                          <img
                            src={signatureShowcaseImages[2].src}
                            alt={signatureShowcaseImages[2].alt}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,19,29,0.08),rgba(7,19,29,0.72))]" />
                        </div>
                      </div>
                    </div>

                    <div className="relative">
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-100">
                        Signature parcel
                      </p>
                      <h3 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">
                        Premium large-format plots.
                      </h3>

                      <a className="button-primary mt-6" href="#lead-form" onClick={handleVisitSite}>
                        Contact Team
                      </a>

                      <div className="relative mt-8 grid gap-4 sm:grid-cols-3">
                        {[
                          ['1,200 sq. yd.', 'Prime buildable area'],
                          ['30 m roads', 'Easy access'],
                          ['3 formats', 'Residential or mixed-use'],
                        ].map(([value, label]) => (
                          <div
                            key={label}
                            className="rounded-[22px] border border-white/15 bg-white/10 p-4 backdrop-blur-sm transition duration-300 group-hover:-translate-y-1"
                          >
                            <p className="font-display text-2xl font-bold text-white">{value}</p>
                            <p className="mt-2 text-sm leading-6 text-white/70">{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className="shell pb-8 sm:pb-12" id="testimonials">
          <div className="glass-card p-8 sm:p-10">
            <div className="max-w-2xl">
              <p className="text-kicker">Testimonials</p>
              <h2 className="section-title mt-3">What buyers say.</h2>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {testimonials.map((item) => (
                <article key={item.name} className="testimonial-card rounded-3xl p-6">
                  <div className="text-4xl leading-none text-brand-accent">&ldquo;</div>
                  <p className="mt-4 text-sm leading-7 text-brand-muted">{item.quote}</p>
                  <div className="mt-6 border-t border-brand-ink/10 pt-4">
                    <p className="font-semibold text-brand-ink">{item.name}</p>
                    <p className="mt-1 text-sm text-brand-muted">{item.role}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="shell" id="contact">
          <div className="cta-band rounded-4xl px-6 py-8 sm:px-8 sm:py-10">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-100">
                  Contact
                </p>
                <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">
                  Ready to talk?
                </h2>
              </div>

              <div className="flex flex-wrap gap-3 lg:justify-end">
                <a className="button-primary" href="#lead-form">
                  Contact Options
                </a>
                {clickToCall ? (
                  <a className="button-secondary border-white/20 bg-white/10 text-white hover:text-white" href={`tel:${clickToCall}`}>
                    Call Sales Team
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
