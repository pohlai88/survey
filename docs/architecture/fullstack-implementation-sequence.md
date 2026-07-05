# Full-Stack Implementation Sequence

## Purpose

This document turns the selected skill bundles into an execution order for this repository. It is intended for engineers implementing the next full-stack iteration of the Client Declaration Portal.

The objective is to close the highest-risk gaps first without over-engineering the initial delivery scope.

For implementation planning, use the newer slice-based roadmap as the controlling artifact: [Client Declaration Portal Implementation Roadmap](C:/JackProject/afenda-bolt/Client-Declaration-Login/docs/roadmap/client-declaration-portal-roadmap.md). This file remains a coarse historical sequence and skill-bundle companion.

## Phase 1: Stabilize the Core Delivery Boundary

### Skills

- `api-design-principles`
- `coding-standards`
- `code-quality`

### Repo work

- Define the standalone domain API boundary for:
  - `auth`
  - `clients`
  - `declarations`
  - `questions`
  - `assignments`
  - `files`
  - `admin`
- Remove page-coupled assumptions from frontend/backend integration where possible.
- Normalize request/response shapes and backend error handling.

### Outcome

- The app has a coherent API shape instead of fragmented page-action coupling.

## Phase 2: Fix Trust and Authentication

### Skills

- `two-factor-authentication-best-practices`
- `zod-schema-validation`

### Repo work

- Replace browser-trusted auth state with a server-managed session model.
- Keep password hashing, then add session issuance, revocation, and validation.
- Validate auth-related and mutation inputs at the backend edge.
- Bind reviewer/admin identity to authenticated actor context.

### Outcome

- The portal has a real trust boundary and no longer depends on local-storage-only auth assumptions.

## Phase 3: Complete Core Full-Stack Flows

### Skills

- `fullstack-guardian`
- `playwright-best-practices`

### Repo work

- Complete the full flow:
  - invite
  - accept invite
  - onboarding
  - assignment
  - declaration submission
  - admin review
- Introduce signed or server-authorized file upload/download lifecycle.
- Add Playwright coverage for one happy path per core business flow.

### Outcome

- Core delivery flows work end to end with real verification.

## Phase 4: Enterprise Hardening

### Skills

- `api-and-interface-design`
- `fullstack-developer`
- `pino-logging-setup`
- `email-best-practices`
- `documentation-audit`
- `react-testing-patterns`
- `e2e-testing-patterns`

### Repo work

- Refine API contracts and interface consistency.
- Add structured logging, audit-event capture, and notification abstraction.
- Expand frontend and end-to-end coverage.
- Reconcile implementation with architecture docs after each boundary change.

### Outcome

- The system moves from core delivery readiness to operational durability.

## Recommended Order

1. API boundary
2. Session/auth boundary
3. File and submission lifecycle
4. End-to-end verification
5. Observability and notification hardening
6. Documentation reconciliation

## Do Not Skip

- Server-managed sessions
- Backend validation
- Authenticated file access
- End-to-end flow verification
- Architecture/doc updates when boundaries change

## Notes

- This sequence intentionally excludes CI/CD work.
- Use this with [fullstack-skills-readme.md](C:/JackProject/afenda-bolt/Client-Declaration-Login/docs/architecture/fullstack-skills-readme.md), [fullstack-skill-bundle.md](C:/JackProject/afenda-bolt/Client-Declaration-Login/docs/architecture/fullstack-skill-bundle.md), and [client-declaration-portal-target-architecture.md](C:/JackProject/afenda-bolt/Client-Declaration-Login/docs/architecture/client-declaration-portal-target-architecture.md).

## Current Implementation Status

This section is descriptive of the current codebase after the latest MVP stabilization pass. It is not the target state.

### Phase 1: Stabilize the Core Delivery Boundary

- Status: `Partial`
- Done:
  - frontend runtime supports standalone `/api/...` invocation and gates Retool or injected backend browser bridges outside development
  - client-facing flows now use a more coherent auth/session boundary instead of passing browser-owned identity into mutations
  - shared validation helpers were introduced for critical auth and submission entry points
- Still open:
  - the backend still exposes operation-style handlers rather than a formal standalone API/BFF surface
  - error responses are normalized in the frontend runtime, but backend contracts are not yet fully serialized into one shared response envelope

### Phase 2: Fix Trust and Authentication

- Status: `Substantially Complete for MVP, with one important gap`
- Done:
  - browser-stored client identity was replaced with a same-site client session cookie carrying an opaque session token
  - backend-managed client sessions were added through `backend/_shared/clientSession.ts`
  - login and invitation acceptance now issue server-resolved sessions
  - onboarding, assignment, declaration submission, and file upload now resolve the acting client from the backend session instead of trusting `client_id`, `client_name`, or `client_email` from the browser
  - dynamic onboarding profile submission now validates required fields and allowed select values server-side
- Still open:
  - sessions are not yet issued through secure HTTP-only cookies from a dedicated server response; the current MVP implementation uses a frontend-managed same-site cookie carrying the opaque session token

### Phase 3: Complete Core Full-Stack Flows

- Status: `Partial`
- Done:
  - file uploads are now bound to the authenticated client through `evidence_files` metadata
  - declaration and assignment submission validate uploaded file ownership before linking evidence to a declaration
  - uploaded evidence now persists storage URL metadata and declaration review opens evidence through a backend authorization step with audit logging
  - audit events are emitted for session creation/revocation, profile completion, file upload, declaration submission, assignment submission, and reviewer feedback
  - workflow events and notification outbox records are now persisted through `backend/_shared/workflow.ts`
  - invitation, invitation resend, assignment issuance, assignment submission, declaration submission, and review outcome flows now emit workflow events, and client-facing notifications are queued durably before or alongside delivery
  - reviewer feedback now prefers authenticated admin identity and no longer requires typed reviewer identity in the UI
  - Playwright smoke coverage now verifies invite acceptance, onboarding, client dashboard assignment submission, self-service declaration submission with evidence upload, and admin review feedback
- Still open:
  - there is still no fully signed or proxy-enforced authenticated file download contract; the current implementation authorizes access in the app layer and then returns the stored backend-managed file URL
  - workflow dispatch still executes in-process; there is not yet a separate async worker or scheduler consuming the outbox

### Phase 4: Enterprise Hardening

- Status: `Not Started by design`
- Notes:
  - structured logging provider setup, full notification abstraction, broader frontend test coverage, and deeper observability remain outside this MVP-focused pass

## MVP Completeness Summary

- Complete enough to move forward: client session ownership, server-resolved client identity, backend profile validation, evidence ownership enforcement, critical audit capture
- Still blocking the ideal target architecture but no longer the basic MVP implementation path: HTTP-only session issuance and a separate async workflow runner beyond in-process outbox dispatch
