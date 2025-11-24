#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "📦 Installing backend dependencies..."
cd "$ROOT_DIR/backend"
npm install

echo "🗄️  Applying Prisma schema..."
npx prisma db push
npx prisma generate

echo "🌱 (Optional) Seeding database..."
if [ "${SEED_DB:-false}" = "true" ]; then
  npm run db:reset
fi

echo "📦 Installing frontend dependencies..."
cd "$ROOT_DIR/frontend"
pnpm install

echo "✅ Dev setup completed. Run servers:"
echo "Backend: cd backend && npm run dev"
echo "Frontend: cd frontend && pnpm dev"
