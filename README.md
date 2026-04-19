# FureverCare

Digital emergency health cards for pets. Pet owners control the health information that matters in an emergency and can share it instantly by link, QR code, or time-limited token.

## What This Repo Contains

- `frontend/`: React 18 + TypeScript + Vite SPA
- `backend/`: Express + TypeScript API, Postgres models, migrations, and workers
- `deploy/`: production compose file used by GitHub Actions + AWS SSM deploys
- `docs/developer-operations.md`: canonical setup, migration, seed, preview-env, and deployment notes

## Quick Start

### Prerequisites

- Docker Desktop or Docker Engine with Compose v2
- Node.js 20+ if you want to run services outside Docker

### Local Stack with Docker

```bash
cp .env.example .env
docker compose up --build -d
```

The local stack starts:

- frontend: [http://localhost:5173](http://localhost:5173)
- backend API: [http://localhost:3001](http://localhost:3001)
- Postgres: `localhost:5432`
- Redis: `localhost:6379`
- reminder worker: runs as `furevercare-worker`

### First-Time Database Bootstrap

The repo does not yet have a tracked migration runner. For a fresh local database, run the current bootstrap sequence from [docs/developer-operations.md](docs/developer-operations.md).

That guide includes:

- the full dev migration chain
- seed commands
- CMS seed commands
- known test accounts

### Local Development Without Docker

```bash
cd backend
npm install
npm run dev
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

If you also need reminder processing outside Docker:

```bash
cd backend
npm run dev:worker
```

## Current Architecture

- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Data stores: PostgreSQL 15 and Redis 7
- Background jobs: BullMQ worker for reminders and notifications
- Storage: local uploads in dev, S3 in deployed environments
- Email: Brevo for transactional mail, console fallback when `BREVO_API_KEY` is unset

## Current Product Surface

- Authentication and account settings
- Pet profiles with sharable emergency cards
- Health records:
  - conditions
  - allergies
  - medications
  - vaccinations
  - alerts
  - vets
  - emergency contacts
- Reminder rules for medications and vaccinations
- Document import and extraction review
- Share tokens and public card access
- Admin tools, CMS pages, and email template mapping

## Deployment Model

Deployments are automated.

- Pushes to `main` build GHCR images and deploy production via AWS SSM
- PRs build isolated preview environments at `https://furevercare-pr-<number>.gulatilabs.me`
- Production and PR environments both run:
  - frontend
  - backend API
  - Redis
  - Postgres
  - reminder worker

The authoritative deployment details live in:

- [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
- [deploy/docker-compose.prod.yml](deploy/docker-compose.prod.yml)

## Useful Links

- Developer/operator guide: [docs/developer-operations.md](docs/developer-operations.md)
- Agent workflow instructions: [AGENTS.md](AGENTS.md)
- Historical pre-launch plan: [PLAN-pre-launch.md](PLAN-pre-launch.md)
