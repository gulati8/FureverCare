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

This repo now uses Prisma Migrate with a baseline migration for fresh databases and a one-time baseline-resolve step for existing databases.

Run from the repo root after `docker compose up`:

```bash
docker compose exec backend npm run db:migrate
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

1. Update `backend/prisma/schema.prisma`.
2. Run `npm run db:migrate:dev -- --name <descriptive_name>` from `backend/`.
3. Commit the generated migration under `backend/prisma/migrations/`.
4. Regenerate the Prisma client if needed with `npm run prisma:generate`.

Existing environments are baselined automatically the first time `npm run db:migrate` runs after the Prisma cutover. Fresh databases apply `0_init` and later migrations normally. Prisma tracks history in `_prisma_migrations`.

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
- `npm run db:migrate` runs Prisma baseline/resolve logic and `prisma migrate deploy`
- `docker compose up -d` restarts the production stack

Primary sources:

- [.github/workflows/deploy.yml](../.github/workflows/deploy.yml)
- [deploy/docker-compose.prod.yml](../deploy/docker-compose.prod.yml)

## SSH vs SSM

SSM is the canonical deployment path and the thing automation should assume exists.

SSH access may also be available for debugging and live inspection, but do not treat SSH as the required deploy mechanism unless the user explicitly asks for it.
