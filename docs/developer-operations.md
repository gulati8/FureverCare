# Developer Operations

This is the current source of truth for local setup, migrations, seeds, preview environments, and deployment behavior.

## Local Stack

### Docker compose

```bash
cp .env.example .env
docker compose up --build -d
```

Services:

- frontend: `http://localhost:5173`
- backend API: `http://localhost:3001`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`
- worker: `furevercare-worker`

### Important local env vars

Root [.env.example](../.env.example) documents the local defaults.

The most relevant non-obvious ones are:

- `BREVO_API_KEY`: when unset, emails fall back to console logging
- `REMINDER_PROCESS_CRON`: BullMQ scheduler cron for reminder scans
- `REMINDER_PROCESS_TIMEZONE`: timezone for scheduled reminder scans
- `STORAGE_PROVIDER`: `local` in local dev, `s3` in deployed environments

## Fresh Database Bootstrap

This repo still uses manually maintained migration scripts. A fresh local database needs the migration chain below, not just `db:migrate:dev`.

Run from the repo root after `docker compose up`:

```bash
for script in \
  db:migrate:dev \
  db:migrate:admin-role:dev \
  db:migrate:owners:dev \
  db:migrate:pdf-import:dev \
  db:migrate:weight-units:dev \
  db:migrate:sex-fixed:dev \
  db:migrate:password-reset:dev \
  db:migrate:share-tokens:dev \
  db:migrate:image-import:dev \
  db:migrate:document-import:dev \
  db:migrate:image-metadata:dev \
  db:migrate:cms:dev \
  db:migrate:subscriptions:dev \
  db:migrate:alerts:dev \
  db:migrate:vaccination-show-on-card:dev \
  db:migrate:date-precision:dev \
  db:migrate:allergy-show-on-card:dev \
  db:migrate:document-groups:dev \
  db:migrate:soft-delete:dev \
  db:migrate:pet-age-color:dev \
  db:migrate:email-templates:dev \
  db:migrate:reminders:dev
do
  docker compose exec backend npm run "$script"
done
```

Then seed the app data:

```bash
docker compose exec backend npm run db:seed:dev
docker compose exec backend npm run db:seed:cms:dev
docker compose exec backend npm run db:seed:cms-empty-state:dev
```

## Seeded Accounts

Seed data is defined in [backend/src/db/seed.ts](../backend/src/db/seed.ts).

Known credentials:

- admin:
  - email: `admin@furevercare.com`
  - password: `admin123`
- regular seeded users:
  - password: `FureverCare2024!`
  - examples:
    - `sarah.chen@example.com`
    - `emily.rodriguez@example.com`
    - `james.wilson@example.com`

Useful seeded pets include `Biscuit` and `Luna`.

## Background Jobs and Notifications

- Reminder scheduling and delivery run through BullMQ + Redis
- The worker entrypoint is `npm run start:worker`
- Local compose runs the worker automatically
- Production and PR preview environments both run the worker automatically
- Email delivery uses Brevo when `BREVO_API_KEY` is present
- Without `BREVO_API_KEY`, notifications fall back to the console provider

Relevant files:

- [backend/src/jobs/worker.ts](../backend/src/jobs/worker.ts)
- [backend/src/services/reminder-scheduler.ts](../backend/src/services/reminder-scheduler.ts)
- [backend/src/services/notifications.ts](../backend/src/services/notifications.ts)

## Migration Rules

When adding a new migration:

1. Create the migration file under `backend/src/db/`.
2. Add both production and `:dev` scripts in [backend/package.json](../backend/package.json).
3. Add the production migration step to [.github/workflows/deploy.yml](../.github/workflows/deploy.yml).
4. If a fresh database needs the migration, add it to the bootstrap sequence in this document.

There is currently no tracked migration runner table. The deploy and bootstrap sequences are manual and order-dependent.

## Preview Environments

Each PR against `main` gets an isolated preview environment:

- URL pattern: `https://furevercare-pr-<number>.gulatilabs.me`
- stack:
  - frontend
  - backend
  - worker
  - Postgres
  - Redis
- S3 uploads are namespaced by PR using `S3_KEY_PREFIX=pr-<number>/`

The preview environment logic lives in [.github/workflows/deploy.yml](../.github/workflows/deploy.yml).

## Production Deployment

Production deploys are not manual SSH-first workflows.

What actually happens:

- merge to `main`
- GitHub Actions builds and pushes `ghcr.io/gulati8/furevercare-api:latest`
- GitHub Actions builds and pushes `ghcr.io/gulati8/furevercare-web:latest`
- the workflow deploys to EC2 via AWS SSM
- production compose is written to `/srv/furevercare/docker-compose.prod.yml`
- migration scripts are run one-by-one
- `docker compose up -d` restarts the production stack

Primary sources:

- [.github/workflows/deploy.yml](../.github/workflows/deploy.yml)
- [deploy/docker-compose.prod.yml](../deploy/docker-compose.prod.yml)

## SSH vs SSM

SSM is the canonical deployment path and the thing automation should assume exists.

SSH access may also be available for debugging and live inspection, but do not treat SSH as the required deploy mechanism unless the user explicitly asks for it.
