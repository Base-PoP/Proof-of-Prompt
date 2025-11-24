$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "🚀 Starting backend (dev:reset)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoLogo -NoProfile -Command cd `$Root/backend; npm run dev:reset" | Out-Null

Write-Host "🚀 Starting frontend..." -ForegroundColor Cyan
Set-Location "$Root/frontend"
pnpm dev
