# 📝 예치 풀 컨트랙트 함수 명세서 (요약)

컨트랙트 작성 시 **정확히 이 함수명과 시그니처**를 사용하세요!

---

## 🔍 Read Functions (view)

### 1. balanceOf
```solidity
function balanceOf(address user) external view returns (uint256);
```
- **용도**: 사용자의 크레딧 잔액 조회
- **반환**: 크레딧 수량

### 2. getTransactionHistory
```solidity
struct Transaction {
    uint8 txType;       // 0: Deposit, 1: Withdraw, 2: Usage
    uint256 amount;     // ETH amount (wei)
    uint256 credits;    // Credits amount
    uint256 timestamp;  // Unix timestamp
    string reason;      // Usage reason
}

function getTransactionHistory(
    address user, 
    uint256 offset, 
    uint256 limit
) external view returns (Transaction[] memory);
```
- **용도**: 트랜잭션 히스토리 페이지네이션 조회
- **반환**: Transaction 배열

### 3. getExchangeRate
```solidity
function getExchangeRate() external view returns (uint256);
```
- **용도**: 1 ETH당 크레딧 수 조회
- **반환**: 환율 (권장: 1000 = 1 ETH = 1000 Credits)

---

## ✏️ Write Functions

### 1. deposit
```solidity
function deposit() external payable;
```
- **용도**: ETH 예치 → 크레딧 발급
- **동작**: msg.value를 받아 환율에 따라 크레딧 발급
- **이벤트**: `Deposit(user, amount, credits, timestamp)` emit

### 2. withdraw
```solidity
function withdraw(uint256 amount) external;
```
- **용도**: 크레딧 소각 → ETH 인출
- **파라미터**: amount = 인출할 ETH (wei 단위)
- **동작**: 필요한 크레딧 소각 후 ETH 전송
- **이벤트**: `Withdraw(user, amount, credits, timestamp)` emit

### 3. useCredits
```solidity
function useCredits(
    address user, 
    uint256 credits, 
    string calldata reason
) external;
```
- **용도**: API 사용 시 크레딧 소비 (백엔드에서 호출)
- **권한**: onlyOwner 또는 authorized caller만 가능
- **이벤트**: `CreditUsed(user, credits, reason, timestamp)` emit

---

## 📢 Events

### 1. Deposit
```solidity
event Deposit(
    address indexed user,
    uint256 amount,
    uint256 credits,
    uint256 timestamp
);
```

### 2. Withdraw
```solidity
event Withdraw(
    address indexed user,
    uint256 amount,
    uint256 credits,
    uint256 timestamp
);
```

### 3. CreditUsed
```solidity
event CreditUsed(
    address indexed user,
    uint256 credits,
    string reason,
    uint256 timestamp
);
```

---

## 🔧 배포 후 할 일

### Step 1: 컨트랙트 주소 업데이트
```typescript
// frontend/lib/contracts/deposit-pool-config.ts

export const DEPOSIT_POOL_ADDRESS = {
  8453: '0xYourMainnetAddress',   // Base Mainnet
  84532: '0xYourTestnetAddress',  // Base Sepolia
} as const;
```

### Step 2: 테스트
```bash
# 프론트엔드 재시작
cd frontend
pnpm dev
```

### Step 3: 확인
- Profile 페이지 방문
- 크레딧 잔액 표시 확인
- Deposit/Withdraw 버튼 활성화 확인

---

## 💡 환율 권장사항

```solidity
// 권장 환율: 1 ETH = 1000 Credits
uint256 public constant EXCHANGE_RATE = 1000;

function getExchangeRate() external pure returns (uint256) {
    return EXCHANGE_RATE;
}
```

**왜 1000인가?**
- 0.001 ETH = 1 Credit (이해하기 쉬움)
- GPT-4 API 호출 1회 ≈ 1-5 Credits 설정 가능
- 소수점 계산 최소화

---

## ✅ 빠른 체크리스트

컨트랙트 작성 시:
- [ ] 위의 함수명 **정확히** 사용
- [ ] Transaction struct 정의
- [ ] 3개 이벤트 모두 emit
- [ ] useCredits 권한 제어
- [ ] Reentrancy 방지
- [ ] 잔액 검증

배포 후:
- [ ] deposit-pool-config.ts 주소 업데이트
- [ ] 테스트넷에서 테스트
- [ ] 프론트엔드 정상 작동 확인

---

질문이 있으면 언제든지 물어보세요! 🚀

