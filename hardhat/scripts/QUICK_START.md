# Quick Start (로컬 세팅)

## 1) 환경 변수 복사
- `cp backend/.env.example backend/.env`
- `cp frontend/env.local.example frontend/.env.local`
값 채우기: DB `DATABASE_URL`, Privy `NEXT_PUBLIC_PRIVY_APP_ID`, 체인/결제(RPC_URL, PAY_TO_ADDRESS 등)

## 2) 의존성 + DB 적용
```bash
chmod +x scripts/dev-setup.sh
SEED_DB=true ./scripts/dev-setup.sh   # 시드 포함 (옵션)
```
Windows:
```powershell
$env:SEED_DB="true"
.\scripts\dev-setup.ps1
```

## 3) 서버 실행
- 동시 실행(원터치): `./scripts/dev-all.sh` (Windows: `.\\scripts\\dev-all.ps1`)
- 또는
  - Backend: `cd backend && npm run dev`
  - Frontend: `cd frontend && pnpm dev`

## 4) 확인
- 헬스체크: `curl http://localhost:4000/health`
- 프론트: http://localhost:3000
