# x402 결제 프로토콜 통합 가이드

## 개요

x402는 **HTTP 402 Payment Required** 상태 코드를 활용한 pay-per-use 프로토콜입니다.

- **클라이언트**: 결제가 필요한 엔드포인트에 요청을 보냄
- **서버**: 402 응답과 함께 결제 정보(금액, 주소, 토큰 등) 반환
- **클라이언트**: 지갑에서 메시지 서명 → 헤더에 추가 → 재요청
- **서버**: 서명 검증 후 요청 처리

## 아키텍처

### 백엔드 (Express)

```
src/
├── lib/
│   └── x402.ts              # x402 미들웨어 및 유틸
├── modules/
│   └── arena/
│       ├── arena.routes.ts  # 라우터 설정
│       └── arena.service.ts # 핸들러 로직
└── app.ts                   # 앱 설정
```

**주요 컴포넌트:**

1. **x402 미들웨어**: HTTP 402 응답 처리
   ```typescript
   x402Middleware(config, payToAddress, facilitatorUrl)
   x402MultiMiddleware(endpointConfigs, payToAddress, facilitatorUrl)
   ```

2. **결제 데이터 변환**:
   - USD → USDC (6 decimals)
   ```typescript
   convertUsdToUsdc('$0.01') // → '10000'
   ```

3. **결제 정보 페이로드**:
   ```typescript
   buildX402PaymentRequired(config, payToAddress, facilitatorUrl)
   // 반환:
   {
     chainId: 84532,
     token: '0xA449bc031fA0b815cA14fAFD0c5EdB75ccD9c80f',
     pay_to_address: '0x...',
     amount: '10000',           // USDC (wei)
     price: '$0.01',           // 표시용
     network: 'base-sepolia',
     description: '...'
   }
   ```

### 프론트엔드 (Next.js)

```
lib/
├── x402-client.ts  # x402 클라이언트 로직
├── api.ts          # API 클라이언트 (x402 지원)
└── types.ts        # 타입 정의
```

**주요 함수:**

1. **x402Fetch**: 자동 402 처리
   ```typescript
   const data = await x402Fetch<T>(url, {
     method: 'POST',
     body: JSON.stringify(payload),
     x402: { address: userAddress, provider: ethersProvider }
   });
   ```

2. **메시지 서명**:
   ```typescript
   const message = createX402SignatureMessage(paymentPayload);
   const signature = await signX402Payment(message, address, provider);
   ```

3. **인증 토큰 생성**:
   ```typescript
   const authToken = createX402AuthToken(payload, signature, address);
   // x-payment-authorization 헤더에 담음
   ```

## 설정

### 백엔드 .env

```env
# x402 활성화
X402_ENABLED=true

# 네트워크 선택
X402_NETWORK=base-sepolia     # or 'base'

# 가격 설정 (USD)
X402_CHAT_PRICE=$0.01
X402_CHAT_STREAM_PRICE=$0.01

# x402 Facilitator 서버 (선택사항)
X402_FACILITATOR_URL=https://x402.org/facilitator

# 결제 수신 주소 (Treasury/PaymentRouter)
PAY_TO_ADDRESS=0x5e4D581D318ef0ff9e525529b40c3400457Fdbf6

# 기타
CHAIN_ID=84532
USDC_ADDRESS=0x...
```

### app.ts 초기화

```typescript
import { createApp } from './app';

const app = createApp(enableX402: true); // x402 활성화

app.listen(4000, () => {
  console.log('Server running on port 4000');
});
```

### 라우터 설정

```typescript
// arena.routes.ts
import { createArenaRouter } from './arena.routes';
import type { X402EndpointConfig } from '../../lib/x402';

const x402EndpointConfigs: X402EndpointConfig = {
  '/chat': {
    price: '$0.01',
    network: 'base-sepolia',
    description: ' Proof-of-Prompt : 1 prompt answer',
  },
  '/chat/stream': {
    price: '$0.01',
    network: 'base-sepolia',
    description: ' Proof-of-Prompt : 1 streaming prompt answer',
  }
};

const arenaRouterWithX402 = createArenaRouter({
  endpointConfigs: x402EndpointConfigs,
  payToAddress: process.env.PAY_TO_ADDRESS,
  facilitatorUrl: process.env.X402_FACILITATOR_URL,
});

app.use('/arena', arenaRouterWithX402);
```

## 클라이언트 사용

### 기본 사용법

```typescript
import { arenaApi } from '@/lib/api';
import { useWallet } from '@/app/hooks/use-wallet';

function ChatComponent() {
  const { address, provider } = useWallet();

  const handleSubmit = async (prompt: string) => {
    try {
      const result = await arenaApi.createChat(
        prompt,
        address,
        userId,
        // x402 옵션 전달
        address && provider
          ? { address, provider }
          : undefined
      );

      console.log('Chat response:', result);
    } catch (error) {
      if (error instanceof PaymentRequiredError) {
        console.log('Payment required:', error.payment);
        // 사용자에게 결제 확인 메시지 표시
      } else {
        console.error('Error:', error);
      }
    }
  };

  return (
    <div>
      <input
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button onClick={() => handleSubmit(prompt)}>
        Send (x402 Auto-Payment)
      </button>
    </div>
  );
}
```

### 결제 흐름

1. **요청 (결제 정보 없음)**:
   ```
   POST /arena/chat
   Content-Type: application/json
   
   { "prompt": "...", "walletAddress": "0x..." }
   ```

2. **402 응답**:
   ```json
   HTTP 402 Payment Required
   
   {
     "error": "Payment Required",
     "payment": {
       "chainId": 84532,
       "token": "0x...",
       "pay_to_address": "0x...",
       "amount": "10000",
       "price": "$0.01",
       "network": "base-sepolia",
       "description": " Proof-of-Prompt : 1 prompt answer",
       "timestamp": 1700000000000
     }
   }
   ```

3. **클라이언트 처리**:
   - 메시지 생성: `"I authorize payment for $0.01 USD..."`
   - 지갑 서명
   - 서명 + 페이로드를 헤더에 담음

4. **인증된 요청**:
   ```
   POST /arena/chat
   Content-Type: application/json
   x-payment-authorization: { "payload": {...}, "signature": "0x...", "address": "0x...", "timestamp": ... }
   
   { "prompt": "...", "walletAddress": "0x..." }
   ```

5. **200 응답**:
   ```json
   {
     "matchId": 123,
     "prompt": "...",
     "response": "..."
   }
   ```

## 구현 체크리스트

### 백엔드

- [ ] x402.ts 미들웨어 생성
- [ ] arena.routes.ts 수정 (x402 통합)
- [ ] app.ts 설정 (x402 활성화)
- [ ] .env 예시 업데이트
- [ ] 결제 검증 로직 구현 (EIP-3009 서명 검증)

### 프론트엔드

- [ ] x402-client.ts 생성
- [ ] api.ts 통합 (x402Fetch 지원)
- [ ] useWallet에서 provider 제공
- [ ] 결제 UI 컴포넌트 추가

### 스마트 컨트랙트

- [ ] Deposit Pool 컨트랙트 배포
- [ ] USDC 승인 로직
- [ ] 결제 브로드캐스트 로직

## 테스트

### 로컬 테스트 (x402 비활성화)

```bash
cd backend
X402_ENABLED=false npm run dev
```

### 테스트넷 테스트

1. **컨트랙트 배포**:
   ```bash
   # Base Sepolia에 Deposit Pool 배포
   ```

2. **환경 변수 설정**:
   ```env
   X402_ENABLED=true
   X402_NETWORK=base-sepolia
   PAY_TO_ADDRESS=0x5e4D581D318ef0ff9e525529b40c3400457Fdbf6
   ```

3. **프론트엔드 테스트**:
   ```bash
   cd frontend
   pnpm dev
   # 지갑 연결 → /chat 엔드포인트 호출 → 402 응답 → 서명 → 재요청
   ```

## 주의사항

### 보안

1. **서명 검증**: 실제 배포 시 서명 검증 필수
   ```typescript
   // backend/src/lib/x402.ts에서 구현 필요
   function verifyX402Signature(payload, signature, address) {
     // EIP-191 검증
     // Facilitator 검증
   }
   ```

2. **Nonce 관리**: Replay 공격 방지
   - 각 요청마다 고유한 nonce 사용
   - 시간 기반 유효성 검증

3. **Rate Limiting**: DDoS 방지
   - x402 요청마다 cost 차감
   - 사용자별 rate limit 설정

### 성능

1. **캐싱**: 결제 정보는 짧은 시간만 유효
   - TTL: 5-10분
   - 만료 후 새로운 402 응답

2. **배치 결제**: 여러 요청을 한 번에 처리
   - Facilitator에서 배치 브로드캐스트
   - 가스비 절감

## 다음 단계

1. **EIP-3009 서명 검증 구현**
2. **x402 Facilitator 연동**
3. **결제 히스토리 DB 저장**
4. **분석 대시보드**
   - 일별/주별/월별 매출
   - 사용자별 결제액
   - API 사용량 통계

---

## 참고 자료

- [x402 프로토콜 스펙](https://docs.x402.org)
- [Coinbase CDP x402 문서](https://docs.cdp.coinbase.com/x402)
- [EIP-3009 검증](https://eips.ethereum.org/EIPS/eip-3009)
- [EIP-191 서명](https://eips.ethereum.org/EIPS/eip-191)
