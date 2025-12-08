# Proof-of-Prompt (PoP)

> **프롬프트를 개인용에서 커뮤니티 자산으로 — 블라인드 모델 비교와 x402 프로토콜 기반의 프롬프트 공유 플랫폼**

---

## 📋 목차

- [프로젝트 개요](#프로젝트-개요)
- [핵심 기능](#핵심-기능)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [빠른 시작](#빠른-시작)
- [개발 가이드](#개발-가이드)
- [배포](#배포)
- [기여하기](#기여하기)

---

## 🎯 프로젝트 개요

**PoP**는 프롬프트를 블라인드 모드에서 여러 AI 모델과 비교하고, 커뮤니티와 공유하며, x402 프로토콜을 통해 자동 결제하는 프롬프트 평가 플랫폼입니다.

### 핵심 가치
- 🔍 **블라인드 평가**: 모델명을 가린 상태에서 프롬프트 품질만 평가
- 💳 **Frictionless 결제**: x402 프로토콜로 가입/정액제 없이 프롬프트 단위 과금
- 🌍 **글로벌 커뮤니티**: 좋은 프롬프트가 축적되고 평가받는 생태계
- 🏆 **보상 시스템**: 커뮤니티 기여에 따른 주간 보상 분배

---

## ✨ 핵심 기능

### 1. Proof Of Prompt (프롬프트 채팅 & 공유)
- 사용자가 프롬프트 입력하면 AI 모델의 응답 획득
- x402 결제로 프롬프트 단위 자동 차감
- 만족스러운 결과를 프롬프트 게시판에 업로드
- 업로드된 프롬프트는 커뮤니티에서 평가 및 재사용 가능

### 2. x402 결제 시스템
- **Pay-per-Prompt**: 프롬프트 1개 = 1회 결제
- **자동 결제**: 지갑 서명 없이 자동 청구
- **글로벌 결제**: 국가/카드 제한 없음

### 3. 프롬프트 게시판
- 만족스러운 프롬프트/응답을 공개 게시판에 업로드
- 커뮤니티에서 평가, 댓글, 재사용
- 인기 프롬프트는 주간 보상 분배

### 4. Leaderboard
- 프롬프트 크리에이터별 누적 평점
- 사용자별 참여 기여도 순위

---

## 🛠️ 기술 스택

### Backend
- **Runtime**: Node.js 18+ + TypeScript
- **Framework**: Express.js 5
- **Database**: PostgreSQL + Prisma ORM
- **AI Integration**: Flock API
- **Payment**: x402 Protocol
- **Validation**: Zod

### Frontend
- **Framework**: Next.js 15 + TypeScript
- **Styling**: Tailwind CSS 3.4
- **Auth**: Privy (Web3 인증)
- **Package Manager**: pnpm 8.15+
- **State Management**: Zustand
- **HTTP Client**: TanStack React Query

### Smart Contracts
- **Framework**: Foundry (Solidity)
- **Network**: Base Sepolia (테스트넷)
- **Contracts**: PaymentTreasury, DepositPool

---

## 📦 프로젝트 구조

```
Proof-of-Prompt/
├── backend/                      # Express API Server
│   ├── src/
│   │   ├── app.ts               # Express 앱 설정
│   │   ├── index.ts             # 서버 엔트리포인트
│   │   ├── config/
│   │   │   └── env.ts           # 환경변수 로드 (dotenv)
│   │   ├── lib/
│   │   │   ├── prisma.ts        # Prisma 클라이언트 인스턴스
│   │   │   ├── x402.ts          # x402 프로토콜 클라이언트
│   │   │   ├── payment.ts       # 결제 처리 로직
│   │   │   ├── treasury-pool.ts # Treasury Pool 통합
│   │   │   ├── flock.ts         # Flock AI API 호출
│   │   │   └── payment-treasury.ts  # Payment + Treasury 통합
│   │   ├── modules/
│   │   │   ├── arena/           # 배틀/평가 시스템
│   │   │   │   ├── arena.routes.ts
│   │   │   │   └── arena.service.ts
│   │   │   ├── leaderboard/     # 순위표
│   │   │   │   ├── leaderboard.routes.ts
│   │   │   │   └── leaderboard.service.ts
│   │   │   ├── users/           # 사용자 관리
│   │   │   ├── prompts/         # 프롬프트 저장/조회
│   │   │   └── mock/            # Mock 응답 (개발용)
│   │   └── jobs/
│   │       └── weeklyRewards.ts # 주간 보상 분배 잡
│   ├── prisma/
│   │   ├── schema.prisma        # DB 스키마 (Prisma)
│   │   ├── seed.ts              # 초기 데이터 시드
│   │   └── migrations/          # DB 마이그레이션
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── frontend/                     # Next.js 프론트엔드
│   ├── app/
│   │   ├── layout.tsx           # 글로벌 레이아웃
│   │   ├── page.tsx             # 홈 페이지
│   │   ├── globals.css          # 글로벌 스타일
│   │   ├── components/
│   │   │   ├── HomePage.tsx     # 홈 화면
│   │   │   ├── ConversationPage.tsx  # 배틀 페이지
│   │   │   ├── LeaderboardPage.tsx   # 순위 페이지
│   │   │   ├── ProfilePage.tsx  # 프로필
│   │   │   ├── DashboardPage.tsx     # 대시보드
│   │   │   ├── WalletButton.tsx # 지갑 연결 버튼
│   │   │   └── ui/              # Radix UI 컴포넌트
│   │   ├── hooks/
│   │   │   ├── useAuth.ts       # Privy 인증
│   │   │   ├── use-wallet.ts    # Wagmi 지갑
│   │   │   └── usePayment.ts    # 결제 훅
│   │   ├── providers/
│   │   │   └── providers.tsx    # Web3 Provider 설정
│   │   └── fonts/               # 폰트 파일
│   ├── lib/
│   │   ├── api.ts               # API 클라이언트 헬퍼
│   │   ├── config.ts            # 설정값 (환경변수)
│   │   ├── constants.ts         # 상수
│   │   ├── types.ts             # TypeScript 타입
│   │   ├── x402-client.ts       # x402 SDK 인스턴스
│   │   └── contracts/
│   │       └── usdc-config.ts   # USDC 설정
│   ├── public/
│   │   └── images/              # 이미지 에셋
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── postcss.config.mjs
│   ├── next.config.mjs
│   └── env.d.ts
│
├── foundry/                      # Solidity 스마트 컨트랙트
│   ├── src/
│   │   ├── PaymentTreasury.sol  # 결제 처리 컨트랙트
│   │   └── ...
│   ├── script/
│   │   └── Deploy.s.sol         # 배포 스크립트
│   └── foundry.toml
│
├── docs/                         # 문서
│   ├── SETUP_GUIDE.md           # 🌟 환경 설정 가이드 (먼저 읽기)
│   ├── X402_INTEGRATION_GUIDE.md # x402 통합 가이드
│   ├── X402_QUICK_START.md      # x402 빠른 시작
│   ├── DEPLOYMENT_READY.md      # 배포 체크리스트
│   ├── API_TYPES.md             # API 타입 정의
│   ├── CONTRACT_FUNCTIONS_SUMMARY.md
│   ├── TREASURY_POOL_INTEGRATION.md
│   ├── PROJECT_OVERVIEW.md      # 전체 프로젝트 개요
│   └── ...
│
├── AGENTS.md                    # 개발 가이드라인 & 규칙
├── README.md                    # 이 파일
└── .gitignore
```

---

## 🚀 빠른 시작

### 사전 요구사항
- **Node.js** 18+ (or 20+)
- **pnpm** 8.15+ (or npm)
- **PostgreSQL** 12+
- **Git**

### 1️⃣ 저장소 클론 및 환경 설정

```bash
git clone https://github.com/Base-PoP/Proof-of-Prompt.git
cd Proof-of-Prompt
```

### 2️⃣ 환경 변수 설정

**Backend** (`backend/.env`):
```env
DATABASE_URL="postgresql://user:password@localhost:5432/pop_dev"
USE_MOCK=true
PORT=4000
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_USE_MOCK_DATA=true
```

더 자세한 설정은 [SETUP_GUIDE.md](./docs/SETUP_GUIDE.md) 참고.

### 3️⃣ 의존성 설치

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
pnpm install
```

### 4️⃣ 데이터베이스 초기화

```bash
cd backend
npm run db:reset
```

### 5️⃣ 개발 서버 실행

**Terminal 1 - Backend** (포트 4000):
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend** (포트 3000):
```bash
cd frontend
pnpm dev
```

### ✅ 확인

- Backend 헬스 체크: `curl http://localhost:4000/health`
- Frontend: http://localhost:3000 접속

---

## 🔧 개발 가이드

### Backend 스크립트

| 명령어 | 설명 |
|-------|------|
| `npm run dev` | 개발 서버 (hot reload) |
| `npm run build` | TypeScript 컴파일 |
| `npm start` | 프로덕션 서버 실행 |
| `npm run db:reset` | DB 스키마 재설정 + 시드 |
| `npm run prisma:migrate` | DB 마이그레이션 |
| `npm run prisma:studio` | Prisma Studio (GUI DB 관리) |

### Frontend 스크립트

| 명령어 | 설명 |
|-------|------|
| `pnpm dev` | 개발 서버 |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm start` | 프로덕션 서버 |
| `pnpm lint` | ESLint 실행 |

### 주요 API 엔드포인트

### Arena (프롬프트 채팅 & 공유)
```bash
# 채팅 생성 (AI 응답 获득)
POST /arena/chat
{ "prompt": "프롬프트 내용", "walletAddress": "0x..." }

# 채팅 스트리밍
POST /arena/chat/stream
{ "prompt": "프롬프트 내용", "walletAddress": "0x..." }

# 프롬프트 공유 (게시판 업로드)
POST /arena/share
{ 
  "matchId": 1,
  "title": "프롬프트 제목",
  "tags": ["태그1", "태그2"],
  "walletAddress": "0x..."
}
```

#### Leaderboard
```bash
# 모델 순위
GET /leaderboard/models

# 사용자 순위
GET /leaderboard/users
```

### 코딩 스타일

- **언어**: TypeScript (strict mode)
- **포맷**: 2-space 인덴트
- **따옴표**: 작은따옴표 (`'`)
- **명명 규칙**:
  - 컴포넌트/모듈: `PascalCase` (e.g., `WalletButton.tsx`)
  - 함수/변수: `camelCase` (e.g., `fetchUserData`)
  - 상수: `UPPER_SNAKE_CASE` (e.g., `API_BASE_URL`)

### DB 변경 시 절차

1. **Prisma 스키마 수정** (`backend/prisma/schema.prisma`)
2. **마이그레이션 생성**:
   ```bash
   cd backend
   npx prisma migrate dev --name <migration_name>
   ```
3. **타입 재생성**:
   ```bash
   npx prisma generate
   ```
4. **변경사항 확인**:
   ```bash
   npx prisma studio
   ```

---

## 📡 x402 결제 통합

프롬프트 제출 시 x402 프로토콜로 자동 결제됩니다.

**주요 파일**:
- Backend: `src/lib/x402.ts` - x402 클라이언트
- Frontend: `lib/x402-client.ts` - x402 SDK 설정

자세한 내용은 [X402_INTEGRATION_GUIDE.md](./docs/X402_INTEGRATION_GUIDE.md) 참고.

---

## 🔐 보안

- **환경변수**: `.env` 파일에만 민감 정보 저장 (Git 제외)
- **입력 검증**: Zod로 모든 입력 데이터 검증
- **CORS**: Express CORS 미들웨어로 설정
- **SQL Injection**: Prisma ORM으로 자동 방지

---

## 📝 기여하기

### 커밋 메시지 규칙 (Conventional Commits)

```bash
git commit -m "feat: 새로운 기능 추가"
git commit -m "fix: 버그 수정"
git commit -m "chore: 설정/의존성 변경"
git commit -m "docs: 문서 업데이트"
git commit -m "refactor: 코드 리팩토링"
```

### PR 작성 체크리스트

- [ ] 기능 설명 작성
- [ ] DB 마이그레이션 필요 여부 명시
- [ ] 수동 테스트 내용 포함
- [ ] 스크린샷/비디오 첨부 (UI 변경 시)
- [ ] 관련 이슈 링크

더 자세한 내용은 [AGENTS.md](./AGENTS.md) 참고.

---

## 🚀 배포

### 프로덕션 빌드

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
pnpm build
pnpm start
```

배포 가이드: [backend/DEPLOYMENT_GUIDE.md](./backend/DEPLOYMENT_GUIDE.md)

---

## 📚 문서

- **[SETUP_GUIDE.md](./docs/SETUP_GUIDE.md)** - 환경 설정 (🌟 먼저 읽기)
- **[AGENTS.md](./AGENTS.md)** - 개발 가이드라인
- **[X402_QUICK_START.md](./docs/X402_QUICK_START.md)** - x402 빠른 시작
- **[API_TYPES.md](./docs/API_TYPES.md)** - API 타입 정의
- **[PROJECT_OVERVIEW.md](./docs/PROJECT_OVERVIEW.md)** - 전체 프로젝트 개요

---

## 📧 문의 & 지원

- 🐛 **버그 보고**: [GitHub Issues](https://github.com/Base-PoP/Proof-of-Prompt/issues)
- 💬 **질문**: GitHub Discussions (준비 중)
- 📖 **문서**: `docs/` 폴더 참고

---

## 📄 라이선스

MIT License

---

**Made with ❤️ by PoP Team**
