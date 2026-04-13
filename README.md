# SpaceLink Infra

SpaceLink Infra is now a frontend-only React + Vite application that reads lead intelligence from the shared SLI-LG API at `https://slilg-api.avlokai.com`.

## Stack

- Frontend: React + Vite + Tailwind CSS
- Data source: External read-only API

## Connected API

The frontend is wired to these GET-only endpoints:

- `GET /` health check
- `GET /leads` list all leads
- `GET /leads/:id` lead plus chat history
- `GET /search?q=` search leads

## Frontend behavior

- Landing page is read-only and no longer submits leads
- Admin dashboard reads directly from the external API
- Search uses the remote `/search` endpoint
- Lead detail view combines lead profile and chat history
- No local backend, write actions, export flow, or admin unlock flow remain

## Project structure

```text
.
|-- client
|   |-- src
|   |   |-- components
|   |   |-- lib
|   |   `-- pages
|   |-- .env.example
|   `-- package.json
|-- package-lock.json
|-- package.json
`-- README.md
```

## Run locally

1. Copy `client/.env.example` to `client/.env` if you want to override defaults.
2. From the project root, install dependencies:

```bash
npm.cmd install
```

3. Start the frontend:

```bash
npm.cmd run dev
```

The app will be available at `http://localhost:5173` and will call `https://slilg-api.avlokai.com` directly.

If your PowerShell environment allows `npm` directly, `npm install` and `npm run dev` work as well.

## Environment variables

- `VITE_API_BASE_URL` defaults to `https://slilg-api.avlokai.com`
- `VITE_PUBLIC_WHATSAPP_NUMBER` controls the WhatsApp CTA on the landing page
- `VITE_PUBLIC_CALL_NUMBER` controls the call CTA on the landing page
