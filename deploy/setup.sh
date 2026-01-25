#!/bin/bash
# First-time setup script for FureverCare on EC2
# Run this once after copying files to /srv/furevercare

set -e

echo "=== FureverCare Setup ==="

# Check if running as correct user
if [ "$(id -u)" = "0" ]; then
    echo "Do not run as root. Run as the deploy user."
    exit 1
fi

cd /srv/furevercare

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env

    # Generate secure secrets
    JWT_SECRET=$(openssl rand -base64 32)
    DB_PASSWORD=$(openssl rand -base64 24)

    # Update .env with generated secrets
    sed -i "s/CHANGE_THIS_TO_A_LONG_RANDOM_STRING/$JWT_SECRET/" .env
    sed -i "s/CHANGE_THIS_TO_A_SECURE_PASSWORD/$DB_PASSWORD/" .env

    echo "Generated secure secrets in .env"
    echo "Please review /srv/furevercare/.env before continuing"
    exit 0
fi

echo "Starting services..."
docker compose -f docker-compose.prod.yml up -d

echo "Waiting for database to be ready..."
sleep 10

echo "Running database migrations..."
docker compose -f docker-compose.prod.yml exec -T backend npm run db:migrate
docker compose -f docker-compose.prod.yml exec -T backend npm run db:migrate:owners

echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Ensure Caddy is configured to route to furevercare-web and furevercare-api"
echo "2. Reload Caddy: sudo systemctl reload caddy"
echo "3. Access the app at https://furevercare.gulatilabs.me"
