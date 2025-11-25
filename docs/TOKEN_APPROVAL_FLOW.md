# 토큰 승인 플로우 가이드

## 개요

 Proof-of-Prompt 에서는 AI 모델 사용 시 USDC 토큰 승인이 필요합니다. 사용자가 처음 프롬프트를 제출하면 백엔드에서 토큰 승인 여부를 확인하고, 승인이 필요한 경우 402 Payment Required 응답을 반환합니다.

## 플로우 다이어그램

```
사용자 프롬프트 입력
    ↓
Submit 버튼 클릭
    ↓
백엔드 API 호출 (/arena/chat/stream)
    ↓
┌─────────────────────────────────┐
│ 토큰 승인 확인                    │
│ (x-payment-approved 헤더 체크)   │
└─────────────────────────────────┘
    ↓
승인 필요? ─── YES ──→ 402 Payment Required 반환
    │                      ↓
    │              PaymentRequiredError 발생
    │                      ↓
    │              승인 UI 표시 (파란색 알림)
    │                      ↓
    │              사용자가 "USDC 승인하기" 클릭
    │                      ↓
    │              Privy 지갑으로 승인 트랜잭션 전송
    │                      ↓
    │              승인 완료 후 자동 재시도
    │                      ↓
    NO                 x-payment-approved: true 헤더 추가
    │                      ↓
    └──────────────────→ AI 응답 스트리밍 시작
                          ↓
                    실시간으로 답변 표시
```

## 구현 상세

### 1. 프론트엔드 - 토큰 승인 요청 감지

[`HomePage.tsx`](file:///d:/Develop/Lmarena/frontend/app/components/HomePage.tsx#L82-L149)에서 처리:

```typescript
const handleSubmit = async (isPaymentRetry: boolean = false) => {
  try {
    await arenaApi.createChatStream(
      currentPrompt,
      onChunk,
      onComplete,
      onError,
      isPaymentRetry // paymentApproved 플래그
    );
  } catch (err: any) {
    // 402 에러 감지
    if (err.name === 'PaymentRequiredError') {
      setPendingPayment(err.payment);
      // 승인 UI 표시
      return;
    }
  }
};
```

### 2. API 레이어 - 402 응답 처리

[`api.ts`](file:///d:/Develop/Lmarena/frontend/lib/api.ts#L103-L109)에서 처리:

```typescript
if (response.status === 402) {
  const data = await response.json();
  throw new PaymentRequiredError(data.payment);
}
```

**백엔드 응답 형식:**
```json
{
  "payment": {
    "chainId": 8453,
    "token": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "spender": "0xYourContractAddress",
    "amount": "1000000",
    "message": "AI 모델 사용을 위해 1 USDC 승인이 필요합니다."
  }
}
```

### 3. 승인 UI 표시

초기 화면과 채팅 화면 모두에서 표시:

```tsx
{pendingPayment && (
  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
    <p className="font-semibold">💳 결제 승인 필요</p>
    <p className="mt-1 text-blue-600">
      {pendingPayment.message || 'AI 모델 사용을 위해 USDC 승인이 필요합니다.'}
    </p>
    <Button onClick={handleApprove} disabled={isApproving}>
      {isApproving ? '승인 중...' : 'USDC 승인하기'}
    </Button>
  </div>
)}
```

### 4. 토큰 승인 처리

[`useUsdc.ts`](file:///d:/Develop/Lmarena/frontend/app/hooks/useUsdc.ts) 훅 사용:

```typescript
const handleApprove = async () => {
  if (!pendingPayment) return;
  
  try {
    // USDC 컨트랙트에 approve 트랜잭션 전송
    await approve(
      pendingPayment.token,
      pendingPayment.spender,
      pendingPayment.amount
    );
    
    setPendingPayment(null);
    
    // 승인 완료 후 2초 대기 (블록체인 반영)
    setTimeout(() => {
      handleSubmit(true); // paymentApproved = true
    }, 2000);
    
    toast.success('USDC 승인이 완료되었습니다.');
  } catch (err) {
    console.error('Approval failed:', err);
  }
};
```

### 5. 재시도 시 헤더 추가

[`api.ts`](file:///d:/Develop/Lmarena/frontend/lib/api.ts#L93-L95)에서 처리:

```typescript
if (paymentApproved) {
  headers['x-payment-approved'] = 'true';
}
```

## 백엔드 구현 요구사항

### 1. 승인 확인 엔드포인트

**POST** `/arena/chat/stream`

**요청 헤더:**
- `x-payment-approved`: `'true'` (승인 완료 후 재시도 시)

**응답:**
- **200 OK**: 승인 완료, 스트리밍 시작
- **402 Payment Required**: 승인 필요

```typescript
// 백엔드 예시 (Node.js/Express)
app.post('/arena/chat/stream', async (req, res) => {
  const paymentApproved = req.headers['x-payment-approved'] === 'true';
  const { prompt } = req.body;
  
  if (!paymentApproved) {
    // 토큰 승인 확인 (블록체인 조회)
    const hasAllowance = await checkUSDCAllowance(userAddress, contractAddress);
    
    if (!hasAllowance) {
      return res.status(402).json({
        payment: {
          chainId: 8453, // Base mainnet
          token: USDC_ADDRESS,
          spender: CONTRACT_ADDRESS,
          amount: '1000000', // 1 USDC (6 decimals)
          message: 'AI 모델 사용을 위해 1 USDC 승인이 필요합니다.'
        }
      });
    }
  }
  
  // 승인 완료, AI 응답 스트리밍
  res.setHeader('Content-Type', 'text/event-stream');
  // ... 스트리밍 로직
});
```

### 2. 승인 확인 로직

```typescript
async function checkUSDCAllowance(
  owner: string,
  spender: string
): Promise<boolean> {
  const usdcContract = new ethers.Contract(
    USDC_ADDRESS,
    ['function allowance(address owner, address spender) view returns (uint256)'],
    provider
  );
  
  const allowance = await usdcContract.allowance(owner, spender);
  const requiredAmount = ethers.parseUnits('1', 6); // 1 USDC
  
  return allowance >= requiredAmount;
}
```

## 테스트 시나리오

### 시나리오 1: 첫 사용 (승인 필요)

1. 사용자가 프롬프트 입력 후 Submit
2. 백엔드가 402 응답 반환
3. 파란색 승인 알림 표시
4. "USDC 승인하기" 버튼 클릭
5. Privy 지갑에서 승인 트랜잭션 확인
6. 승인 완료 후 자동으로 재시도
7. AI 응답 스트리밍 시작

### 시나리오 2: 이미 승인된 경우

1. 사용자가 프롬프트 입력 후 Submit
2. 백엔드가 승인 확인 (allowance 충분)
3. 즉시 AI 응답 스트리밍 시작
4. 승인 UI 표시 안 됨

### 시나리오 3: 승인 중 에러

1. 사용자가 "USDC 승인하기" 클릭
2. 지갑에서 거부 또는 에러 발생
3. 에러 토스트 표시
4. 승인 UI는 그대로 유지 (재시도 가능)

## 환경 변수

`.env.local`:
```env
# USDC 컨트랙트 주소 (Base mainnet)
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# 백엔드 컨트랙트 주소 (승인 대상)
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourContractAddress
```

## 주의사항

1. **블록체인 반영 시간**: 승인 트랜잭션 후 2초 대기 (현재 구현)
   - 네트워크 상황에 따라 조정 필요
   
2. **승인 금액**: 현재는 1 USDC로 고정
   - 향후 사용량에 따라 동적으로 조정 가능

3. **보안**: 
   - `x-payment-approved` 헤더만으로는 불충분
   - 백엔드에서 반드시 블록체인 상태 확인 필요

4. **UX 개선**:
   - 승인 진행 상태 표시 (트랜잭션 해시 링크)
   - 승인 금액 명시
   - 예상 가스비 표시

## 다음 단계

- [ ] 백엔드에서 402 응답 구현
- [ ] USDC allowance 확인 로직 추가
- [ ] 승인 금액 동적 계산
- [ ] 승인 상태 캐싱 (불필요한 블록체인 조회 방지)
- [ ] 에러 핸들링 개선
- [ ] 승인 UI/UX 개선
