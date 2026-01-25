# FureverCare

Digital emergency health cards for pets. Give pet owners independent control over their pet's essential health information with an instantly shareable format (QR code/link) that ER staff can access without login.

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Node.js 20+ (for local development without Docker)

### Running with Docker (Recommended)

```bash
# Copy environment file
cp .env.example .env

# Start all services
docker-compose up --build

# The app will be available at:
# - Frontend: http://localhost:5173
# - Backend API: http://localhost:3001
# - Database: localhost:5432
# - Redis: localhost:6379
```

### First-time Setup

After starting the services, run database migrations:

```bash
docker-compose exec backend npm run db:migrate
```

### Local Development (without Docker)

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Containerization**: Docker, Docker Compose

## Features

### MVP (Current)
- User registration and authentication
- Pet profile management (multiple pets per account)
- Health records:
  - Medical conditions
  - Allergies (with severity levels)
  - Current medications
  - Vaccination records
  - Primary veterinarian info
  - Emergency contacts
- Shareable emergency card with QR code
- Public view (no login required for ER staff)

### Planned
- Photo upload
- PDF export
- Vaccination reminders
- Multiple owner access
- Vet portal

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Pets
- `GET /api/pets` - List user's pets
- `POST /api/pets` - Create pet
- `GET /api/pets/:id` - Get pet details
- `PATCH /api/pets/:id` - Update pet
- `DELETE /api/pets/:id` - Delete pet
- `POST /api/pets/:id/regenerate-share-id` - Generate new share link

### Health Records (all require authentication)
- `GET/POST /api/pets/:id/vets` - Veterinarians
- `GET/POST /api/pets/:id/conditions` - Medical conditions
- `GET/POST /api/pets/:id/allergies` - Allergies
- `GET/POST/PATCH /api/pets/:id/medications` - Medications
- `GET/POST /api/pets/:id/vaccinations` - Vaccinations
- `GET/POST /api/pets/:id/emergency-contacts` - Emergency contacts

### Public (no auth required)
- `GET /api/public/card/:shareId` - Get emergency card data

## Environment Variables

See `.env.example` for all available options.

## Deployment

The Docker setup works for both local development and production deployment. For AWS EC2:

1. Install Docker and Docker Compose on EC2
2. Clone the repository
3. Configure `.env` with production values
4. Set `NODE_ENV=production`
5. Run `docker-compose up -d`

For production, consider:
- Using AWS RDS for PostgreSQL
- Using AWS ElastiCache for Redis
- Setting up HTTPS with a reverse proxy (nginx/ALB)
- Using a proper `JWT_SECRET`

## License

MIT
