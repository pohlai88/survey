# Repository Guidelines

## Project Structure & Module Organization

- `frontend/` contains the client and admin portal UI. Main entrypoints are `main.tsx`, `App.tsx`, and routed pages under `pages/`.
- `frontend/hooks/backend/` contains typed frontend hooks that call backend operations through the runtime bridge.
- `frontend/lib/shadcn/` contains shared UI primitives; keep page code thin and reuse these components.
- `backend/` contains Retool-backed server logic grouped by domain: `admin/`, `client/`, `clients/`, `declarations/`, `questions/`, and `_shared/`.
- `docs/architecture/` contains the target-state architecture document. Update it when system boundaries or major flows change.

## Build, Test, and Development Commands

- `pnpm run preflight` runs the required gate: API checks, typecheck, production build, and Playwright E2E.
- `pnpm run dev` starts the Vite dev server for the standalone frontend.
- `pnpm run typecheck` runs TypeScript validation.
- `pnpm run build` builds the frontend for production.
- `pnpm run test:api` verifies API boundary behavior, contracts, resource usage, and runtime bridge gating.
- `pnpm run test:e2e` runs Playwright portal smoke workflows.

## Coding Style & Naming Conventions

- Use TypeScript throughout; prefer explicit types over `any`.
- Use 2-space indentation and keep code ASCII unless an existing file requires otherwise.
- Components use `PascalCase` filenames, hooks use `useXxx`, utility files use `camelCase`.
- Prefer small shared helpers in `backend/_shared/` and `frontend/lib/` over duplicating logic across pages or handlers.
- Use immutable state updates in React and early returns in backend handlers.

## Testing Guidelines

- API verification scripts live in `frontend/scripts/` and are wired through `pnpm run test:api`.
- Playwright E2E tests live in `frontend/e2e/`; keep workflow tests named by user-visible behavior.
- Run `pnpm run preflight` before handing off changes.

## Commit & Pull Request Guidelines

- No strict project-specific commit convention is enforced; use conventional, imperative messages such as `fix auth password hashing` or `add question-set selector`.
- Keep commits focused by subsystem.
- PRs should include: summary, affected flows, validation performed, screenshots for UI changes, and any architecture gaps left open.

## Security & Architecture Notes

- Do not reintroduce plaintext passwords, client-trusted identity fields, or local-storage-only auth assumptions.
- Prefer trusted `client_id`-based backend resolution over user-supplied names/emails.
- If a change affects workflow boundaries, review `docs/architecture/client-declaration-portal-target-architecture.md` and update it if needed.
