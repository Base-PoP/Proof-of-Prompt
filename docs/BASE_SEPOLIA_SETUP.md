# Base Sepolia 테스트넷 설정 가이드

## 네트워크 정보

 Proof-of-Prompt 은 **Base Sepolia 테스트넷**을 사용합니다.

### 네트워크 상세

- **체인 이름**: Base Sepolia
- **Chain ID**: `84532`
- **RPC URL**: `https://sepolia.base.org`
- **Block Explorer**: `https://sepolia.basescan.org`
- **통화**: ETH (테스트넷)

## USDC 컨트랙트 주소

```
0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

## 테스트넷 설정

### 1. MetaMask에 Base Sepolia 추가

**자동 추가 (권장):**
1. [Chainlist](https://chainlist.org/?search=base+sepolia) 접속
2. "Base Sepolia" 검색
3. "Add to MetaMask" 클릭

**수동 추가:**
1. MetaMask 열기
2. 네트워크 선택 → "네트워크 추가"
3. 다음 정보 입력:
   - **네트워크 이름**: Base Sepolia
   - **RPC URL**: `https://sepolia.base.org`
   - **Chain ID**: `84532`
   - **통화 기호**: ETH
   - **Block Explorer**: `https://sepolia.basescan.org`

### 2. 테스트 ETH 받기

Base Sepolia에서 트랜잭션(USDC 승인)을 하려면 가스비로 사용할 테스트 ETH가 필요합니다.

**Faucet 사용:**
1. [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet) 접속
2. 지갑 주소 입력
3. 테스트 ETH 받기 (보통 0.1 ETH)

**또는:**
- [Alchemy Faucet](https://sepoliafaucet.com/)
- [Infura Faucet](https://www.infura.io/faucet/sepolia)

### 3. 테스트 USDC 받기

현재 Base Sepolia USDC 컨트랙트(`0x036CbD53842c5426634e7929541eC2318f3dCF7e`)에서 테스트 토큰을 받는 방법:

**옵션 1: Faucet (있는 경우)**
- Base Sepolia USDC faucet 확인 필요

**옵션 2: 직접 Mint (컨트랙트가 허용하는 경우)**
```typescript
// 컨트랙트에 mint 함수가 있는 경우
const usdcContract = new ethers.Contract(
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  ["function mint(address to, uint256 amount)"],
  signer
);

await usdcContract.mint(yourAddress, parseUnits("100", 6)); // 100 USDC
```

**옵션 3: 관리자에게 요청**
- 프로젝트 관리자가 테스트 USDC를 배포한 경우 요청

## 환경 변수 설정

### 프론트엔드 `.env.local`

```env
# API URL
NEXT_PUBLIC_API_URL=http://localhost:4000

# Privy App ID
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id

# Base Sepolia USDC
NEXT_PUBLIC_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# Chain ID
NEXT_PUBLIC_CHAIN_ID=84532
```

### 백엔드 `.env`

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/lmarena

# Flock API
FLOCK_API_KEY=your-flock-api-key

# Base Sepolia
CHAIN_ID=84532
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

## 코드 설정 확인

### 1. 백엔드 - Payment Required 응답

[`arena.service.ts`](file:///d:/Develop/Lmarena/backend/src/modules/arena/arena.service.ts#L85-L94):

```typescript
return res.status(402).json({
  payment: {
    chainId: 84532, // Base Sepolia ✅
    token: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    spender: "0x5e4D581D318ef0ff9e525529b40c3400457Fdbf6",
    amount: "100000", // 0.1 USDC
    message: "AI 모델 사용을 위해 0.1 USDC 승인이 필요합니다."
  }
});
```

### 2. 프론트엔드 - Privy Provider

[`providers.tsx`](file:///d:/Develop/Lmarena/frontend/app/providers/providers.tsx#L58-L59):

```typescript
supportedChains: [base, baseSepolia],
defaultChain: baseSepolia, // Base Sepolia ✅
```

### 3. Wagmi 설정

```typescript
const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(), // ✅
  },
});
```

## 테스트 시나리오

### 1. 지갑 연결 확인

1. 앱 접속: `http://localhost:3000`
2. "Connect Wallet" 클릭
3. **Base Sepolia 네트워크로 자동 전환되는지 확인**
4. 지갑 주소 표시 확인

### 2. USDC 승인 플로우

1. 프롬프트 입력 후 Submit
2. 402 응답 → 승인 UI 표시
3. "USDC 승인하기" 클릭
4. **MetaMask에서 네트워크가 Base Sepolia인지 확인**
5. 트랜잭션 승인
6. [Base Sepolia Explorer](https://sepolia.basescan.org)에서 트랜잭션 확인

### 3. 트랜잭션 확인

승인 트랜잭션 후:
```
https://sepolia.basescan.org/tx/[transaction-hash]
```

USDC 컨트랙트 확인:
```
https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

## 트러블슈팅

### 문제 1: 네트워크 불일치

**증상**: "Wrong network" 에러

**해결**:
1. MetaMask에서 Base Sepolia로 수동 전환
2. 페이지 새로고침
3. 지갑 재연결

### 문제 2: 가스비 부족

**증상**: "Insufficient funds for gas"

**해결**:
1. [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)에서 테스트 ETH 받기
2. 최소 0.01 ETH 필요

### 문제 3: USDC 잔액 없음

**증상**: 승인은 되지만 실제 사용 시 에러

**해결**:
1. USDC 컨트랙트에서 테스트 토큰 받기
2. 또는 관리자에게 요청

### 문제 4: RPC 연결 실패

**증상**: "Network request failed"

**해결**:
1. RPC URL 확인: `https://sepolia.base.org`
2. 대체 RPC 사용:
   - `https://base-sepolia.blockpi.network/v1/rpc/public`
   - `https://base-sepolia-rpc.publicnode.com`

## 메인넷 전환 시 체크리스트

테스트가 완료되고 메인넷으로 전환할 때:

- [ ] Chain ID를 `8453`으로 변경
- [ ] USDC 주소를 Base Mainnet USDC로 변경
- [ ] RPC URL을 `https://mainnet.base.org`로 변경
- [ ] Privy `defaultChain`을 `base`로 변경
- [ ] 환경 변수 업데이트
- [ ] 모든 하드코딩된 체인 ID 확인
- [ ] 테스트 완료 후 배포

## 참고 자료

- [Base Sepolia 공식 문서](https://docs.base.org/network-information)
- [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
- [Base Sepolia Explorer](https://sepolia.basescan.org)
- [Privy Base 설정](https://docs.privy.io/guide/react/wallets/chains/base)
