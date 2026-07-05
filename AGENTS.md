# Repository Guidelines

## Project Structure & Module Organization

- `frontend/` contains the client and admin portal UI. Main entrypoints are `main.tsx`, `App.tsx`, and routed pages under `pages/`.
- `frontend/hooks/backend/` contains typed frontend hooks that call backend operations through the runtime bridge.
- `frontend/lib/shadcn/` contains shared UI primitives; keep page code thin and reuse these components.
- `backend/` contains Retool-backed server logic grouped by domain: `admin/`, `client/`, `clients/`, `declarations/`, `questions/`, and `_shared/`.
- `docs/architecture/` contains the target-state architecture document. Update it when system boundaries or major flows change.

## Build, Test, and Development Commands

- `pnpm -C frontend dev` runs the Vite dev server for the standalone frontend.
- `node frontend/node_modules/typescript/bin/tsc --noEmit -p frontend/tsconfig.json` runs TypeScript validation.
- `node frontend/node_modules/vite/bin/vite.js build --config frontend/vite.config.ts` builds the frontend for production.
- `pnpm -C frontend build` should work in a normal environment, but this workspace may block `pnpm` on ignored build-script approval.

## Coding Style & Naming Conventions

- Use TypeScript throughout; prefer explicit types over `any`.
- Use 2-space indentation and keep code ASCII unless an existing file requires otherwise.
- Components use `PascalCase` filenames, hooks use `useXxx`, utility files use `camelCase`.
- Prefer small shared helpers in `backend/_shared/` and `frontend/lib/` over duplicating logic across pages or handlers.
- Use immutable state updates in React and early returns in backend handlers.

## Testing Guidelines

- No test suite is currently checked in; minimum validation is successful typecheck and production build.
- When adding tests, place frontend tests beside the feature or under `frontend/__tests__/`.
- Use descriptive names such as `returns error when assignment is not pending`.

## Commit & Pull Request Guidelines

- This workspace does not include Git metadata, so follow conventional, imperative commit messages: `fix auth password hashing`, `add question-set selector`.
- Keep commits focused by subsystem.
- PRs should include: summary, affected flows, validation performed, screenshots for UI changes, and any architecture gaps left open.

## Security & Architecture Notes

- Do not reintroduce plaintext passwords, client-trusted identity fields, or local-storage-only auth assumptions.
- Prefer trusted `client_id`-based backend resolution over user-supplied names/emails.
- If a change affects workflow boundaries, review `docs/architecture/client-declaration-portal-target-architecture.md` and update it if needed.
