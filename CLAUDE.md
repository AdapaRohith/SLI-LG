# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SpaceLink Infra Lead Generator — a real estate lead capture and CRM frontend for a Hyderabad property business. The repo contains only the React client; the backend API is external.

## Commands

All commands run from the `client/` directory:

```bash
cd client
npm run dev        # start dev server (Vite)
npm run build      # production build
npm run preview    # preview production build
npm run lint       # ESLint
```

No test suite is configured.

## Architecture

**Stack**: React 19, Vite 8, Tailwind CSS v4, react-router-dom v7, xlsx

**Route map**:
- `/` → `LandingPage` — public marketing page with lead contact options
- `/login` → `LoginPage` — admin login
- `/admin` → `AdminPage` — protected CRM dashboard (redirects to `/login` if not authenticated)
- `*` → redirects to `/`

**Authentication** (`src/lib/auth.js`): Client-side only. Stores `"true"` in `localStorage` under `spacelink-admin-auth`. Password is hardcoded in that file. There is no server-side session.

**API layer** (`src/lib/api.js`): Lead backend calls go through `request()`. Base URL defaults to `https://slilg-api.avlokai.com` and is overridable via `VITE_API_BASE_URL`. Key endpoints: `GET /leads`, `GET /search?q=`, `GET /leads/:id`, `GET /insights/:id`, `POST /import-leads`. WhatsApp template job calls go through `whatsappRequest()`, default to `http://wa-slilg.avlokai.com`, and use `VITE_WHATSAPP_ADMIN_TOKEN` as a bearer token for `GET /api/jobs?limit=N` and `GET /api/jobs/:id`.

**AdminPage** (`src/pages/AdminPage.jsx`): A large single-file CRM. Internal sub-components (`AdminHero`, `LeadSidebar`, `LeadWorkspace`, `ExportControls`, etc.) are all defined in that file. Lead temperature is derived from score: ≥75 = hot/Priority, ≥40 = warm/Active, <40 = cold/Others. Export writes XLSX using the `xlsx` library — "Download XLSX" skips API calls for speed, "Export + Chats" fetches per-lead conversation history.

**Design system** (`src/index.css`): Tailwind v4 with custom CSS variables as design tokens — `brand-ink`, `brand-muted`, `brand-accent` (orange), `brand-soft`. Fonts: Manrope (body) and Space Grotesk (display/headings via `font-display`). Dark mode is supported via `[data-theme='dark']` on `:root`. Utility classes like `.shell`, `.glass-card`, `.button-primary`, `.button-secondary`, `.nav-chip` are defined in `index.css` — prefer extending those over inventing new ones.

## Environment Variables

Create `client/.env.local` for local overrides:

```
VITE_API_BASE_URL=http://localhost:8000      # override API base
VITE_WHATSAPP_API_BASE_URL=http://wa-slilg.avlokai.com
VITE_WHATSAPP_ADMIN_TOKEN=...                # bearer token for WhatsApp job endpoints
VITE_PUBLIC_CALL_NUMBER=+91XXXXXXXXXX        # enables "Call" CTAs
VITE_PUBLIC_WHATSAPP_NUMBER=91XXXXXXXXXX     # enables WhatsApp CTA
```

If call/WhatsApp numbers are not set, the corresponding CTAs are hidden.
