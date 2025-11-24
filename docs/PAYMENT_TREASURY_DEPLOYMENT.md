# PaymentTreasury 배포 정보 (Base Sepolia)

- 네트워크: Base Sepolia (`chainId = 84532`)
- 컨트랙트: `PaymentTreasury`
- 배포 주소: `0x5e4D581D318ef0ff9e525529b40c3400457Fdbf6`
- 토큰: USDC (`USDC_ADDRESS` 환경변수 사용)
- 배포자/owner: 배포 트랜잭션의 from 주소
- 트레저리: 배포 시 입력한 `TREASURY_ADDRESS`
- 보상 서명자: 배포 시 입력한 `REWARD_SIGNER`
- 단가: 배포 시 입력한 `PRICE_PER_CHAT` (USDC 6 decimals 정수)

## 환경변수 반영 체크리스트
- 백엔드 `.env`:
  - `CHAIN_ID=84532`
  - `USDC_ADDRESS=<Base Sepolia USDC 주소>`
  - `PAY_TO_ADDRESS=0x5e4D581D318ef0ff9e525529b40c3400457Fdbf6` (x402 결제 수신 컨트랙트)
  - `REWARD_SIGNER=<보상 서명자 주소>` (컨트랙트 초기값과 동일하게 유지)
- 프론트 `.env.local`:
  - `NEXT_PUBLIC_CHAIN_ID=84532`
  - `NEXT_PUBLIC_USDC_ADDRESS=<Base Sepolia USDC 주소>`
  - `NEXT_PUBLIC_PAY_TO_ADDRESS=0x5e4D581D318ef0ff9e525529b40c3400457Fdbf6`

## 운영/연동 주의사항
- 결제: x402 응답의 `pay_to_address`를 위 컨트랙트 주소로 설정.
- 보상: 백엔드가 오프체인에서 보상 데이터에 `REWARD_SIGNER` 키로 서명 → 사용자는 `claimWeekly`/`claimAchievement` 호출.
- 인출: `owner`만 `withdraw` 호출 가능. `TREASURY_ADDRESS`는 멀티시그 사용을 권장.
- 가격 변경: `setPrice`로 단가 수정 가능. 프론트/백엔드 표시 단가도 함께 갱신.

## 참고
- 배포 스크립트: `foundry/script/Deploy.s.sol`
- 빌드/배포 명령 예시: `docs/FOUNDRY_SETUP.md` 참조 (직접 실행 필요)

## 클라이언트 승인 정책 메모
- 승인 1회 후 자동 결제: 프론트가 한 번 `approve(PaymentTreasury, type(uint256).max)`로 서명하면 이후 프롬프트 제출마다 `payWithAllowance`가 `pricePerChat` 금액만 `transferFrom` 하여 자동 결제된다.
- 초과 인출 방지: 컨트랙트는 `amount == pricePerChat`만 허용하므로 무한 승인이어도 단가만 전송된다.
- 해제/조정: 사용자는 언제든 allowance를 revoke(0으로 재승인)할 수 있다. 정액 승인 UX가 필요하면 `approve(payToAddress, pricePerChat)` 또는 permit(정액)으로 변경.
