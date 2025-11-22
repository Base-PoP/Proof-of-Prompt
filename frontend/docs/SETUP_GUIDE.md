# LM Arena 설정 및 실행 가이드

이 가이드는 백엔드와 프론트엔드를 연결하여 LM Arena를 실행하는 방법을 안내합니다.

## 📋 사전 요구사항

시작하기 전에 다음 항목들이 설치되어 있어야 합니다:

- **Node.js** 20.0.0 이상
- **pnpm** 8.0.0 이상
- **PostgreSQL** 14 이상
- **Git**

### Windows 환경에서 설치

```powershell
# Node.js 설치
winget install -e --id OpenJS.NodeJS.LTS

# pnpm 설치
npm install -g pnpm

# PostgreSQL 설치
winget install -e --id PostgreSQL.PostgreSQL
```

## 🚀 빠른 시작

### 1단계: 환경 변수 설정

프로젝트 루트에서 다음 스크립트를 실행하세요:

**Windows (PowerShell):**
```powershell
.\scripts\setup-env.ps1
```

**Linux/Mac (Bash):**
```bash
chmod +x scripts/setup-env.sh
./scripts/setup-env.sh
```

이 스크립트는 다음 파일들을 생성합니다:
- `backend/.env` - 백엔드 환경 변수
- `frontend/.env.local` - 프론트엔드 환경 변수

### 2단계: 데이터베이스 연결 정보 설정

`backend/.env` 파일을 열고 PostgreSQL 연결 정보를 입력하세요:

```env
DATABASE_URL="postgresql://사용자명:비밀번호@localhost:5432/lmarena?schema=public"
```

**예시:**
```env
DATABASE_URL="postgresql://postgres:mypassword@localhost:5432/lmarena?schema=public"
```

### 3단계: PostgreSQL 데이터베이스 생성

PostgreSQL에 접속하여 데이터베이스를 생성하세요:

```powershell
# PostgreSQL에 접속
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE lmarena;

# 종료
\q
```

### 4단계: 의존성 설치

**백엔드:**
```powershell
cd backend
npm install
```

**프론트엔드:**
```powershell
cd frontend
pnpm install
```

### 5단계: 데이터베이스 초기화

백엔드 디렉토리에서 다음 명령어를 실행하세요:

```powershell
cd backend

# Prisma 마이그레이션 실행 및 시드 데이터 생성
npm run db:setup
```

이 명령어는 다음 작업을 수행합니다:
- 데이터베이스 스키마 생성 (테이블, 관계 등)
- 샘플 AI 모델 데이터 추가 (GPT-4, Claude 3, Gemini Pro 등)
- 테스트 사용자 생성

### 6단계: 애플리케이션 실행

두 개의 터미널을 열어서 각각 백엔드와 프론트엔드를 실행하세요:

**터미널 1 - 백엔드:**
```powershell
cd backend
npm run dev
```

백엔드 서버가 http://localhost:4000 에서 실행됩니다.

**터미널 2 - 프론트엔드:**
```powershell
cd frontend
pnpm dev
```

프론트엔드 서버가 http://localhost:3000 에서 실행됩니다.

## 🧪 동작 확인

### API 헬스 체크

브라우저나 curl을 사용하여 백엔드 API가 정상 작동하는지 확인하세요:

```powershell
curl http://localhost:4000/health
```

**예상 응답:**
```json
{"ok":true}
```

### 모델 리스트 확인

```powershell
curl http://localhost:4000/leaderboard/models
```

**예상 응답:**
```json
[
  {
    "id": 1,
    "name": "GPT-4",
    "provider": "OpenAI",
    "responsesCount": 0
  },
  ...
]
```

### 프론트엔드 확인

1. 브라우저에서 http://localhost:3000 접속
2. Battle 페이지에서 질문 입력
3. "Start Battle" 클릭
4. 두 AI의 응답 확인
5. 투표 버튼 클릭하여 투표
6. Leaderboard 페이지에서 모델 순위 확인

## 📁 프로젝트 구조

```
Lmarena/
├── backend/                 # Express 백엔드 서버
│   ├── src/
│   │   ├── modules/
│   │   │   ├── arena/      # 배틀 매치 관리
│   │   │   └── leaderboard/ # 리더보드 관리
│   │   ├── config/         # 환경 설정
│   │   ├── lib/            # Prisma 클라이언트
│   │   └── index.ts        # 서버 진입점
│   ├── prisma/
│   │   ├── schema.prisma   # 데이터베이스 스키마
│   │   └── seed.ts         # 시드 데이터
│   └── .env                # 환경 변수
│
├── frontend/               # Next.js 프론트엔드
│   ├── app/
│   │   ├── components/
│   │   │   ├── BattlePage.tsx      # 배틀 페이지
│   │   │   └── LeaderboardPage.tsx # 리더보드 페이지
│   │   └── page.tsx        # 메인 페이지
│   ├── lib/
│   │   └── api/
│   │       └── client.ts   # API 클라이언트
│   └── .env.local          # 환경 변수
│
└── scripts/                # 설정 스크립트
    ├── setup-env.ps1       # Windows 환경 설정
    └── setup-env.sh        # Linux/Mac 환경 설정
```

## 🔧 주요 API 엔드포인트

### 배틀 관련

**POST /arena/match**
- 새로운 배틀 매치 생성
- Body: `{ "prompt": "질문 내용" }`
- Response: 매치 ID, 두 AI의 응답

**POST /arena/vote**
- 매치에 투표
- Body: `{ "matchId": 1, "chosen": "A" }` 또는 `"B"`
- Response: `{ "ok": true }`

### 리더보드 관련

**GET /leaderboard/models**
- 모델 순위 목록 조회
- Response: 모델 배열 (id, name, provider, responsesCount)

## 🛠️ 유용한 명령어

### 데이터베이스 관리

```powershell
# Prisma Studio 실행 (GUI 데이터베이스 관리 도구)
cd backend
npm run prisma:studio

# 새로운 마이그레이션 생성
npm run prisma:migrate

# 시드 데이터 재생성
npm run prisma:seed
```

### 개발 도구

```powershell
# 백엔드 빌드
cd backend
npm run build

# 프론트엔드 빌드
cd frontend
pnpm build

# 프론트엔드 프로덕션 실행
pnpm start
```

## ❗ 문제 해결

### 포트가 이미 사용 중인 경우

**백엔드 (포트 4000):**
```powershell
# 포트 사용 프로세스 확인
netstat -ano | findstr :4000

# 프로세스 종료 (PID를 위 명령어 결과에서 확인)
taskkill /PID <PID> /F
```

**프론트엔드 (포트 3000):**
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### 데이터베이스 연결 오류

1. PostgreSQL 서비스가 실행 중인지 확인
2. `backend/.env`의 `DATABASE_URL` 정보 확인
3. 데이터베이스 사용자 권한 확인

```powershell
# PostgreSQL 서비스 상태 확인
Get-Service postgresql*

# 서비스 시작
Start-Service postgresql-x64-14
```

### Prisma 마이그레이션 오류

데이터베이스를 초기화하고 다시 시작:

```powershell
cd backend

# 기존 마이그레이션 삭제
Remove-Item -Recurse -Force prisma\migrations

# 데이터베이스 리셋
npx prisma migrate reset

# 다시 설정
npm run db:setup
```

### CORS 오류

프론트엔드에서 API 호출 시 CORS 오류가 발생하면:

1. 백엔드가 포트 4000에서 실행 중인지 확인
2. `frontend/.env.local`의 `NEXT_PUBLIC_API_URL` 확인
3. 브라우저 개발자 도구의 콘솔에서 에러 메시지 확인

## 📚 다음 단계

기본 설정이 완료되었습니다! 이제 다음 기능들을 추가할 수 있습니다:

1. **실제 AI 모델 연동**
   - OpenAI, Anthropic, Google API 키 설정
   - `backend/src/modules/arena/arena.service.ts`의 `callModel` 함수 구현

2. **ELO 랭킹 시스템**
   - `backend/src/modules/arena/elo.ts` 파일에 ELO 계산 로직 구현
   - 투표 후 모델 ELO 점수 업데이트

3. **사용자 인증**
   - Privy 설정하여 지갑 연동
   - 익명 투표 대신 사용자별 투표 추적

4. **블록체인 통합**
   - Base 네트워크에 스마트 컨트랙트 배포
   - 투표 결과를 온체인에 기록

## 🤝 기여 및 문의

문제가 발생하거나 기능 제안이 있으시면 이슈를 생성해주세요.

---

**Happy Coding! 🚀**

