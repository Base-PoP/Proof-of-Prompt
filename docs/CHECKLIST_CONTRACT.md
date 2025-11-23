# 스마트 컨트랙트 연동 가이드 (Base Sepolia → Mainnet 확장 대비)

## 대상 토큰 / 네트워크
- 체인: Base Sepolia (chainId=84532) → 이후 Mainnet 전환 예정
- 토큰: USDC `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (6 decimals)
- 결제 금액: 0.1 USDC per chat (고정)

## 핵심 컨트랙트(제안)
1) **PaymentTreasury (수취/보관)**
   - 목적: x402 `pay_to_address`로 지정, 받은 USDC를 보관.
   - 필수 함수:
     - `receivePayment(address payer, uint256 amount, bytes32 nonce)` (optional, offchain으로 직접 전송하면 필요 없음)
     - `sweep(address to, uint256 amount)` (관리자만)
     - `setAdmin(address)` / `transferOwnership(address)` (관리 권한)
   - 이벤트:
     - `PaymentReceived(address indexed payer, uint256 amount, bytes32 nonce)`
     - `Swept(address indexed to, uint256 amount)`

2) **(선택) PaymentRouter**
   - 목적: 추후 분배/수수료가 필요할 때 Treasury 대신 Router를 `pay_to_address`로 설정.
   - 필수 함수:
     - `receiveWithAuthorization(...)` 또는 `onPaymentReceived(address payer, uint256 amount, bytes32 nonce)`
     - `setTreasury(address)` / 분배 로직(예: ops, reward, treasury 비율)
   - 이벤트: `Routed(address indexed payer, uint256 amount, bytes32 nonce)`

## 결제 방식 (EIP-3009 / transferWithAuthorization)
- 프론트: 서버가 내려주는 `amount`, `token`, `pay_to_address`, `nonce`, `valid_after`, `valid_before`, `chainId`로 EIP-3009 서명 생성.
- 서버: 서명 검증 후 `transferWithAuthorization(user → pay_to_address, amount, nonce, ...)` 호출.
- 요구사항:
  - `nonce` 중복 사용 방지(서버 DB에 저장, 컨트랙트 측 중복 거부).
  - `valid_before` 설정(예: now+10분)으로 오래된 서명 차단.

## 필요한 ABI 함수 (USDC EIP-3009)
- `function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external;`
- `function authorizationState(address authorizer, bytes32 nonce) external view returns (bool);` (서명 재사용 여부 확인)

## 서버/프론트 연동 포인트
- 서버 402 payload:
  - `chainId`, `token`, `pay_to_address`, `amount`, `valid_before`, `nonce` (서버가 생성)
- 프론트:
  - 위 payload로 EIP-712/3009 typedData 서명 → `x-payment-authorization` 헤더에 `{nonce, valid_before, signature, from, to, amount}` 전달.
- 서버:
  - `authorizationState`로 nonce 확인 → `transferWithAuthorization` 브로드캐스트 → 성공 시 200 응답, 실패 시 402/400.

## 보안/검증 체크
- nonce 재사용 방지: onchain `authorizationState` + offchain DB 기록.
- `pay_to_address` 화이트리스트: env/설정으로 관리자가만 변경 가능.
- 긴급 중단: Router/Treasury에 `pause` 또는 `sweep` 권한 제공.

## 전달 필요 정보
- 최종 PAY_TO_ADDRESS (Treasury/Router)
- 실제 USDC EIP-3009 ABI (지원 버전 확인)
- 분배/수수료 정책이 있는 경우 Router 설계(비율, 대상)
