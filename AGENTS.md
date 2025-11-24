# Repository Guidelines

## Project Structure & Module Organization
- Backend: `backend/` (Express + TypeScript). 핵심 로직 `src/modules`(arena, leaderboard), 설정 `src/config`, Prisma 클라이언트 `src/lib`, 스키마/시드 `prisma/`.
- Frontend: `frontend/` (Next.js 15 + Tailwind). 페이지/컴포넌트 `app/`, API 헬퍼 `lib/api/`, 에셋 `public/`, 전역 스타일 `app/globals.css`.
- 문서: `docs/`에 환경 준비와 제품 노트. 환경 설정은 `docs/SETUP_GUIDE.md` 우선 확인.

## Build, Test, and Development Commands
- Backend 개발: `cd backend && npm install && npm run dev` (포트 4000, hot reload).
- Backend 프로덕션: `npm run build && npm start`.
- DB 리셋/시드: `npm run db:reset` (Prisma push + seed), 스키마 변경 시 `npx prisma migrate dev`.
- Frontend 개발: `cd frontend && pnpm install && pnpm dev` (포트 3000).
- Frontend 프로덕션: `pnpm build && pnpm start`.
- Lint: `cd frontend && pnpm lint`.

## Coding Style & Naming Conventions
- 언어: TypeScript 전반, 2-space 인덴트, 작은따옴표 선호.
- 명명: 컴포넌트/모듈 PascalCase(`WalletButton.tsx`), hooks/utils는 camelCase.
- Prisma 모델은 `prisma/schema.prisma`와 동기화. 불필요한 export/임포트 정리, Tailwind 클래스 일관 유지.

## Testing Guidelines
- 자동 테스트는 준비 중. 백엔드 헬스 체크: `curl http://localhost:4000/health`.
- DB 변경 후 `npm run db:reset`으로 스키마/시드 재적용.
- 테스트 추가 시 기능 폴더에 인접 배치(e.g., `src/modules/arena/__tests__`), 프론트는 RTL/Playwright 선택.

## Commit & Pull Request Guidelines
- 커밋: Conventional Commit 패턴(`feat: ...`, `fix: ...`, `chore: ...`) 유지, scope는 간결히.
- PR: 변경 동작 요약, DB 마이그레이션 여부, 수동 테스트 메모 포함. UI 변경 시 스크린샷/녹화 첨부, 관련 이슈 링크, 새 env 변수/스크립트 명시.

## Security & Configuration Tips
- 비밀정보는 `.env`/`.env.local`에만 저장, Git에는 포함 금지.
- Prisma 마이그레이션 적용 전 리뷰 필수, 스키마 변경 시 프론트 타입/API 응답도 함께 점검.
