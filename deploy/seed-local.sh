#!/bin/bash
# Seed local development database with sample data
#
# Run this script from the FureverCare/crew/amit directory

set -e

cd "$(dirname "$0")/.."

echo "🌱 Seeding local FureverCare database..."
echo ""

# Check if docker compose is running
if ! docker compose ps | grep -q "furevercare-db.*running"; then
  echo "⚠️  Database container not running. Starting services..."
  docker compose up -d db redis
  echo "   Waiting for database to be ready..."
  sleep 3
fi

# Run seed
echo "📤 Running seed script..."
cd backend
npm run db:seed:dev

echo ""
echo "✅ Local seed completed!"
