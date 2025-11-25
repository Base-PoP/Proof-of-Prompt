# Treasury Pool 통합 가이드

## 📊 아키텍처

```
사용자
  ↓
  USDC 결제 + x402 서명
  ↓
🏛️ Treasury Pool 스마트 컨트랙트
  ├─ 사용자 잔액 저장
  ├─ Flock 비용 자동 차감
  └─ 통계 기록
  ↓
백엔드 (Node.js)
  ├─ x402 서명 검증 (EIP-191)
  ├─ Treasury 잔액 확인
  ├─ 비용 차감 요청
  └─ API 호출 승인
  ↓
🦅 Flock API
  ↓
LLM 응답
```

---

## 🛠️ 구현 단계

### 1단계: Solidity 컨트랙트 작성 ✅

**파일**: `contracts/TreasuryPool.sol`

주요 기능:
- `receivePaymentWithPermit()` - x402 서명 기반 USDC 수신
- `deductFlockCost()` - Flock 비용 자동 차감
- `getBalance()` - 사용자 잔액 조회
- `setFlockCost()` - Flock 비용 설정

### 2단계: 백엔드 x402 검증 ✅

**파일**: `backend/src/lib/x402-verification.ts`

주요 함수:
- `verifyX402Signature()` - 서명 검증 (EIP-191)
- `recordX402Payment()` - 결제 기록
- `checkAndDeductTreasuryCost()` - Treasury 차감
- `getTreasuryBalance()` - 잔액 조회

### 3단계: Arena Service 통합 ✅

**파일**: `backend/src/modules/arena/arena.service.ts`

변경사항:
- x402 검증 로직 추가
- Treasury 비용 확인
- Flock 호출 전 결제 확인

### 4단계: Treasury Client 생성 (필요할 때)

**파일**: `backend/src/lib/treasury-pool.ts` (준비됨)

ethers.js 설치 후:
```bash
npm install ethers
```

---

## 📋 설정 방법

### Step 1: 환경 변수 설정

```bash
cd backend
cp .env.example .env
```

**.env 파일 수정:**

```env
# Treasury Pool 설정
TREASURY_POOL_ADDRESS=0x...              # 배포 후 업데이트
TREASURY_POOL_RPC_URL=https://...
TREASURY_POOL_PRIVATE_KEY=0x...          # 선택사항

# x402 설정
X402_ENABLED=true
X402_NETWORK=base-sepolia
X402_CHAT_PRICE=$0.01                   # Flock 비용과 동일하게

# Flock 설정
FLOCK_API_KEY=your_api_key
```

### Step 2: Treasury Pool 컨트랙트 배포

```bash
# 1. Hardhat 초기화
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# 2. 배포 스크립트 작성
cat > scripts/deploy-treasury.ts << 'EOF'
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const USDC_ADDRESS = "0x...";           // Base Sepolia USDC
  const FLOCK_WALLET = "0x...";           // Flock 비용 수령 주소
  const TREASURY_ADMIN = deployer.address;

  const TreasuryPool = await ethers.getContractFactory("TreasuryPool");
  const treasury = await TreasuryPool.deploy(
    USDC_ADDRESS,
    FLOCK_WALLET,
    TREASURY_ADMIN
  );

  await treasury.deployed();
  console.log("Treasury Pool deployed to:", treasury.address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
EOF

# 3. 배포
npx hardhat run scripts/deploy-treasury.ts --network baseSepolia
```

### Step 3: 배포 후 설정

배포 후 `.env` 업데이트:

```env
TREASURY_POOL_ADDRESS=0xYourDeployedContractAddress
```

---

## 🔄 결제 흐름 상세

### 1️⃣ 클라이언트: 결제 요청

```typescript
// frontend/lib/api.ts
const response = await arenaApi.createChat(prompt, address, userId, {
  address: userAddress,
  provider: ethersProvider
});
```

### 2️⃣ 서버: 402 응답

```json
HTTP 402 Payment Required
{
  "error": "Payment Required",
  "payment": {
    "chainId": 84532,
    "token": "0x...",           // USDC
    "pay_to_address": "0x...",  // Treasury Pool
    "amount": "10000",          // 0.01 USDC (wei)
    "price": "$0.01",
    "network": "base-sepolia",
    "description": " Proof-of-Prompt : 1 prompt answer"
  }
}
```

### 3️⃣ 클라이언트: 메시지 서명

```typescript
// frontend/lib/x402-client.ts
const message = "I authorize payment for $0.01 USD (10000 0x...) to 0x... on base-sepolia chain for:  Proof-of-Prompt : 1 prompt answer";
const signature = await signer.signMessage(message);
```

### 4️⃣ 클라이언트: 인증 헤더 추가

```typescript
const authToken = JSON.stringify({
  payload: paymentInfo,
  signature: signature,
  address: userAddress,
  timestamp: Date.now()
});

// x-payment-authorization 헤더에 포함
```

### 5️⃣ 서버: 검증 및 차감

```typescript
// backend/src/modules/arena/arena.service.ts
const isValid = await verifyX402Signature(x402Payload);
const treasuryResult = await checkAndDeductTreasuryCost(
  walletAddress,
  x402Payload.payload.amount
);

// Treasury Pool 컨트랙트 호출:
// deductFlockCost(userAddress, 1)
//   → userBalance 차감
//   → USDC를 Flock 지갑에 전송
```

### 6️⃣ 서버: API 호출 진행

```typescript
// 결제 확인 완료 → Flock API 호출
const flockResponse = await callFlockModel(modelId, prompt);
```

### 7️⃣ 서버: 200 응답

```json
HTTP 200 OK
{
  "matchId": 123,
  "prompt": "...",
  "response": "..."
}
```

---

## 💰 비용 계산

### USDC 금액 (wei) = USD * 1,000,000

```
$0.01 USDC = 10,000 wei
$0.05 USDC = 50,000 wei
$0.10 USDC = 100,000 wei
$1.00 USDC = 1,000,000 wei
```

### Flock 비용 설정

```solidity
// Treasury Pool에서
flockCostPerCall = 100000;  // 0.1 USDC

// 또는 setter 함수로 변경
treasury.setFlockCost(100000);
```

---

## 🔐 보안 검증

### ✅ EIP-191 서명 검증

```typescript
// ethers.js 설치 필요
npm install ethers

// 백엔드에서 서명 검증
const recovered = ethers.verifyMessage(message, signature);
if (recovered.toLowerCase() !== userAddress.toLowerCase()) {
  throw new Error("Invalid signature");
}
```

### ✅ 타임스탬프 검증

```typescript
// 5분 이내 서명만 유효
const timeDiff = Math.abs(now - payload.timestamp);
if (timeDiff > 5 * 60 * 1000) {
  throw new Error("Signature expired");
}
```

### ✅ 주소 검증

```typescript
// 서명자 주소 = 결제 사용자 주소
if (x402Payload.address !== walletAddress) {
  throw new Error("Address mismatch");
}
```

---

## 📊 Treasury Pool 함수 레퍼런스

### Read Functions

```solidity
// 사용자의 현재 잔액
function getBalance(address user) external view returns (uint256);

// 사용자의 누적 결제액
function getTotalPaid(address user) external view returns (uint256);

// 사용자의 API 호출 횟수
function getCallCount(address user) external view returns (uint256);

// Treasury의 총 보유액
function getTreasuryBalance() external view returns (uint256);

// Flock에 지불한 총액
function getTotalFlockPayments() external view returns (uint256);

// 특정 호출 횟수의 비용
function calculateCost(uint256 callCount) external view returns (uint256);
```

### Write Functions

```solidity
// EIP-2612 permit를 사용한 결제 수신
function receivePaymentWithPermit(
  address user,
  uint256 amount,
  uint256 deadline,
  uint8 v,
  bytes32 r,
  bytes32 s
) external;

// Flock 비용 자동 차감
function deductFlockCost(
  address user,
  uint256 callCount
) external returns (bool);

// 잔액 직접 차감
function deductBalance(
  address user,
  uint256 amount
) external returns (bool);

// Flock 비용 설정 (owner만)
function setFlockCost(uint256 newCost) external;

// Flock 지갑 변경 (owner만)
function setFlockWallet(address newWallet) external;

// USDC 인출 (owner만)
function withdrawUSDC(uint256 amount) external;
```

---

## 🧪 테스트

### 로컬 테스트

```bash
# 1. 환경 변수 설정
X402_ENABLED=false  # 서명 검증 스킵

# 2. 서버 시작
npm run dev

# 3. API 테스트
curl -X POST http://localhost:4000/arena/chat \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello",
    "walletAddress": "0x..."
  }'

# 4. 응답 확인
# HTTP 402 Payment Required (x402 활성화 시)
# 또는 HTTP 200 OK (x402 비활성화 시)
```

### 테스트넷 테스트

1. **Treasury Pool 배포**
   ```bash
   npx hardhat run scripts/deploy-treasury.ts --network baseSepolia
   ```

2. **`.env` 업데이트**
   ```env
   TREASURY_POOL_ADDRESS=0x...
   X402_ENABLED=true
   ```

3. **테스트 USDC 획득**
   - [Base Sepolia Faucet](https://faucet.circle.com/)에서 테스트 USDC 요청

4. **Permit 시그니처 생성** (선택사항)
   ```typescript
   // EIP-2612 permit 생성 (frontend)
   const permit = await generatePermit(
     userAddress,
     treasuryPoolAddress,
     amount,
     deadline
   );
   ```

5. **결제 테스트**
   ```bash
   # 프론트엔드에서 지갑 연결 후
   # Chat 페이지 → 프롬프트 입력 → Send
   # 자동으로 402 → 서명 → 재요청
   ```

---

## 🐛 트러블슈팅

### Issue 1: "ethers module not found"

```bash
npm install ethers
```

### Issue 2: "Treasury contract not initialized"

`.env`에서 `TREASURY_POOL_ADDRESS` 확인

### Issue 3: "Insufficient Treasury balance"

- Treasury Pool에 USDC가 없음
- Flock 지갑 설정이 잘못됨

**해결**: Treasury Pool에 USDC 입금

```solidity
// 테스트용: USDC 직접 전송
usdc.transfer(treasuryAddress, amount);
```

### Issue 4: "Invalid signature"

- 타임스탬프 만료 (5분 이상)
- 메시지 포맷 일치하지 않음

**해결**: 클라이언트에서 새로운 서명 생성

---

## 📈 다음 단계

1. ✅ Solidity 컨트랙트 작성
2. ✅ 백엔드 검증 로직
3. ⏳ ethers.js 통합
4. ⏳ 테스트넷 배포
5. ⏳ 프로덕션 배포

---

## 📚 참고 자료

- [TreasuryPool.sol](../../contracts/TreasuryPool.sol)
- [x402-verification.ts](../../src/lib/x402-verification.ts)
- [EIP-2612 (Permit)](https://eips.ethereum.org/EIPS/eip-2612)
- [EIP-191 (Message Signing)](https://eips.ethereum.org/EIPS/eip-191)
- [OpenZeppelin ReentrancyGuard](https://docs.openzeppelin.com/contracts/4.x/api/security#ReentrancyGuard)
