좋아, 이제 **“어디에서 x402를 쓰는지 + 돈이 정확히 어떻게 흐르는지”**를 딱 고정해보자.
아래 구조 기준으로 팀 문서에 그대로 넣어도 될 정도로 정리해볼게.

---

# 0. Actors & Components

먼저 역할부터 고정하자:

* **UserWallet**: 유저의 Base 지갑 (USDC 보유)
* **Frontend**: 우리 dApp (Next.js 등)
* **Backend API**: `/api/chat`, `/api/prompts/share` 등
* **PaymentRouter (Treasury Pool)**:
  유저 결제가 쌓이는 우리 컨트랙트 주소 = x402 `pay_to_address` (유저→우리)
* **ServiceOpsWallet**:
  우리 백엔드/에이전트가 컨트롤하는 서비스 지갑 (EOA or Smart Wallet)
  → PaymentRouter에서 자금을 옮겨와 보관
* **Flock x402 Merchant**:
  Flock API 쪽에서 설정한 `pay_to_address` (우리→Flock 결제 대상)
* **x402 Client / Middleware**:

  * 프론트: `fetchWithPayment` 같은 래퍼
  * 백엔드: Flock 호출용 x402 클라이언트

---

# 1. x402를 쓰는 곳 정리

### (1) 유저 → 우리 서비스 (프롬프트 제출 시)

* **엔드포인트**: `POST /api/chat`
* **x402 Seller**: 우리 서비스 (Backend)
* **pay_to_address**: `PaymentRouter` 컨트랙트 주소
* **price**: `promptPrice` (USDC, Flock 원가 + 제목/카테고리 원가 + 수수료/리워드 포함)

### (2) 우리 서비스 → Flock API (LLM 호출 시)

* **엔드포인트(예시)**:

  * `POST https://api.flock.io/v1/chat`  (답변 생성)
  * `POST https://api.flock.io/v1/classify`  (제목/카테고리 생성)
* **x402 Seller**: Flock
* **pay_to_address**: Flock이 제공하는 머천트 주소
* **price**: Flock API에서 주는 요청당 가격

※ 여기서 결제자는 **ServiceOpsWallet**
→ 이 지갑이 x402 서명/결제를 하고, USDC는 Flock 측 주소로 전송됨.

---

# 2. 유저 프롬프트 제출 결제 플로우 (User → PaymentRouter via x402)

## 2.1. 프론트엔드 흐름

1. 유저가 Home에서 프롬프트를 입력하고 **“Submit”** 클릭.

2. 프론트에서 `fetchWithPayment` 같은 x402 래핑 클라이언트로 API 호출:

   ```ts
   const res = await fetchWithPayment('/api/chat', {
     method: 'POST',
     body: JSON.stringify({ promptText }),
   });
   ```

3. 첫 요청 시:

   * 서버가 `402 Payment Required` 응답과 함께 x402 메타데이터 반환:

     * `price`: 예) `"0.05"` (5센트)
     * `asset`: `"USDC"`
     * `network`: `"base"`
     * `pay_to_address`: `PaymentRouter` 컨트랙트 주소

4. x402 클라이언트가:

   * UserWallet에 “이 요청에 대해 USDC XX만큼 결제할게?” 라는 서명 요청
   * 유저가 서명 → x402 facilitator가 onchain에서

     * `UserWallet → PaymentRouter` 로 USDC 전송 (EIP-3009 스타일)

5. 결제가 성공하면:

   * 같은 `/api/chat` 요청을 **다시 자동으로** 보내고,
   * 이번엔 정상적인 200 응답(LLM 답변)을 받음.

## 2.2. 백엔드 흐름 (`/api/chat` 핸들러)

x402 미들웨어 기준으로:

1. 요청 진입 → **x402 미들웨어**가 먼저 실행

   * 아직 결제 안 된 요청이면:

     * `402` + 결제정보 반환 (위 3번)
   * 이미 결제 완료된 요청이면:

     * 실제 핸들러로 패스

2. 결제가 된 상태에서의 실제 핸들러 로직:

   ```ts
   // pseudo-code
   async function chatHandler(req, res) {
     const { promptText } = await req.json();
     const userAddress = req.userAddress; // x402/지갑 컨텍스트

     // 1) DB에 Prompt 생성
     const prompt = await db.prompt.create({
       data: {
         authorAddress: userAddress,
         promptText,
         modelName: null,
         isShared: false,
         status: 'PENDING',
       },
     });

     // 2) Flock LLM 호출 (여기서 우리→Flock x402 결제 발생)
     const answer = await callFlockAnswerLLM(promptText);

     // 3) DB에 Answer 저장, Prompt 업데이트
     await db.answer.create({
       data: {
         promptId: prompt.id,
         text: answer.text,
         modelName: answer.modelName,
       },
     });

     await db.prompt.update({
       where: { id: prompt.id },
       data: {
         modelName: answer.modelName,
         status: 'COMPLETED',
       },
     });

     // 4) 클라이언트로 응답 반환
     return res.json({
       promptId: prompt.id,
       answer: {
         id: answer.id,
         text: answer.text,
       },
     });
   }
   ```

3. 이때 프롬프트 가격(`promptPrice`)에는:

   * Flock 답변 LLM 예상 비용
   * 향후 제목/카테고리 생성 비용
   * 우리 수수료 + 리워드 풀 몫
     전부 포함되어 있음.

---

# 3. 우리 → Flock API 결제 플로우 (ServiceOpsWallet via x402)

유저 결제랑 완전히 분리해서 생각하면 편함.

## 3.1. 준비 단계

* **ServiceOpsWallet**에 USDC를 확보:

  * PaymentRouter 컨트랙트에서 `withdrawToOpsWallet(amount)` 같은 함수로

    * 오너/운영자가 주기적으로 USDC 일부를 Ops 지갑으로 옮김.
* 백엔드에서:

  * ServiceOpsWallet의 키/스마트월렛 컨트롤 권한을 가지고 있음.
  * x402 클라이언트를 이 지갑 기준으로 초기화.

## 3.2. Flock 호출 헬퍼 예시

### A. 답변 생성 (`callFlockAnswerLLM`)

```ts
async function callFlockAnswerLLM(promptText: string) {
  // 1) Flock API에 첫 요청 (x402 클라이언트가 wrap)
  const res = await flockClient.fetchWithPayment('/v1/chat', {
    method: 'POST',
    body: JSON.stringify({ prompt: promptText }),
  });

  // flockClient 내부:
  // - 첫 요청에서 402 응답 받으면
  //   → ServiceOpsWallet로 x402 결제
  //   → 재요청 후 최종 응답 반환

  const json = await res.json();

  return {
    text: json.answer,
    modelName: json.model_name,
  };
}
```

이때:

* **x402 #2** 플로우:

  1. 우리 서버 → Flock API 첫 요청
  2. Flock → `402` + `price`, `pay_to_address = flockMerchantAddress`
  3. x402 클라이언트가 ServiceOpsWallet에 서명 요청
  4. facilitator가 onchain에서

     * `ServiceOpsWallet → flockMerchantAddress`로 USDC 전송
  5. 결제 성공 후 재요청 → LLM 응답 수신

### B. 제목/카테고리 생성 (`generateTitleCategory`)

공유 버튼을 눌렀을 때:

```ts
async function generateTitleCategory(promptText: string, answerText: string) {
  const res = await flockClient.fetchWithPayment('/v1/classify', {
    method: 'POST',
    body: JSON.stringify({
      prompt: promptText,
      answer: answerText,
      // or custom instructions for "title + category"
    }),
  });

  const json = await res.json();
  return {
    title: json.title,
    category: json.category, // 5개 중 하나로 매핑
  };
}
```

* 이 호출도 동일하게 **ServiceOpsWallet → Flock** x402 결제.
* 비용은 프롬프트 가격 설계 시 “평균 호출 1회” or “2회(답변+메타)” 기준으로 포함.

---

# 4. PaymentRouter / Treasury 결제 로직 역할

x402 자체는 **“누구에게 얼마를 보내라”**만 결정해 주고,
우리가 설계한 **PaymentRouter 컨트랙트**는 “받은 돈을 어떻게 쓸지/나눌지”를 관리.

### 4.1. PaymentRouter 핵심 책임

1. **유저 결제 수신**

   * x402 `pay_to_address`로 사용
   * 따라서 유저 지갑→PaymentRouter로 USDC가 전송됨

2. **재원 분배용 출금 함수**

   * 예시:

   ```solidity
   function withdrawToOpsWallet(uint256 amount) external onlyOwner {
       usdc.transfer(serviceOpsWallet, amount);
   }

   function fundRewardPool(uint256 amount) external onlyOwner {
       usdc.transfer(rewardPoolAddress, amount);
   }
   ```

3. (옵션) 이벤트 로그

   * `PromptPaid(user, amount, promptId?)`
   * x402 레벨에선 promptId까지 모르니까,

     * 백엔드에서 결제와 promptId를 매핑해 오프체인으로 기록하는 게 일반적.

### 4.2. 비용 구조 개념

프롬프트당 받는 금액 `P`를:

* `P = Flock_answer_cost + Flock_title_category_cost + infra_margin + reward_pool_share + protocol_fee`

형태로 설계해 두고:

* `Flock_*_cost`는 우리 → Flock x402 비용
* `reward_pool_share`는 주간 리워드/업적 보상으로 나중에 나갈 몫
* 나머지는 서버비/개발자/트레저리

이렇게 쪼개서 회계/온체인 분배를 설계하면 된다.

---

# 5. 정리 – “x402 쓰는 곳 + 결제 로직” 한 줄 요약

1. **유저 프롬프트 제출 시**

   * `/api/chat`에 x402 미들웨어 적용
     → 유저가 서명하면 **UserWallet → PaymentRouter**로 USDC 전송
     → 결제 완료 후에만 Flock 호출 + 답변 반환.

2. **Flock으로 답변 생성 / 제목·카테고리 자동 생성 시**

   * 백엔드에서 `flockClient.fetchWithPayment` 사용
     → **ServiceOpsWallet → FlockMerchantAddress**로 x402 결제
     → 결제 후 LLM 응답 수신.

3. **PaymentRouter(Treasury)**

   * 유저 결제금이 쌓이는 풀
   * 여기서 일부를 ServiceOpsWallet·RewardPool 등으로 옮겨서

     * Flock 비용 지불
     * 주간 리워드/업적 보상 지급
     * 기타 운영비로 사용.

이 구조면:

* **유저 쪽도 x402**,
* **우리→Flock도 x402**,
* 그리고 결제·수익·보상까지 전부 한 “Treasury 설계” 안에 들어가게 돼.
