# Repository Guidelines

## Project Structure & Module Organization

This repository is an npm workspace containing two applications:

- `apps/api/` — CommonJS TypeScript/Express backend. HTTP routes are in `src/routes/`, shared server helpers are in `src/`, and database models/migrations live under `prisma/`.
- `apps/web/` — React 19 + TypeScript frontend built with Vite. Pages are in `src/pages/`, reusable UI is in `src/components/`, and static files are in `public/`.
- Root `package.json` — workspace-level development and build shortcuts.

Keep backend-only logic and Prisma changes in `apps/api`; keep browser/UI code in `apps/web`. Do not commit generated `dist/`, local database files, or environment files.

## Build, Test, and Development Commands

Run `npm install` from the repository root to install workspace dependencies.

- `npm run dev:api` — start the API with `tsx` watch mode.
- `npm run dev:web` — start the Vite development server.
- `npm run build:api` — type-check/compile the API and regenerate the Prisma client.
- `npm run build:web` — run the frontend TypeScript build and create the Vite production bundle.
- `npm run lint --workspace=apps/web` — run Oxlint on the frontend.
- `npm run prisma:migrate --workspace=apps/api` — create/apply a development migration; use `prisma:deploy` for deployment environments.

The API expects its environment configuration (including database and Telegram settings) through ignored `.env` files. Review existing code before adding new variables.

## Coding Style & Naming Conventions

Use strict TypeScript and two-space indentation. Prefer small, focused modules and explicit types at API boundaries. Name React components and pages in PascalCase (`LeagueDetailPage.tsx`), functions and variables in camelCase, and route files in lowercase descriptive names (`matches.ts`). Follow existing import ordering and JSX formatting; run the web linter before submitting frontend changes. No repository-wide formatter is configured, so preserve surrounding style.

## Testing Guidelines

No automated test suite is currently committed. For every change, run the relevant build command and, for frontend work, `npm run lint --workspace=apps/web`. Exercise affected API routes and user flows locally, especially authentication, league membership, fixture/result updates, and Prisma migrations.

## Commit & Pull Request Guidelines

Recent commits use short, imperative, sentence-style subjects (for example, `Add ...`, `Fix ...`, `Switch ...`) without ticket prefixes. Keep commits focused and describe the user-visible or schema impact. Pull requests should include a concise summary, validation commands/results, migration or environment notes, and screenshots or a short screen recording for UI changes. Link the related issue when one exists and call out any follow-up work or deployment considerations.
