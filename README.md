# 🎯 LM Battle - AI Model Chat & Share Platform

단일 AI 모델과 대화하고, 프롬프트를 공유하며, 커뮤니티와 소통하는 Web3 플랫폼

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Base](https://img.shields.io/badge/Base-Blockchain-blue)](https://base.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-green)](https://www.prisma.io/)

---

## 📋 목차

- [프로젝트 소개](#-프로젝트-소개)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [시작하기](#-시작하기)
- [프로젝트 구조](#-프로젝트-구조)
- [API 문서](#-api-문서)
- [라이선스](#-라이선스)

---

## 🚀 프로젝트 소개

LM Battle은 Flock API를 활용하여 다양한 AI 모델과 대화하고, 흥미로운 프롬프트를 커뮤니티와 공유하며, 좋아요를 통해 인기 콘텐츠를 발견할 수 있는 플랫폼입니다.

### 핵심 가치

- **간편함**: 단일 모델 선택으로 즉시 대화 시작
- **공유**: 흥미로운 대화를 대시보드에 게시
- **커뮤니티**: 좋아요와 태그로 콘텐츠 발견
- **투명성**: Base 블록체인 기반 지갑 연동

---

## ✨ 주요 기능

### 💬 AI 채팅
- 랜덤 AI 모델 선택 (Qwen 30B Instruct, Qwen 235B Thinking 등)
- 실시간 스트리밍 응답 (타이핑 효과)
- 마크다운 렌더링 및 코드 블록 하이라이팅
- 채팅 히스토리 자동 저장
- 응답 복사 기능

### 📱 대시보드 (게시판)
- 프롬프트 공유 (제목 + 태그)
- 태그 기반 필터링
- 좋아요 시스템
- 게시글 삭제 (본인만 가능)
- 게시글 상세 보기

### 🏆 리더보드
- **모델 랭킹**: 채택률(게시된 수 / 전체 매치 수) 기반
- **유저 랭킹**: 좋아요 × 10 점수 기반
- 유저 클릭 시 인기 게시글 모달 표시

### 👤 프로필
- 유저 통계 (총 게시글, 좋아요, 점수, 레벨)
- 인기 공유 프롬프트 (좋아요 순)
- USDC 잔액 조회
- Base 네트워크 정보

### 🔐 지갑 연결
- Privy를 통한 간편한 지갑 연결
- 이메일/소셜 로그인 지원
- Base Mainnet & Sepolia 지원

---

## 🛠 기술 스택

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS + @tailwindcss/typography
- **Components**: Radix UI + Lucide Icons
- **Language**: TypeScript 5
- **Markdown**: react-markdown + remark-gfm

### Backend
- **Runtime**: Node.js + Express.js
- **Database**: PostgreSQL + Prisma ORM 6
- **AI API**: Flock AI (Streaming 지원)
- **Language**: TypeScript 5

### Web3
- **Authentication**: Privy
- **Blockchain**: Base (L2)
- **Wallet Integration**: Wagmi + Viem

### Development
- **Package Manager**: pnpm (Frontend), npm (Backend)
- **Dev Tools**: ts-node-dev
- **Version Control**: Git

---

## 🚀 시작하기

### 필수 요구사항

- Node.js 20+
- PostgreSQL 14+
- pnpm 8+
- Git

### 백엔드 설정

```bash
# 백엔드 디렉토리로 이동
cd backend

# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일을 열어 실제 값을 입력하세요

# 데이터베이스 마이그레이션
npx prisma migrate dev

# 개발 서버 실행
npm run dev
```

### 프론트엔드 설정

```bash
# 프론트엔드 디렉토리로 이동
cd frontend

# 의존성 설치
pnpm install

# 환경변수 설정
cp env.template .env.local
# .env.local 파일을 열어 실제 값을 입력하세요

# 개발 서버 실행
pnpm dev
```

### 환경변수 설정

**Backend (.env)**
```env
DATABASE_URL="postgresql://username:password@localhost:5433/lmarena"
FLOCK_API_KEY=your_flock_api_key
PORT=4000
```

**Frontend (.env.local)**
```env
# Privy App ID (필수)
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:4000

# WalletConnect Project ID (선택)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_id
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

---

## 📁 프로젝트 구조

```
lmarena/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # 데이터베이스 스키마
│   │   ├── seed.ts              # 초기 데이터
│   │   └── migrations/          # 마이그레이션 파일
│   ├── src/
│   │   ├── modules/
│   │   │   ├── arena/           # 채팅 & 게시글 API
│   │   │   ├── posts/           # 게시글 CRUD
│   │   │   ├── leaderboard/     # 랭킹 시스템
│   │   │   ├── users/           # 유저 프로필
│   │   │   └── mock/            # 테스트용 Mock API
│   │   ├── lib/
│   │   │   ├── flock.ts         # Flock AI 클라이언트
│   │   │   └── prisma.ts        # Prisma 클라이언트
│   │   ├── app.ts               # Express 앱 설정
│   │   └── index.ts             # 서버 진입점
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── components/
│   │   │   ├── ui/              # Radix UI 컴포넌트
│   │   │   ├── HomePage.tsx     # AI 채팅 페이지
│   │   │   ├── DashboardPage.tsx # 게시판
│   │   │   ├── ConversationPage.tsx # 게시글 상세
│   │   │   ├── LeaderboardPage.tsx # 랭킹
│   │   │   ├── ProfilePage.tsx  # 프로필
│   │   │   ├── CodeBlock.tsx    # 코드 블록 컴포넌트
│   │   │   └── WalletButton.tsx # 지갑 연결
│   │   ├── hooks/
│   │   │   ├── use-wallet.ts
│   │   │   └── use-deposit-pool.ts
│   │   ├── providers/
│   │   │   └── providers.tsx    # Privy Provider
│   │   ├── store/
│   │   │   └── wallet-store.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/
│   │   ├── api.ts               # API 클라이언트
│   │   └── utils.ts
│   └── package.json
└── README.md
```

---

## 📖 API 문서

### Arena API
- `POST /arena/chat` - AI 채팅 생성
- `POST /arena/chat/stream` - 스트리밍 채팅 (SSE)
- `POST /arena/post` - 게시글 작성

### Posts API
- `GET /posts` - 게시글 목록
- `GET /posts/:id` - 게시글 상세
- `POST /posts/:id/like` - 좋아요 토글
- `DELETE /posts/:id` - 게시글 삭제

### Leaderboard API
- `GET /leaderboard/models` - 모델 랭킹
- `GET /leaderboard/users` - 유저 랭킹

### Users API
- `GET /users/:walletAddress/profile` - 유저 프로필

---

## 🗄️ 데이터베이스 스키마

주요 테이블:
- **Model**: AI 모델 정보
- **User**: 유저 정보 (walletAddress 기반)
- **Prompt**: 프롬프트 텍스트
- **Match**: 채팅 세션 (모델 + 프롬프트)
- **Response**: AI 응답
- **Post**: 공유된 게시글
- **PostLike**: 좋아요 기록
- **Tag**: 태그
- **PostTag**: 게시글-태그 관계

---

## 🔧 주요 명령어

### Frontend
```bash
pnpm dev          # 개발 서버
pnpm build        # 프로덕션 빌드
pnpm lint         # 린트 검사
```

### Backend
```bash
npm run dev       # 개발 서버
npx prisma studio # DB GUI
npx prisma migrate dev # 마이그레이션
```

---

## 🎯 주요 기능 상세

### 1. AI 채팅 시스템
- **랜덤 모델 선택**: 각 채팅마다 랜덤으로 AI 모델 선택
- **실시간 스트리밍**: Server-Sent Events(SSE)로 실시간 응답
- **마크다운 지원**: 코드 블록, 테이블, 리스트 등 완벽 렌더링
- **코드 복사**: 코드 블록에 원클릭 복사 버튼
- **히스토리 저장**: localStorage에 자동 저장

### 2. 게시글 시스템
- **제목 필수**: 1-100자 제한
- **태그 시스템**: #태그 형식으로 입력 (공백/쉼표 구분)
- **필터링**: 태그 클릭으로 필터링
- **좋아요**: 로그인 유저만 가능, 토글 방식
- **삭제 권한**: 작성자만 삭제 가능

### 3. 랭킹 시스템
- **모델 랭킹**
  - 채택률 = (게시된 수 / 전체 매치 수) × 100
  - 채택률 높은 순으로 정렬
- **유저 랭킹**
  - 점수 = 총 좋아요 수 × 10
  - 점수 높은 순으로 정렬
  - 지갑 주소 클릭 → 인기 게시글 모달

### 4. 프로필 페이지
- **유저 통계**: 총 게시글, 좋아요, 점수, 레벨
- **인기 게시글**: 좋아요 순으로 정렬된 본인 게시글 상위 10개
- **지갑 정보**: USDC 잔액, 네트워크 상태, 주소 복사

---

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참고하세요.

---

## 🔗 링크

- **Base Chain**: [base.org](https://base.org/)
- **Privy**: [privy.io](https://privy.io/)
- **Flock AI**: [flock.io](https://flock.io/)

---

**Made with ❤️ on Base**