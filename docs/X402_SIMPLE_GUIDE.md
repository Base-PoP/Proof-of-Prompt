# x402 구현 - 간단한 설명

## 당신이 하려던 것

**사용자가 Chat API를 쓸 때마다 USDC로 결제하게 하기**

```
사용자 → "Chat API 호출" → 시스템에서 결제 요청 → 사용자 지갑으로 결제
```

---

## 지금 상태

### ✅ 이미 구현된 것

1. **Backend (Express)**
   - x402 미들웨어: `backend/src/lib/x402.ts`
   - x402 검증: `backend/src/lib/x402-verification.ts`
   - Chat 엔드포인트 수정: `backend/src/modules/arena/arena.service.ts`

2. **Frontend (Next.js)**
   - x402 클라이언트: `frontend/lib/x402-client.ts`
   - API 연동: `frontend/lib/api.ts`

3. **Smart Contract (Solidity)**
   - Treasury Pool: `hardhat/contracts/TreasuryPool.sol`
   - 배포 스크립트: `hardhat/scripts/deploy-treasury.ts`

### ⏳ 이제 해야 할 것

1. **배포**
2. **테스트**

---

## 작동 원리 (3단계)

### Step 1️⃣: 사용자가 Chat 요청
```
사용자 요청:
GET /api/chat?prompt="안녕"
```

### Step 2️⃣: 백엔드가 402 응답 + 결제 요청
```
응답 상태: 402 Payment Required

응답 본문:
{
  "error": "Payment required",
  "x402": {
    "price": "0.1",           // 0.1 USDC
    "currency": "USDC",
    "nonce": "12345",         // 고유 값
    "deadline": 1700000000,   // 5분 후
    "treasuryAddress": "0x..."
  }
}
```

### Step 3️⃣: 프론트엔드가 자동으로 처리
```
1. 사용자 지갑(MetaMask)에서 서명 요청
2. 서명 완료
3. Treasury Pool로 USDC 전송
4. 같은 요청 다시 보냄 (이번엔 결제됨)
5. Chat 응답 받음
```

---

## 배포 순서

### 1️⃣ Smart Contract 배포 (한 번만)

```bash
# 1. .env 파일에 Private Key 추가
# HARDHAT_PRIVATE_KEY=abc123...

# 2. 배포 실행
npm run deploy:sepolia

# 3. 출력되는 주소 복사
# → Treasury Pool 주소: 0x...

# 4. .env에 추가
# TREASURY_POOL_ADDRESS=0x...
```

**소요시간**: 2-3분

### 2️⃣ Backend 시작

```bash
cd backend
npm run dev
```

**결과**: API 서버 실행 (http://localhost:4000)

### 3️⃣ Frontend 시작

```bash
cd frontend
pnpm dev
```

**결과**: 웹앱 실행 (http://localhost:3000)

### 4️⃣ 테스트

```
http://localhost:3000 접속
→ Chat 요청
→ MetaMask에서 서명 요청 나타남
→ 승인
→ USDC 결제
→ Chat 응답
```

---

## 각 파트 설명

### Backend (누가 결제할지 결정)

```typescript
// backend/src/modules/arena/arena.service.ts

// x402 검증 추가됨
if (req.headers["x-402-auth"]) {
  // 사용자가 결제했는지 확인
  const verified = await verifyX402Signature(req);
  if (!verified) {
    return 402 Payment Required 응답
  }
}

// 결제됨 → Chat 진행
const response = await flockApi.call(...);
return response;
```

### Frontend (어떻게 결제할지)

```typescript
// frontend/lib/api.ts

const response = await fetch('/api/chat', {
  method: 'POST'
});

if (response.status === 402) {
  // 402 응답 받음
  const x402Data = await response.json();
  
  // MetaMask에서 서명
  const signature = await signX402Payment(x402Data);
  
  // 다시 요청 (이번엔 서명 포함)
  const finalResponse = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'x-402-auth': signature  // ← 서명 추가
    }
  });
  
  return finalResponse;
}
```

### Smart Contract (어디로 돈 갈지)

```solidity
// hardhat/contracts/TreasuryPool.sol

contract TreasuryPool {
  // 사용자의 USDC 보관
  mapping(address => uint256) public userBalances;
  
  // 사용자 → Treasury로 결제
  function receivePaymentWithPermit(...) {
    // USDC 받음
    usdc.transferFrom(user, address(this), amount);
    // 잔액 기록
    userBalances[user] += amount;
  }
  
  // Treasury → Flock으로 결제
  function deductFlockCost(address user, uint256 amount) {
    userBalances[user] -= amount;
    usdc.transfer(flockWallet, amount);  // Flock에 보냄
  }
}
```

---

## 환경변수 필요한 것

### `.env` (루트 디렉토리)

```bash
# 배포용
HARDHAT_PRIVATE_KEY=your_metamask_private_key  # (0x 제외)
FLOCK_WALLET=0x...                             # Flock 지갑
TREASURY_ADMIN=0x...                           # 관리자 주소

# 배포 후
TREASURY_POOL_ADDRESS=0x...                    # 배포된 주소
```

### `backend/.env`

```bash
TREASURY_POOL_ADDRESS=0x...
TREASURY_POOL_RPC_URL=https://sepolia.base.org
X402_ENABLED=true
X402_CHAT_PRICE=0.1  # USD
```

### `frontend/.env.local`

```bash
NEXT_PUBLIC_X402_ENABLED=true
NEXT_PUBLIC_TREASURY_POOL_ADDRESS=0x...
```

---

## 문제 해결

### Q: 402 응답이 안 나와요
→ `backend/src/modules/arena/arena.service.ts`에서 x402 검증 로직이 활성화되었는지 확인

### Q: MetaMask 서명 요청이 안 나와요
→ `frontend/lib/api.ts`에서 x402-client를 import 했는지 확인

### Q: 결제 후 Chat 응답이 안 와요
→ Treasury Pool 주소가 올바른지 확인 (`npm run deploy:sepolia` 재실행)

### Q: 배포 실패
→ `.env`에 Private Key가 맞는지 확인
→ Base Sepolia에서 0.1 ETH 이상 있는지 확인 (Faucet: https://www.sepoliafaucet.io)

---

## 다음 단계

```
1. npm run deploy:sepolia      ← Smart Contract 배포
2. Treasury Pool 주소 복사 → .env에 추가
3. cd backend && npm run dev   ← Backend 시작
4. cd frontend && pnpm dev     ← Frontend 시작
5. http://localhost:3000에서 테스트
```

---

## 한 줄 요약

**"당신의 모든 코드는 이미 준비되어 있습니다. 이제 배포하고 테스트만 하면 됩니다."**
