# 컨트랙트 배포 및 x402 결제 로직 구현 계획

## 목표
- AI 배틀 결제(HTTP 402) 플로우를 온체인 결제/서명 검증과 연동하고, 관련 컨트랙트를 배포해 프로덕션/테스트 환경에서 동일하게 동작하게 한다.

## 준비 사항
- 체인/네트워크 확정: Base 메인넷/세폴리아 중 결정 후 `CHAIN_ID`, `PAY_TO_ADDRESS`, 토큰 주소(USDC 등) 확보.
- 배포 키/계정: 배포자 지갑, RPC, 탐색기 API 키 준비. `.env`에 `PRIVATE_KEY`, `USDC_ADDRESS`, `PAY_TO_ADDRESS`, `CHAIN_ID` 반영.
- Prisma 마이그레이션 여부 점검(결제 기록/nonce 테이블 유지 확인).

## 구현 단계
1) 컨트랙트 설계/작성
   - 지급 승인/소각/트레저리 송금 방식 결정(EIP-3009, Permit2, 서명 기반 인출 중 선택).
   - 결제 컨트랙트 코드 작성 후 하드햇/Foundry 테스트 준비.
2) 컨트랙트 테스트
   - 허용 토큰/금액/수신자 검증, 재진입/이중 사용 방어, 이벤트 로깅 테스트.
   - 가스 추정 및 실패 케이스(잔액 부족, 서명 만료) 검증.
3) 배포
   - 테스트넷 배포 → 주소/ABI를 `backend`/`frontend` config에 반영.
   - 메인넷 배포 시 동일 절차 및 검증 트랜잭션 기록.
4) 백엔드 연동 (x402 결제)
   - `backend/src/lib/payment.ts`에 온체인 검증/소비 로직 추가(서명 유효성, nonce 소모).
   - `arena.service.ts` 결제 체크에서 컨트랙트 검증 호출 + 실패 시 402 페이로드 반환.
   - 결제 성공 시 기록(사용된 nonce/txhash) 저장.
5) 프론트 연동
   - 결제 서명/인출 트랜잭션 UX 업데이트: 서명/tx 진행 단계 토스트, 재시도/취소 흐름.
   - 기존 `x-payment-authorization` 헤더에 온체인 서명/tx 데이터를 포함하도록 변경.
6) 문서/환경
   - `docs/PROJECT_INFO.md` 업데이트: 네트워크, 컨트랙트 주소, env 변수, 결제 플로우 설명.
   - `.env.example`/`frontend/env.template`에 새 변수 추가.

## 테스트 및 검증
- 단위: 컨트랙트(Foundry/Hardhat) 유닛 테스트.
- 통합: 로컬/테스트넷에서 백엔드 402 → 서명/tx → 성공 응답 시나리오 확인.
- 수동: 프론트에서 결제 후 대화 생성/재사용, 실패·취소 시 UX 확인.

## 배포 체크리스트
- 컨트랙트 주소/ABI 환경변수 반영 및 커밋.
- 마이그레이션/seed 정상 수행.
- 테스트넷 검증 스크린샷/트랜잭션 링크 정리.

### 제안 구조                                                                                                                                                                                                                                                                 
                                                                                                                                                                                                                                                                                
  - 컨트랙트: Treasury                                                                                                                                                                                                                                                          
      - 상태
          - acceptedToken(USDC), treasury 주소, pricePerChat, paused                                                                                                                                                                                                            
          - nonceUsed[bytes32](결제/보상 공통 재사용 방지)                                                                                                                                                                                                                      
          - rewardSigner(백엔드/멀시그 서명자)                                                                                                                                                                                                                                  
      - 결제                                                                                                                                                                                                                                                                    
          - payWithPermit(payer, amount, deadline, sig) (EIP-2612/USDC permit 지원)
          - 이벤트: WeeklyClaimed(week, rank, recipient, amount)
      - 업적 보상 지급
          - 흐름: 프로필에서 클레임 요청 시 백엔드가 해당 업적 달성 여부 검증 → (achievementId, recipient, amount, nonce) 서명 → 트랜잭션 실행
          - 함수: claimAchievement(achievementId, recipient, amount, nonce, sig)
          - 검증: nonceUsed, sig 유효, amount > 0
          - 이벤트: AchievementClaimed(achievementId, recipient, amount)
      - 운영 함수: setPrice, setTreasury, setRewardSigner, pause/unpause
      - 접근 제어: owner(또는 admin/rewardSigner 이원화), pause로 긴급 정지

  ### 흐름 정리

  - x402 결제: 프론트 402 응답 시 서명(permit) → x-payment-authorization에 실어 백엔드 → 백엔드가 payWithPermit/payWithAllowance 호출 → Paid 이벤트 기록.
  - 주간 보상: 백엔드가 순위/금액 산출 후 서명 → 프론트/백엔드가 claimWeekly 호출 → nonceUsed로 중복 방지.
  - 업적 보상: 업적 달성 확인 후 백엔드 서명 → 프로필 클레임 시 claimAchievement 호출 → 중복 클레임 방지( nonceUsed ).

  이렇게 하면 결제와 보상을 한 컨트랙트에서 관리하면서, 온체인에서 복잡한 계산 없이 오프체인 서명 검증으로 안전하게 지급할 수 있습니다.

cast call 0x036CbD53842c5426634e7929541eC2318f3dCF7e "balanceOf(address)(uint256)" 0x038f9eff208f4cefc0a7f856739a3405c419a147 --rpc-url $RPC_URL

cast call 0x036CbD53842c5426634e7929541eC2318f3dCF7e "allowance(address,address)(uint256)" 0x038f9eff208f4cefc0a7f856739a3405c419a147 0x5e4D581D318ef0ff9e525529b40c3400457Fdbf6 --rpc-url $RPC_URL  