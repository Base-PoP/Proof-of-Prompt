# x402 Quick Start Guide

## 1단계: 환경 변수 설정

### 백엔드 (backend/.env)

```bash
# .env 파일 복사
cp .env.example .env

# 파일 수정
X402_ENABLED=true
X402_NETWORK=base-sepolia
X402_CHAT_PRICE=$0.01
X402_CHAT_STREAM_PRICE=$0.01
X402_FACILITATOR_URL=https://x402.org/facilitator
PAY_TO_ADDRESS=0x5e4D581D318ef0ff9e525529b40c3400457Fdbf6  # PaymentTreasury (Base Sepolia)
```

### 프론트엔드 (frontend/env.local)

```bash
# env.local 파일 복사
cp env.local.example env.local

# 기존 설정 유지 + 추가:
NEXT_PUBLIC_X402_ENABLED=true
```

---

## 2단계: 서버 시작

### 백엔드 시작

```bash
cd backend
npm install
npm run dev
```

출력:
```
Server running on http://localhost:4000
x402 middleware enabled for /arena/chat and /arena/chat/stream
```

### 프론트엔드 시작

```bash
cd frontend
pnpm install
pnpm dev
```

출력:
```
▲ Next.js 15.x
- Local: http://localhost:3000
```

---

## 3단계: API 엔드포인트 테스트

### Curl 테스트 (x402 없이)

```bash
curl -X POST http://localhost:4000/arena/chat \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello, how are you?",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42bE4"
  }'
```

**응답 (402 Payment Required)**:
```json
{
  "error": "Payment Required",
  "payment": {
    "chainId": 84532,
    "token": "0xA449bc031fA0b815cA14fAFD0c5EdB75ccD9c80f",
    "pay_to_address": "0x0000000000000000000000000000000000000000",
    "amount": "10000",
    "price": "$0.01",
    "network": "base-sepolia",
    "description": " Proof-of-Prompt : 1 prompt answer",
    "timestamp": 1700000000000
  }
}
```

### 클라이언트 통합 테스트

1. **프론트엔드에서 지갑 연결**
2. **Chat 페이지 방문**
3. **프롬프트 입력**
4. **"Send" 버튼 클릭**

**예상 흐름:**
```
1. 첫 요청 (x-payment-authorization 없음)
   ↓
2. 402 응답 받음 (payment 정보 포함)
   ↓
3. 사용자에게 "결제 승인" 표시
4. 사용자 지갑에서 메시지 서명 요청
   ↓
5. 서명된 요청 재전송 (x-payment-authorization 헤더 포함)
   ↓
6. 200 응답 (LLM 답변)
```

---

## 4단계: 로그 확인

### 백엔드 로그

```log
[x402] Payment Required for /arena/chat
[x402] Payment Authorization received
[x402] Processing chat with payment auth
🔥 [CHAT] Incoming request: { prompt: "...", userId: undefined }
```

### 프론트엔드 콘솔

```log
[x402] Signing message: I authorize payment for $0.01 USD...
[x402] Signature: 0x...
Request with payment authorization: {...}
Chat response: { matchId: 123, prompt: "...", response: "..." }
```

---

## 5단계: 컨트랙트 배포 (선택사항)

현재는 테스트 목적이므로 생략 가능. 실제 결제를 원하면:

1. **Deposit Pool 컨트랙트 배포** (Base Sepolia)
   ```bash
   cd backend
   npx hardhat run scripts/deploy.ts --network base-sepolia
   ```

2. **컨트랙트 주소 업데이트**
   ```env
   PAY_TO_ADDRESS=0x5e4D581D318ef0ff9e525529b40c3400457Fdbf6
   ```

3. **USDC 승인** (UI에서)
   - 사용자가 컨트랙트에 USDC 승인
   - 매번 자동으로 차감

---

## 문제 해결

### 402 응답이 계속 나옴

**원인**: 서명 검증 로직이 미구현됨

**해결**:
```typescript
// backend/src/lib/x402.ts - verifyX402Payment() 함수 구현 필요
// EIP-191 서명 검증
// Facilitator 검증
```

### "x402 address and provider required" 에러

**원인**: 프론트엔드에서 x402 옵션을 전달하지 않음

**해결**:
```typescript
await arenaApi.createChat(
  prompt,
  address,
  userId,
  { address, provider }  // ← 이 옵션 필수
);
```

### 402 응답 후 무한 대기

**원인**: 스트리밍 응답에서 x402Fetch 미지원

**해결**: 현재 `/chat/stream`은 x402Fetch 미지원
- TODO: 스트리밍 x402 구현
- 임시: `/chat` (비스트리밍) 사용

---

## 다음 단계

### 1. 실제 서명 검증 구현

```typescript
// backend/src/lib/x402.ts
import { verifyMessage } from 'ethers';

export async function verifyX402Payment(
  payload: X402PaymentPayload,
  signature: string,
  address: string
): Promise<boolean> {
  const message = createX402SignatureMessage(payload);
  const recovered = verifyMessage(message, signature);
  return recovered.toLowerCase() === address.toLowerCase();
}
```

### 2. Facilitator 연동

```typescript
// backend/src/lib/x402.ts
export async function broadcastToFacilitator(
  payload: X402PaymentPayload,
  signature: string,
  address: string
): Promise<{ success: boolean; txHash?: string }> {
  const response = await fetch(
    process.env.X402_FACILITATOR_URL + '/broadcast',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment: payload,
        signature,
        address,
      }),
    }
  );
  return response.json();
}
```

### 3. DB에 결제 기록 저장

```typescript
// backend/src/lib/x402.ts
export async function recordPayment(
  userId: number,
  walletAddress: string,
  amount: string,
  tokenAddress: string,
  chainId: number
) {
  // prisma.payment.create({...})
}
```

### 4. 분석 대시보드

- 일별/주별/월별 매출
- 사용자별 결제액
- API 사용량 통계

---

## 유용한 명령어

```bash
# 백엔드 재시작
cd backend && npm run dev

# 프론트엔드 재시작
cd frontend && pnpm dev

# 로그 보기
# Terminal에서 실시간 확인

# DB 초기화 (필요시)
cd backend && npm run db:reset

# 타입 체크
cd frontend && pnpm tsc --noEmit
cd backend && npx tsc --noEmit
```

---

## 참고 자료

- [x402 통합 가이드](./X402_INTEGRATION_GUIDE.md)
- [Coinbase CDP x402 문서](https://docs.cdp.coinbase.com/x402/quickstart-for-sellers)
- [x402 프로토콜 스펙](https://docs.x402.org)
- [EIP-191 메시지 서명](https://eips.ethereum.org/EIPS/eip-191)

---

## 피드백

문제가 있거나 개선 사항이 있으면 이슈 제출!
