# Repository Guidelines

## Project Structure & Module Organization
- Backend: `backend/` Express + TypeScript API. Core logic under `src/modules` (arena, leaderboard), config in `src/config`, Prisma client in `src/lib`, schema/seed in `prisma/`.
- Frontend: `frontend/` Next.js 15 with Tailwind. Pages and components live in `app/` (grouped by page), API helpers in `lib/api/`, assets in `public/`.
- Docs: `docs/` for product notes and setup; start with `docs/SETUP_GUIDE.md` for environment prep.

## Build, Test, and Development Commands
- Backend: `cd backend && npm install` then `npm run dev` (hot reload on :4000). Prod: `npm run build && npm start`. Database: `npm run db:reset` to push + seed; `npx prisma migrate dev` for schema changes.
- Frontend: `cd frontend && pnpm install` then `pnpm dev` (:3000). Prod: `pnpm build` and `pnpm start`. Lint: `pnpm lint`.
- Env: copy `.env.example` (backend) and `env.template` (frontend) or run `scripts/setup-env.sh`/`ps1` from repo root.

## Coding Style & Naming Conventions
- Language: TypeScript throughout; prefer 2-space indentation and single quotes as in existing files.
- Naming: components/modules in PascalCase (e.g., `WalletButton.tsx`); hooks/utils in camelCase.
- Keep Prisma models aligned with `prisma/schema.prisma`; order imports and remove unused exports. Run `pnpm lint` before pushing.

## Testing Guidelines
- No automated suite yet; validate backend with `curl http://localhost:4000/health` and feature endpoints after seeding.
- For DB changes, rerun `npm run db:reset`. When adding tests, co-locate in feature folders (e.g., `src/modules/arena/__tests__`) and favor integration coverage. Frontend tests can use Playwright/React Testing Library per component folder.

## Commit & Pull Request Guidelines
- Commits follow Conventional Commit prefixes seen in history (`feat:`, `fix:`, `chore:`) with concise scopes (e.g., `feat: add dashboard sorting options`).
- PRs should describe behavior changes, DB migrations, and manual test notes; link related issues and add screenshots/recordings for UI changes. Note any new env vars or scripts.

## Security & Configuration Tips
- Keep secrets out of Git; use `.env` and `.env.local`. Regenerate seeds only against local/dev databases.
- Review Prisma migrations before applying; coordinate schema changes with corresponding frontend types and API shapes.

## Language
- Please respond only in Korean