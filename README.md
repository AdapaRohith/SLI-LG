# SpaceLink Infra

SpaceLink Infra is a SaaS-ready real estate lead generation web application built for capturing, qualifying, and routing interested buyers looking for open plots in Hyderabad.

## Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Database: MongoDB with in-memory fallback for local development
- Automation: Webhook-ready notifications for n8n and owner workflows
- AI Scoring: OpenAI-backed scoring with deterministic fallback rules

## Features

- High-conversion landing page with lead form and click-to-call CTA
- Form validation with duplicate lead detection
- Lead scoring as High, Medium, or Low
- Admin dashboard with search, filters, and CSV export
- REST API for lead capture and retrieval
- Webhook endpoint for n8n or third-party automation
- Email notifications and webhook notifications to property owners
- Rate limiting, validation, and security headers

## Project Structure

```text
.
|-- client
|   |-- src
|   |   |-- components
|   |   |-- lib
|   |   `-- pages
|   |-- .env.example
|   `-- package.json
|-- server
|   |-- src
|   |   |-- controllers
|   |   |-- lib
|   |   |-- models
|   |   |-- routes
|   |   |-- services
|   |   `-- validators
|   |-- .env.example
|   `-- package.json
`-- package.json
```

## Run Locally

1. Copy `client/.env.example` to `client/.env`.
2. Copy `server/.env.example` to `server/.env`.
3. Update `server/.env` with your MongoDB, SMTP, webhook, and optional OpenAI credentials.
4. From the project root, run:

```bash
npm.cmd install
npm.cmd run dev
```

The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:5000`.

If your PowerShell environment allows `npm` directly, `npm install` and `npm run dev` work as well. This workspace required `npm.cmd` because script execution for `npm.ps1` is disabled.

## API Endpoints

- `POST /api/leads` creates a lead
- `GET /api/leads` lists leads with optional `score`, `search`, `startDate`, `endDate` filters
- `GET /api/leads/export` downloads filtered leads as CSV
- `POST /webhook/lead` accepts webhook-compatible lead payloads
- `GET /api/health` returns service health and current storage mode

## Lead Scoring

Default scoring follows the business rules:

- High: budget `3-5Cr` or `5Cr+` and preferred location provided
- Medium: budget `2-3Cr`
- Low: anything else

If `ENABLE_OPENAI_SCORING=true` and an API key is configured, the backend asks OpenAI to apply the same rubric and falls back to the deterministic rules on failure.

## Notification Flow

When a lead is created, the server:

1. Validates and stores the lead
2. Scores the lead
3. Sends the lead to the configured property owner email
4. Sends the lead payload to `N8N_WEBHOOK_URL` for n8n automation. If `N8N_WEBHOOK_URL` is not set, it falls back to `OWNER_WEBHOOK_URL`.

## Notes

- MongoDB is recommended for production. The app falls back to in-memory storage only when MongoDB is not configured or unavailable.
- Set `N8N_WEBHOOK_URL` to your n8n webhook, for example `https://your-n8n-host/webhook/lead`.
- The backend forwards leads created via `POST /api/leads` to n8n with `name`, `phone`, `email`, `budget`, `location`, `score`, `source`, and `createdAt`.
- `OWNER_WEBHOOK_URL` remains available as a fallback webhook target for WhatsApp delivery via n8n, Twilio, Meta, or another messaging provider.
