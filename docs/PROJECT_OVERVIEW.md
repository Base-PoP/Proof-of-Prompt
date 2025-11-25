# LMarena 온체인 결제/보상 개요

## 현재 아키텍처 요약
- **컨트랙트**: `foundry/src/PaymentTreasury.sol` (Base Sepolia 배포: `0x5e4D581D318ef0ff9e525529b40c3400457Fdbf6`)
  - 결제: `payWithPermit`/`payWithAllowance`로 `pricePerChat`만큼 USDC 수취
  - 보상: `claimWeekly`/`claimAchievement` 서명 검증 후 USDC 지급, `nonceUsed`로 중복 방지
  - 운영: 가격/트레저리/서명자 변경, pause, withdraw
- **결제 플로우 (x402 + 무한 승인)**:
  1) 프론트: 한 번 무제한 `approve(PaymentTreasury, max)` → 이후 프롬프트마다 x402 서명(`x-payment-authorization` 헤더, base64)만 전송
  2) 백엔드: x402 서명 검증 → `payWithAllowance` 호출로 `pricePerChat` 자동 차감 → 기록
  3) 실패 시 402 재요청 + 승인/서명 재시도
- **보상 플로우**:
  - 업적: 백엔드가 `REWARD_SIGNER_PRIVATE_KEY`로 서명 → `claimAchievement` 트랜잭션을 `FACILITATOR_PRIVATE_KEY`로 브로드캐스트 → DB `claimed` 업데이트
  - 주간: 좋아요 Top 3 유저를 주기적으로 산출 → 1등 5 USDC, 2등 3 USDC, 3등 1 USDC 지급(기본값, env로 조정) → `claimWeekly` 실행

## 주요 설정(.env)
- 공통: `PAY_TO_ADDRESS=0x5e4D581D318ef0ff9e525529b40c3400457Fdbf6`, `USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e`, `CHAIN_ID=84532`, `RPC_URL=https://sepolia.base.org`
- 결제/보상 키:
  - `FACILITATOR_PRIVATE_KEY`: 결제/보상 트랜잭션 브로드캐스트 키(가스 보유 필수)
  - `REWARD_SIGNER_PRIVATE_KEY`: PaymentTreasury `rewardSigner`에 해당하는 키(서명 전용)
- 주간 보상:
  - `WEEKLY_REWARD_INTERVAL_SEC` (기본 604800 = 7일, 테스트 시 60 등으로 단축)
  - `WEEKLY_REWARD_AMOUNTS` (콤마 구분 6-decimal 정수, 기본 `5000000,3000000,1000000`)
- 프론트:
  - `NEXT_PUBLIC_PAY_TO_ADDRESS`, `NEXT_PUBLIC_USDC_ADDRESS`, `NEXT_PUBLIC_CHAIN_ID`
  - `NEXT_PUBLIC_WEEKLY_REWARD_INTERVAL_SEC` (카운트다운 표시용, 테스트 기본 60초)

## 사용자 플로우
1) **결제**
   - 프론트: 최초 402 → 무제한 approve + x402 서명 → 이후 요청은 서명 재사용
   - 백엔드: x402 서명 검증 → `payWithAllowance`로 `pricePerChat` 자동 전송
2) **주간 보상**
   - 백엔드 배경 작업이 주기적으로 좋아요 Top3 산출 → `signWeeklyReward` → `claimWeekly` 브로드캐스트
   - 리더보드 상단에 “주간 보상 분배까지 남은 시간” 카운트다운 표시
3) **업적 보상**
   - 업적 달성 후 클레임 시 백엔드가 서명+`claimAchievement` 실행 → 수신자 USDC 지급 → DB `claimed` 업데이트

## 확인 포인트
- PaymentTreasury 잔액: 보상/환불용 USDC 예치 필요
- 키 일치: `REWARD_SIGNER_PRIVATE_KEY` ↔ 컨트랙트 `rewardSigner` 주소 확인
- 로그/모니터링: 결제/보상 txHash가 콘솔에 출력되므로 운영 시 별도 스토리지/모니터링 연동 권장
- 카운트다운/주기: 테스트용 1분(프론트), 실제 운영 시 7일로 env 정리 필요
