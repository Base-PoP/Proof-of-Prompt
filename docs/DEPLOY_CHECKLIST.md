# 배포 체크리스트

## ✅ 완료된 항목

- [x] TreasuryPool.sol 스마트 컨트랙트 작성
- [x] hardhat.config.ts 설정
- [x] package.json 의존성 설정
- [x] deploy-treasury.ts 배포 스크립트 작성
- [x] TypeScript 설정
- [x] Solidity 컴파일 성공 ✨
- [x] 배포 가이드 작성

## 📋 배포 전 체크리스트

### 환경 설정
- [ ] `.env` 파일에 HARDHAT_PRIVATE_KEY 추가
- [ ] HARDHAT_PRIVATE_KEY 형식 확인 (0x 제외한 64자)
- [ ] FLOCK_WALLET 주소 확인
- [ ] TREASURY_ADMIN 주소 설정
- [ ] Basescan API Key 추가 (선택사항)

### 네트워크 확인
- [ ] Private Key 주소가 Base Sepolia에서 ETH 보유 확인
- [ ] 최소 0.1 ETH 이상 보유 (가스비)
- [ ] https://sepolia.base.org에서 네트워크 추가됨

### 배포 테스트
- [ ] `npx hardhat compile` 성공 확인
- [ ] 네트워크 연결 테스트:
  ```bash
  npx hardhat run scripts/test-network.ts --network baseSepolia
  ```

## 🚀 배포 실행

### Step 1: 환경 확인
```bash
npm run compile
```

### Step 2: Sepolia 배포
```bash
npm run deploy:sepolia
```

### Step 3: 배포 결과 저장
배포 후 출력된 주소를 저장:
- 📍 Treasury Pool 주소
- 📄 deployments/baseSepolia-treasury.json 파일 확인

### Step 4: .env 업데이트
```bash
# 배포된 주소로 업데이트
TREASURY_POOL_ADDRESS=0x...
TREASURY_POOL_NETWORK=baseSepolia
TREASURY_POOL_CHAIN_ID=84532
```

## 🔍 배포 후 확인

### 1. Basescan에서 조회
- URL: https://sepolia.basescan.org/address/{TREASURY_POOL_ADDRESS}
- 상태: "Contract" 확인
- 거래: 배포 거래 확인

### 2. 백엔드 통합 테스트
```bash
cd backend
npm install ethers  # 필요 시
npm run dev
# x402 payment flow 테스트
```

### 3. 프론트엔드 결제 흐름 테스트
```bash
cd frontend
pnpm dev
# x402 서명 및 결제 테스트
```

## 🐛 오류 해결

### "Insufficient funds" 오류
```
→ Faucet에서 Base Sepolia ETH 받기:
  https://www.sepoliafaucet.io
```

### "Private key not found" 오류
```
→ .env 파일 경로 확인
→ HARDHAT_PRIVATE_KEY 값 확인
```

### 컨트랙트 배포 실패
```
→ 네트워크 연결 확인
→ Private key 주소의 ETH 잔액 확인
→ Hardhat 재시작: rm -rf artifacts/
```

## 📊 배포 정보 저장 위치

```
c:\Users\pc\Desktop\base_hack\Lmarena\
├── deployments/
│   └── baseSepolia-treasury.json      # ← 배포 정보
├── .env                               # ← 환경 변수
└── hardhat.config.ts                  # ← Hardhat 설정
```

## 🎯 다음 단계

배포 완료 후:

1. **Backend 통합 (backend/)**
   ```bash
   npm install ethers
   # backend/src/lib/x402-verification.ts 활성화
   ```

2. **Frontend 테스트 (frontend/)**
   ```bash
   pnpm dev
   # x402 결제 흐름 테스트
   ```

3. **E2E 테스트**
   - 사용자 서명
   - Treasury에 결제
   - Treasury에서 Flock으로 자동 결제

## ⚠️ 주의사항

- **Private Key 보안**: .env를 절대 공개 저장소에 커밋하지 마세요
- **Testnet → Mainnet**: 테스트 후 mainnet 배포는 `npm run deploy:mainnet`
- **USDC 주소**: Testnet과 Mainnet 주소가 다릅니다
- **Flock 지갑**: 정확한 주소 확인 후 배포

---

**배포에 문제가 있으면 docs/DEPLOY_GUIDE_KO.md를 참고하세요.**
