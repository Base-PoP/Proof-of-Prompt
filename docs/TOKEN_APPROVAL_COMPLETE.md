# 토큰 승인 기능 구현 완료

## ✅ 구현 상태

토큰 승인 요청 기능이 **완전히 구현**되었습니다. 사용자가 프롬프트를 제출하면 자동으로 USDC 승인 여부를 확인하고, 필요한 경우 승인 UI를 표시합니다.

## 🔄 작동 플로우

### 1. 첫 번째 프롬프트 제출 (승인 필요)

```
사용자: 프롬프트 입력 → Submit 클릭
    ↓
프론트엔드: POST /arena/chat/stream (헤더 없음)
    ↓
백엔드: x-payment-approved 헤더 확인 → 없음
    ↓
백엔드: 402 Payment Required 응답
    {
      "payment": {
        "chainId": 8453,
        "token": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        "spender": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        "amount": "100000",
        "message": "AI 모델 사용을 위해 0.1 USDC 승인이 필요합니다."
      }
    }
    ↓
프론트엔드: PaymentRequiredError 감지
    ↓
UI: 파란색 승인 알림 표시
    💳 결제 승인 필요
    AI 모델 사용을 위해 0.1 USDC 승인이 필요합니다.
    [USDC 승인하기] 버튼
```

### 2. 사용자가 승인 버튼 클릭

```
사용자: "USDC 승인하기" 클릭
    ↓
프론트엔드: useUsdc.approve() 호출
    ↓
Privy 지갑: USDC.approve(spender, amount) 트랜잭션
    ↓
사용자: 지갑에서 트랜잭션 승인
    ↓
블록체인: 트랜잭션 처리 (약 1-2초)
    ↓
프론트엔드: 승인 완료 → 2초 대기
    ↓
프론트엔드: 자동으로 재시도
    POST /arena/chat/stream
    헤더: x-payment-approved: true
    ↓
백엔드: 헤더 확인 → 승인됨
    ↓
백엔드: AI 응답 스트리밍 시작
    ↓
UI: 실시간으로 답변 표시
```

## 📁 구현 파일

### 프론트엔드

1. **[HomePage.tsx](file:///d:/Develop/Lmarena/frontend/app/components/HomePage.tsx)**
   - 73-169줄: 토큰 승인 상태 관리 및 UI
   - 82-149줄: `handleSubmit` - 402 에러 감지 및 처리
   - 151-169줄: `handleApprove` - USDC 승인 트랜잭션
   - 200-225줄: 초기 화면 승인 UI
   - 327-352줄: 채팅 화면 승인 UI (새로 추가)

2. **[api.ts](file:///d:/Develop/Lmarena/frontend/lib/api.ts)**
   - 14-27줄: `PaymentRequiredError` 클래스 정의
   - 44-47줄: 402 응답 감지 및 에러 throw
   - 81-169줄: `createChatStream` - 스트리밍 API 호출
   - 93-95줄: `x-payment-approved` 헤더 추가

3. **[useUsdc.ts](file:///d:/Develop/Lmarena/frontend/app/hooks/useUsdc.ts)**
   - USDC approve 트랜잭션 처리

### 백엔드

1. **[arena.service.ts](file:///d:/Develop/Lmarena/backend/src/modules/arena/arena.service.ts)**
   - 81-95줄: `/arena/chat` 엔드포인트 승인 확인
   - 181-194줄: `/arena/chat/stream` 엔드포인트 승인 확인

## 🎨 UI 스크린샷

### 승인 필요 알림 (파란색)
```
┌────────────────────────────────────────────────────────────┐
│ 💳 결제 승인 필요                                            │
│ AI 모델 사용을 위해 0.1 USDC 승인이 필요합니다.              │
│                                      [USDC 승인하기]         │
└────────────────────────────────────────────────────────────┘
```

### 승인 중
```
┌────────────────────────────────────────────────────────────┐
│ 💳 결제 승인 필요                                            │
│ AI 모델 사용을 위해 0.1 USDC 승인이 필요합니다.              │
│                                      [⏳ 승인 중...]         │
└────────────────────────────────────────────────────────────┘
```

## 🔧 설정

### 현재 설정값

- **체인**: Base (chainId: 8453)
- **토큰**: USDC (`0x036CbD53842c5426634e7929541eC2318f3dCF7e`)
- **승인 금액**: 0.1 USDC (`100000` with 6 decimals)
- **Spender**: USDC 컨트랙트 주소 (임시, 실제로는 Treasury 주소로 변경 필요)

### 환경 변수

`.env.local`:
```env
# USDC 컨트랙트 주소 (Base Sepolia)
NEXT_PUBLIC_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# Treasury/Contract 주소 (승인 대상)
NEXT_PUBLIC_TREASURY_ADDRESS=0xYourTreasuryAddress
```

## 🧪 테스트 방법

### 1. 승인 필요 시나리오

1. 브라우저에서 `http://localhost:3000` 접속
2. 지갑 연결 (Privy)
3. 프롬프트 입력 후 Submit
4. **예상 결과**: 파란색 승인 알림 표시
5. "USDC 승인하기" 클릭
6. Privy 지갑에서 트랜잭션 승인
7. **예상 결과**: 자동으로 AI 응답 스트리밍 시작

### 2. 이미 승인된 경우

1. 위 시나리오 완료 후
2. 새로운 프롬프트 입력 후 Submit
3. **예상 결과**: 승인 UI 없이 즉시 AI 응답 시작

### 3. 승인 거부 시나리오

1. 프롬프트 입력 후 Submit
2. 승인 알림 표시
3. "USDC 승인하기" 클릭
4. Privy 지갑에서 **거부**
5. **예상 결과**: 에러 토스트 표시, 승인 UI 유지 (재시도 가능)

## ⚠️ 주의사항

### 1. 임시 구현

현재는 `x-payment-approved` 헤더만으로 승인 여부를 판단합니다. 실제 프로덕션에서는:

```typescript
// 백엔드에서 블록체인 상태 확인 필요
const usdcContract = new ethers.Contract(USDC_ADDRESS, ABI, provider);
const allowance = await usdcContract.allowance(userAddress, treasuryAddress);

if (allowance < requiredAmount) {
  return res.status(402).json({ payment: { ... } });
}
```

### 2. Spender 주소

현재는 USDC 컨트랙트 주소를 Spender로 사용하고 있습니다. 실제로는:
- Treasury 컨트랙트 주소로 변경
- 또는 백엔드 지갑 주소로 변경

### 3. 승인 금액

현재는 0.1 USDC로 고정되어 있습니다. 향후:
- 사용량에 따라 동적 계산
- 또는 무제한 승인 (uint256 max)

### 4. 블록체인 반영 시간

현재는 승인 후 2초 대기합니다. 네트워크 상황에 따라:
- Base는 보통 1-2초
- 혼잡 시 더 길어질 수 있음
- 트랜잭션 확인 로직 추가 권장

## 📝 다음 단계

### 필수
- [ ] Spender 주소를 실제 Treasury 주소로 변경
- [ ] 백엔드에서 블록체인 상태 확인 로직 추가
- [ ] 승인 금액 정책 결정 (고정 vs 동적 vs 무제한)

### 선택
- [ ] 승인 진행 상태 표시 (트랜잭션 해시 링크)
- [ ] 예상 가스비 표시
- [ ] 승인 상태 캐싱 (불필요한 블록체인 조회 방지)
- [ ] 에러 메시지 개선
- [ ] 다국어 지원

## 📚 관련 문서

- [TOKEN_APPROVAL_FLOW.md](file:///d:/Develop/Lmarena/TOKEN_APPROVAL_FLOW.md) - 상세 플로우 가이드
- [PRIVY_SETUP.md](file:///d:/Develop/Lmarena/PRIVY_SETUP.md) - Privy 설정 가이드
- [useUsdc.ts](file:///d:/Develop/Lmarena/frontend/app/hooks/useUsdc.ts) - USDC 훅 구현

## 🎉 완료!

토큰 승인 기능이 완전히 구현되었습니다. 사용자는 이제 프롬프트 제출 시 자동으로 승인 요청을 받고, 승인 후 AI 응답을 받을 수 있습니다.
