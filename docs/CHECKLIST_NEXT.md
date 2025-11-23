# 구현 및 검증 체크리스트 (현재 코드베이스 기준)

## 결제/x402
- [ ] EIP-3009 서명 검증/nonce 재사용 방지/유효기간 검증 추가
- [ ] `transferWithAuthorization` 브로드캐스트 로직 구현 (env: CHAIN_ID, RPC_URL, USDC_ADDRESS, PAY_TO_ADDRESS, FACILITATOR_PRIVATE_KEY)
- [ ] 402 payload에 nonce/valid_before 등 서명 파라미터 포함, 프론트 서명 포맷을 이에 맞게 교체
- [ ] 실환경(목 모드 false)에서 프롬프트 → 402 → 서명 → 응답 플로우 수동 검증

## 업적/레벨
- [ ] 업적 조건 확장(Top1~3, 긴 답변, LLM 실패 플래그 등) 및 `evaluateAchievementsForUser`에 반영
- [ ] 이벤트 시 즉시 평가(sharePrompt/like/delete/update 등)로 조회 시 계산 지연 최소화
- [ ] 프로필 레벨/XP 바를 currentXP/nextLevelXP 기준으로 노출, 레벨업 피드백 추가
- [ ] Claim 버튼에 온체인/보상 연동 시 TODO 채우기

## QA/운영
- [ ] `NEXT_PUBLIC_USE_MOCK_DATA=false`에서 전체 시나리오 수동 테스트(프롬프트→402→서명→공유→좋아요/삭제→리더보드→프로필/업적)
- [ ] Prisma 스키마 변경 후 `npx prisma db push`/seed 재확인
- [ ] 리더보드/모달→상세 이동 및 필터/정렬 상태 동작 재검증

# 스마트 컨트랙트 개발자 체크리스트
- [ ] USDC(Base Sepolia/Mainnet) EIP-3009 지원 여부 확인 및 ABI 제공 (`transferWithAuthorization`)
- [ ] `PAY_TO_ADDRESS` 결정(Treasury/Router) 및 입금 후 처리 로직 정의
- [ ] EIP-3009 서명 도메인 파라미터(chainId, verifying contract 등) 확정
- [ ] 프론트 서명용 구조(spec) 합의: nonce, valid_before, amount(0.1 USDC), pay_to_address
- [ ] 서버 검증/브로드캐스트 예제(ethers/viem) 제공 및 실패/재시도 정책 협의
- [ ] (선택) PaymentRouter 추가 로직 필요 시 인터페이스 설계: 수수료 분배/수동 sweep 등
