#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "🚀 Starting backend (dev:reset)..."
(cd "$ROOT_DIR/backend" && npm run dev:reset) &
BACK_PID=$!

trap "echo 'Stopping backend...'; kill $BACK_PID" EXIT

echo "🚀 Starting frontend..."
cd "$ROOT_DIR/frontend"
pnpm dev
