$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "📦 Installing backend dependencies..." -ForegroundColor Cyan
Set-Location "$Root/backend"
npm install

Write-Host "🗄️  Applying Prisma schema..." -ForegroundColor Cyan
npx prisma db push
npx prisma generate

if ($env:SEED_DB -eq "true") {
  Write-Host "🌱 Seeding database..." -ForegroundColor Cyan
  npm run db:reset
}

Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location "$Root/frontend"
pnpm install

Write-Host "✅ Dev setup completed."
Write-Host "Backend: cd backend && npm run dev"
Write-Host "Frontend: cd frontend && pnpm dev"
