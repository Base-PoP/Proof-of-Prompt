# 빠른 시작 / 환경 설정 가이드

## 1) 환경 변수 템플릿 복사
- 백엔드: `cp backend/.env.example backend/.env`
- 프론트: `cp frontend/env.local.example frontend/.env.local`

필요 값 채우기:
- DB: `DATABASE_URL`
- 결제/체인(Base Sepolia 기본): `RPC_URL`, `PAY_TO_ADDRESS`, `FACILITATOR_PRIVATE_KEY` (없으면 서명 시뮬 상태)
- Privy: `NEXT_PUBLIC_PRIVY_APP_ID`
- 목 모드 해제: `NEXT_PUBLIC_USE_MOCK_DATA=false`

## 2) 의존성 설치 및 DB 적용
루트에서:
```bash
chmod +x scripts/dev-setup.sh
SEED_DB=true ./scripts/dev-setup.sh   # 시드까지 실행(옵션)
```
윈도우(PowerShell):
```powershell
$env:SEED_DB="true"
.\scripts\dev-setup.ps1
```

## 3) 서버 실행
- Backend: `cd backend && npm run dev` (http://localhost:4000)
- Frontend: `cd frontend && pnpm dev` (http://localhost:3000)
- 원터치(동시에 실행): `./scripts/dev-all.sh` (Windows: `.\scripts\dev-all.ps1`)

## 4) 확인
- 헬스 체크: `curl http://localhost:4000/health`
- 프론트 접속: http://localhost:3000

## 배포/실환경 팁
- `NEXT_PUBLIC_USE_MOCK_DATA=false` 유지
- 결제 실구현 시 `RPC_URL`, `PAY_TO_ADDRESS`, `FACILITATOR_PRIVATE_KEY` 필수
- Prisma 스키마 변경 후 `npx prisma db push && npx prisma generate`
