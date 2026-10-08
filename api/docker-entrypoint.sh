#!/bin/sh
set -e

echo "Applying database migrations..."
npx prisma migrate deploy

echo "Seeding database (idempotent upserts)..."
node dist/prisma/seed.js

echo "Starting API..."
exec node dist/main.js

