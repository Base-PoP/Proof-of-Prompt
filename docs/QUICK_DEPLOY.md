# 🎯 Treasury Pool 배포 - 빠른 시작 가이드

## 현재 상태 ✅

```
✨ 컴파일 완료
✅ Hardhat 설정 완료  
✅ 배포 스크립트 준비 완료
✅ Backend ethers.js 설치 완료
⏳ 배포 대기 중
```

---

## 🚀 배포하기 (5분 안에 완료)

### 1️⃣ Private Key 설정

`.env` 파일 수정:

```bash
# MetaMask에서 복사한 Private Key (0x 제외)
HARDHAT_PRIVATE_KEY=abc123...xyz  # 64자 16진수

# 배포자 지갑이 Sepolia에서 최소 0.1 ETH 필요
# Faucet: https://www.sepoliafaucet.io
```

### 2️⃣ Sepolia에 배포

```bash
npm run deploy:sepolia
```

**예상 결과:**
```
🚀 Treasury Pool 배포 시작...
📍 배포자: 0x...
✅ Treasury Pool 배포 완료!
📍 주소: 0x...
```

### 3️⃣ 주소 저장

출력된 주소를 `.env`에 추가:

```bash
TREASURY_POOL_ADDRESS=0x...  # ← 출력된 주소 복사
TREASURY_POOL_NETWORK=baseSepolia
TREASURY_POOL_CHAIN_ID=84532
```

---

## 📋 Before / After

### Before (지금 상태)
```
❌ Smart Contract: 배포 안 됨
❌ Backend: x402 검증 활성화 안 됨
❌ Frontend: 실제 결제 안 됨
```

### After (배포 후)
```
✅ Smart Contract: Base Sepolia 배포됨
✅ Backend: x402 검증 작동함
✅ Frontend: 실제 결제 흐름 동작함
```

---

## 🔄 배포 후 다음 단계

### 1. Backend 활성화
```bash
cd backend
npm run dev
```

### 2. Frontend 테스트
```bash
cd frontend
pnpm dev
```

### 3. E2E 테스트
- 사용자가 `/api/chat`에 접속
- 402 Payment Required 받음
- 지갑으로 서명 (MetaMask)
- 자동으로 Treasury Pool에 USDC 결제
- Treasury가 자동으로 Flock에 비용 결제
- Chat 응답 수신

---

## 💰 테스트용 USDC 받기 (Sepolia)

```bash
# Option 1: Faucet 사용
https://sepolia.base.org → Faucet → USDC 청구

# Option 2: 직접 mint (테스트용)
# 만약 USDC mock이 있다면:
npx hardhat run scripts/mint-usdc.ts --network baseSepolia
```

---

## 🐛 만약 오류가 나면?

### "Insufficient funds" 오류
```bash
→ Base Sepolia Faucet에서 ETH 받기
→ https://www.sepoliafaucet.io
```

### "Private key error" 오류
```bash
→ .env 파일에서 HARDHAT_PRIVATE_KEY 확인
→ 형식: 0x 제외한 64자 16진수
→ 공백이나 줄바꿈 없음
```

### 배포 시간이 오래 걸림
```bash
→ 정상 (Base Sepolia는 가끔 느림)
→ 2-3분 기다려보기
→ 실패하면 다시 시도
```

---

## 📚 파일 위치

```
c:\Users\pc\Desktop\base_hack\Lmarena\
├── .env                          # ← Private Key 추가하기
├── hardhat.config.ts             # Hardhat 설정
├── scripts/
│   └── deploy-treasury.ts        # ← 배포 스크립트
├── contracts/
│   └── TreasuryPool.sol          # 스마트 컨트랙트
└── deployments/
    └── baseSepolia-treasury.json # ← 배포 결과
```

---

## 📖 상세 가이드

더 자세한 정보는:
- **배포 가이드**: `DEPLOY_GUIDE_KO.md`
- **체크리스트**: `DEPLOY_CHECKLIST.md`
- **x402 통합**: `docs/X402_QUICK_START.md`

---

## ✨ 완료!

배포 후:
```bash
# 1. Backend 실행
cd backend && npm run dev

# 2. Frontend 실행 (다른 터미널)
cd frontend && pnpm dev

# 3. 브라우저에서 테스트
http://localhost:3000
```

---

**질문? `docs/TREASURY_POOL_DEPLOYMENT.md` 참고**
