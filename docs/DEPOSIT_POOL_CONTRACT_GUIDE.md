# 예치 풀 컨트랙트 연동 가이드

프론트엔드가 예치 풀 컨트랙트와 연동될 수 있도록 모든 설정이 완료되었습니다.

## 📋 컨트랙트에서 구현해야 할 함수 및 이벤트

### 1. Read Functions (view/pure)

#### `balanceOf(address user) → uint256`
```solidity
/**
 * @notice 사용자의 크레딧 잔액을 반환
 * @param user 사용자 주소
 * @return balance 크레딧 잔액
 */
function balanceOf(address user) external view returns (uint256 balance);
```

#### `getTransactionHistory(address user, uint256 offset, uint256 limit) → Transaction[]`
```solidity
struct Transaction {
    uint8 txType;       // 0: Deposit, 1: Withdraw, 2: Usage
    uint256 amount;     // ETH amount (for deposit/withdraw)
    uint256 credits;    // Credits amount
    uint256 timestamp;  // Transaction timestamp
    string reason;      // Usage reason (for Usage type only)
}

/**
 * @notice 사용자의 트랜잭션 히스토리를 반환
 * @param user 사용자 주소
 * @param offset 페이지네이션 오프셋
 * @param limit 반환할 트랜잭션 수
 * @return transactions 트랜잭션 배열
 */
function getTransactionHistory(
    address user, 
    uint256 offset, 
    uint256 limit
) external view returns (Transaction[] memory transactions);
```

#### `getExchangeRate() → uint256`
```solidity
/**
 * @notice 1 ETH당 받을 수 있는 크레딧 수 반환
 * @return rate 환율 (예: 1000 = 1 ETH = 1000 Credits)
 */
function getExchangeRate() external view returns (uint256 rate);
```

---

### 2. Write Functions

#### `deposit() payable`
```solidity
/**
 * @notice ETH를 예치하고 크레딧을 받음
 * @dev msg.value만큼의 ETH를 받아 환율에 따라 크레딧 발급
 */
function deposit() external payable;
```

**예시:**
- 사용자가 0.1 ETH를 보냄
- 환율이 1 ETH = 1000 Credits라면
- 사용자는 100 Credits를 받음

#### `withdraw(uint256 amount)`
```solidity
/**
 * @notice 크레딧을 소각하고 ETH를 인출
 * @param amount 인출할 ETH 양 (wei 단위)
 * @dev 필요한 크레딧을 소각하고 ETH 전송
 */
function withdraw(uint256 amount) external;
```

**예시:**
- 사용자가 0.1 ETH를 인출하려 함
- 환율이 1 ETH = 1000 Credits라면
- 사용자의 100 Credits가 소각되고 0.1 ETH를 받음

#### `useCredits(address user, uint256 credits, string reason)`
```solidity
/**
 * @notice API 사용 등으로 크레딧을 소비 (관리자만 호출 가능)
 * @param user 크레딧을 소비할 사용자 주소
 * @param credits 소비할 크레딧 양
 * @param reason 사용 이유 (예: "GPT-4 API call")
 * @dev onlyOwner 또는 authorized caller만 호출 가능
 */
function useCredits(
    address user, 
    uint256 credits, 
    string calldata reason
) external;
```

---

### 3. Events

#### `Deposit`
```solidity
/**
 * @notice ETH 예치 시 발생
 * @param user 예치한 사용자 주소
 * @param amount 예치한 ETH 양 (wei)
 * @param credits 발급된 크레딧 양
 * @param timestamp 트랜잭션 타임스탬프
 */
event Deposit(
    address indexed user,
    uint256 amount,
    uint256 credits,
    uint256 timestamp
);
```

#### `Withdraw`
```solidity
/**
 * @notice ETH 인출 시 발생
 * @param user 인출한 사용자 주소
 * @param amount 인출한 ETH 양 (wei)
 * @param credits 소각된 크레딧 양
 * @param timestamp 트랜잭션 타임스탬프
 */
event Withdraw(
    address indexed user,
    uint256 amount,
    uint256 credits,
    uint256 timestamp
);
```

#### `CreditUsed`
```solidity
/**
 * @notice 크레딧 사용 시 발생
 * @param user 크레딧을 사용한 사용자 주소
 * @param credits 사용한 크레딧 양
 * @param reason 사용 이유
 * @param timestamp 트랜잭션 타임스탬프
 */
event CreditUsed(
    address indexed user,
    uint256 credits,
    string reason,
    uint256 timestamp
);
```

---

## 🚀 배포 후 설정 방법

### 1. 컨트랙트 주소 업데이트

`frontend/lib/contracts/deposit-pool-config.ts` 파일을 열어 배포된 컨트랙트 주소를 입력하세요:

```typescript
export const DEPOSIT_POOL_ADDRESS = {
  // Base Mainnet
  8453: '0xYourContractAddressHere',
  // Base Sepolia (테스트넷)
  84532: '0xYourTestnetContractAddressHere',
} as const;
```

### 2. 프론트엔드에서 자동으로 연동됨

주소만 업데이트하면 다음 기능들이 자동으로 작동합니다:

✅ **프로필 페이지**
- 실시간 크레딧 잔액 표시
- 예치/인출 트랜잭션 히스토리
- Deposit/Withdraw 버튼 활성화

---

## 📁 관련 파일

### 컨트랙트 설정
- `frontend/lib/contracts/deposit-pool-config.ts` - 컨트랙트 주소 및 ABI

### 커스텀 훅
- `frontend/app/hooks/use-deposit-pool.ts` - 컨트랙트 상호작용 훅

### 사용 예시
- `frontend/app/components/ProfilePage.tsx` - 프로필 페이지에서 사용 중

---

## 💡 사용 예시

```typescript
import { useDepositPool } from '@/app/hooks/use-deposit-pool';

function MyComponent() {
  const {
    creditBalance,        // 현재 크레딧 잔액
    transactions,         // 트랜잭션 히스토리
    deposit,              // 예치 함수
    withdraw,             // 인출 함수
    isContractDeployed,   // 컨트랙트 배포 여부
  } = useDepositPool();

  // 0.1 ETH 예치
  const handleDeposit = async () => {
    await deposit('0.1');
  };

  // 0.05 ETH 인출
  const handleWithdraw = async () => {
    await withdraw('0.05');
  };

  return (
    <div>
      <p>Credits: {creditBalance}</p>
      <button onClick={handleDeposit}>Deposit</button>
      <button onClick={handleWithdraw}>Withdraw</button>
    </div>
  );
}
```

---

## 🎯 핵심 요약

### 프론트엔드에서 기대하는 동작

1. **예치 (Deposit)**
   - 사용자가 ETH를 보냄 → 크레딧 발급
   - `Deposit` 이벤트 발생
   - `balanceOf` 증가

2. **인출 (Withdraw)**
   - 사용자가 인출 요청 → 크레딧 소각 후 ETH 전송
   - `Withdraw` 이벤트 발생
   - `balanceOf` 감소

3. **크레딧 사용 (Usage)**
   - 백엔드에서 `useCredits` 호출 → 크레딧 소각
   - `CreditUsed` 이벤트 발생
   - `balanceOf` 감소

### 환율 예시
- **권장 환율**: 1 ETH = 1000 Credits
- 0.001 ETH = 1 Credit
- 사용자 친화적이고 계산하기 쉬움

---

## ✅ 체크리스트

컨트랙트 작성 시 확인사항:

- [ ] `balanceOf` 함수 구현
- [ ] `getTransactionHistory` 함수 구현
- [ ] `getExchangeRate` 함수 구현
- [ ] `deposit` 함수 구현 (payable)
- [ ] `withdraw` 함수 구현
- [ ] `useCredits` 함수 구현 (권한 제어 포함)
- [ ] `Deposit` 이벤트 emit
- [ ] `Withdraw` 이벤트 emit
- [ ] `CreditUsed` 이벤트 emit
- [ ] Reentrancy 공격 방어
- [ ] 잔액 부족 시 revert
- [ ] 테스트넷에 배포 및 테스트
- [ ] 메인넷에 배포
- [ ] `deposit-pool-config.ts`에 주소 업데이트

---

## 🔒 보안 고려사항

1. **Reentrancy 방지**: `nonReentrant` modifier 사용
2. **권한 관리**: `useCredits`는 authorized caller만 호출 가능
3. **잔액 검증**: withdraw 시 충분한 크레딧 확인
4. **오버플로우**: Solidity 0.8+ 사용 (자동 체크)
5. **가스 최적화**: 배열 순회 시 가스 한도 고려

---

문의사항이나 도움이 필요하면 알려주세요! 🚀

