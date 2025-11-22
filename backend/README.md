# 🎮 LM Arena Backend

AI 모델 배틀 플랫폼 - 프라이즈 기반 평가 시스템

## 📋 목차

- [프로젝트 소개](#프로젝트-소개)
- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [시작하기](#시작하기)
- [API 문서](#api-문서)
- [점수 시스템](#점수-시스템)
- [데이터베이스 구조](#데이터베이스-구조)

---

## 🎯 프로젝트 소개

LM Arena는 기업/재단이 프라이즈를 걸고 AI 모델을 평가받을 수 있는 플랫폼입니다.

### 핵심 컨셉
- 🏆 **프라이즈 배틀**: 기업이 상금을 걸고 자사 모델 평가
- 👥 **크라우드 소싱**: 사용자들의 투표로 공정한 평가
- 🎯 **품질 보상**: 일관성 있는 평가자에게 높은 보상
- 🤖 **AI 심판**: Reference LLM이 객관적 기준 제시

---

## ✨ 주요 기능

### 1. 배틀 시스템
- 두 AI 모델 간 블라인드 테스트
- 실시간 Elo 레이팅 계산
- Reference AI 기반 객관적 평가

### 2. 프라이즈 캠페인
- 기업/재단의 스폰서 캠페인 생성
- 기간 설정 및 상금 풀 관리
- 종료 시 자동 보상 분배

### 3. 점수 시스템
- **참여 점수**: 투표 참여 시 기본 점수
- **Reference 일치**: AI 심판과 같은 판단
- **Consistency**: 일관성 있는 평가 패턴
- **Consensus**: 다수 의견과의 일치도

### 4. 리더보드
- 모델 Elo 순위
- 사용자 점수 순위

---

## 🛠 기술 스택

```json
{
  "runtime": "Node.js + TypeScript",
  "framework": "Express.js",
  "database": "PostgreSQL",
  "orm": "Prisma",
  "ai": "Flock AI API",
  "validation": "Zod"
}
```

---

## 🚀 시작하기

### 1. 환경 설정

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
```

### 2. 환경변수 (`.env`)

```env
DATABASE_URL="postgresql://lmarena:lm_pass@localhost:5433/lmarena"
FLOCK_API_KEY=your_flock_api_key
USE_MOCK=false
PORT=4000
```

### 3. 데이터베이스 설정

```bash
# Prisma 마이그레이션 실행
npx prisma migrate dev

# 초기 데이터 시드
npx prisma db seed
```

### 4. 서버 실행

```bash
# 개발 모드
npm run dev

# 프로덕션 빌드
npm run build
npm start
```

서버가 `http://localhost:4000`에서 실행됩니다.

---

## 📡 API 문서

### Health Check
```
GET /health
```

### 🎮 Arena (배틀)

#### 매치 생성
```http
POST /arena/match
Content-Type: application/json

{
  "prompt": "Python과 JavaScript의 차이점은?",
  "userId": 123
}

Response:
{
  "matchId": 1,
  "prompt": "...",
  "modelA": { "id": 1, "name": "GPT-4" },
  "modelB": { "id": 2, "name": "Claude" },
  "responseA": { "content": "..." },
  "responseB": { "content": "..." }
}
```

#### 투표 제출
```http
POST /arena/vote
Content-Type: application/json

{
  "matchId": 1,
  "chosen": "A",  // "A" | "B" | "TIE"
  "userId": 123
}

Response:
{
  "ok": true,
  "refChoice": "A",
  "modelA": { "rating": 1525 },
  "modelB": { "rating": 1475 },
  "user": { "score": 156 },
  "vote": {
    "referenceScore": 3,
    "consistencyScore": 2,
    "consensusScore": 0,
    "totalScore": 6
  }
}
```

### 🏆 Leaderboard

#### 모델 순위
```http
GET /leaderboard/models

Response:
[
  {
    "rank": 1,
    "id": "1",
    "name": "GPT-4",
    "provider": "OpenAI",
    "rating": 1542,
    "gamesPlayed": 234
  }
]
```

#### 유저 순위
```http
GET /leaderboard/users

Response:
[
  {
    "rank": 1,
    "id": "123",
    "nickname": "User123",
    "score": 1250
  }
]
```

### 🎁 Campaign (프라이즈 배틀)

#### 캠페인 생성
```http
POST /campaign
Content-Type: application/json

{
  "title": "GPT-4 vs Claude Benchmark",
  "description": "Evaluate our new model",
  "sponsorName": "OpenAI",
  "sponsorType": "company",
  "prizeAmount": 10000,
  "prizeCurrency": "USD",
  "modelAId": 1,
  "modelBId": 2,
  "endDate": "2025-12-31T23:59:59Z"
}
```

#### 캠페인 목록
```http
GET /campaign?status=active
```

#### 캠페인 상세
```http
GET /campaign/1
```

#### 캠페인 종료 & 보상 분배
```http
POST /campaign/1/close

Response:
{
  "success": true,
  "campaignId": 1,
  "status": "rewarded",
  "prizeAmount": 10000,
  "participants": 125,
  "rewards": [
    {
      "userId": 123,
      "consensusScore": 45.5,
      "rewardAmount": 350.25
    }
  ]
}
```

---

## 🎯 점수 시스템

### 투표당 점수 (최대 6점)

| 항목 | 점수 | 계산 시점 | 설명 |
|-----|------|----------|------|
| **참여** | +1 | 즉시 | 투표 참여 기본 점수 |
| **Reference 일치** | +3 | 즉시 | AI 심판과 같은 선택 시 |
| **Consistency** | 0~2 | 즉시 | 최근 10개 투표의 일관성 |
| **Consensus** | 0~5 | 캠페인 종료 시 | 다수 의견과 일치도 |

### Consistency 계산 로직

```typescript
최근 10개 투표 중 Reference AI와 일치율:
- 70% 이상 → +2점 (높은 일관성)
- 50-70% → +1점 (중간 일관성)
- 50% 미만 → 0점 (낮은 일관성)

투표 수가 3개 미만이면 → 0점 (데이터 부족)
```

### Consensus 계산 로직

```typescript
캠페인 종료 시:
1. 각 매치별 다수 의견 계산 (A/B/TIE)
2. 다수 의견과 일치한 투표자에게 점수 부여
3. 일치율 기반으로 0~5점 차등 지급
```

### 보상 분배 알고리즘

```typescript
개인 보상 = (개인 Consensus 점수 / 전체 Consensus 점수) × 프라이즈 풀
```

---

## 🗄 데이터베이스 구조

### 핵심 모델

```prisma
Model           // AI 모델 (GPT-4, Claude 등)
User            // 사용자
Campaign        // 프라이즈 배틀 캠페인
CampaignReward  // 보상 분배 기록
Match           // 배틀 매치
Vote            // 투표
Response        // 모델 응답
Prompt          // 프롬프트
```

### ERD 다이어그램

```
Campaign (1) ─── (N) Match ─── (N) Vote ─── (N) User
    │                 │
    │                 └─── (2) Response ─── (1) Model
    │
    └─── (N) CampaignReward ─── (1) User
```

---

## 📝 주요 파일 구조

```
backend/
├── prisma/
│   ├── schema.prisma          # DB 스키마
│   ├── seed.ts                # 초기 데이터
│   └── migrations/            # 마이그레이션
├── src/
│   ├── app.ts                 # Express 앱 설정
│   ├── index.ts               # 서버 엔트리
│   ├── config/
│   │   └── env.ts             # 환경변수 설정
│   ├── lib/
│   │   ├── prisma.ts          # Prisma 클라이언트
│   │   └── flock.ts           # Flock AI 통합
│   └── modules/
│       ├── arena/             # 배틀 시스템
│       │   ├── arena.routes.ts
│       │   ├── arena.service.ts
│       │   ├── elo.ts         # Elo 레이팅
│       │   └── refJudge.ts    # AI 심판
│       ├── campaign/          # 캠페인 시스템
│       │   ├── campaign.routes.ts
│       │   ├── campaign.service.ts
│       │   └── closeCampaign.ts
│       ├── leaderboard/       # 순위표
│       ├── scoring/           # 점수 계산
│       │   ├── consensusBatch.ts
│       │   └── consistencyScore.ts
│       └── mock/              # Mock 응답
└── package.json
```

---

## 🧪 테스트

```bash
# 헬스체크
curl http://localhost:4000/health

# 매치 생성
curl -X POST http://localhost:4000/arena/match \
  -H "Content-Type: application/json" \
  -d '{"prompt": "안녕하세요", "userId": 1}'

# 투표
curl -X POST http://localhost:4000/arena/vote \
  -H "Content-Type: application/json" \
  -d '{"matchId": 1, "chosen": "A", "userId": 1}'
```

---

## 🔐 보안

- CORS 설정 활성화
- 환경변수로 민감 정보 관리
- Prisma ORM으로 SQL Injection 방지
- Zod로 입력 데이터 검증

---

## 📊 모니터링

```bash
# Prisma Studio (DB GUI)
npx prisma studio
```

---

## 🤝 기여하기

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 라이선스

MIT License

---

## 💬 문의

프로젝트 관련 문의: [GitHub Issues](https://github.com/base-LMarena/Lmarena/issues)
