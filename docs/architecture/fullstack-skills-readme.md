# Full-Stack Skills README

## Context

This document defines the minimum non-CI/CD skill set required to ship the Client Declaration Portal as a real application rather than a Retool-coupled prototype. It is for engineers and maintainers deciding which skills are mandatory for MVP delivery and which are optional hardening layers.

This document is normative for skill usage. It does not claim the current codebase already meets the minimum shipping bar.

## What "MVP" Means in This Repo

`MVP` here means the minimum full-stack capability required to ship the portal safely:

- a standalone frontend surface for admin and client workflows
- a backend-owned API and trust boundary
- server-trusted authentication and session handling
- validated declaration, assignment, and onboarding mutations
- secure file upload and download handling
- server-side authorization for admin actions
- notifications for invitation and workflow-critical events
- auditability and enough operational visibility to support the app
- local verification for the primary user journeys

Anything required to satisfy those items is `MVP`, even if the skill name sounds broader than the first release scope.

## Minimum Shipping Requirements and Required Skills

| Requirement | Why it is mandatory | Current repo evidence | Required skill | Current state |
|---|---|---|---|---|
| Standalone app surfaces | The portal needs real admin and client UIs outside Retool page coupling. | `frontend/pages/*`, `frontend/App.tsx`, `frontend/package.json` | `fullstack-guardian` | Substantially present |
| Backend application boundary | The app needs domain APIs for `auth`, `clients`, `declarations`, `questions`, `assignments`, `files`, and `admin`. | `backend/*`, root `package.json` still shows Retool resource coupling | `api-design-principles` | Partial |
| Server-trusted auth and sessions | Browser `localStorage` cannot be the source of truth for identity. | `frontend/hooks/useClientAuth.tsx` | `two-factor-authentication-best-practices` | Partial |
| Request and mutation validation | Onboarding, assignment, review, and declaration writes must validate at the backend edge. | backend handlers contain ad hoc checks; no shared schema layer | `zod-schema-validation` | Partial |
| Secure evidence lifecycle | Evidence files need authorized upload, finalize, and download semantics. | `backend/declarations/uploadDeclarationFile.ts`, file upload from frontend base64 flows | `fullstack-guardian` | Partial |
| Server-side admin authorization | Review, assignment, invitation, and configuration changes must be role-enforced. | `backend/user.d.ts`, admin handlers, no visible end-to-end RBAC enforcement | `two-factor-authentication-best-practices` | Missing |
| Workflow-critical notifications | Invitation and review-related communication cannot remain UI-only behavior. | `backend/admin/inviteClient.ts`, `backend/admin/resendInvitation.ts` | `fullstack-guardian` | Partial |
| Audit and observability | Production support requires actor history and operational signals. | no dedicated audit model or observability layer in repo | `fullstack-guardian` | Missing |
| Journey verification | Shipping requires repeatable validation of invite, onboarding, submission, and review flows. | `frontend/package.json` has `build` and `typecheck`; no checked-in E2E tests | `playwright-best-practices` | Partial |

## MVP Skill Bundle

These skills are mandatory for a shippable portal.

- `fullstack-guardian`
  - Label: `MVP`
  - Use for: cross-layer gap closure, file lifecycle, audit boundary, workflow completion
- `api-design-principles`
  - Label: `MVP`
  - Use for: normalizing domain APIs and removing page-coupled backend behavior
- `two-factor-authentication-best-practices`
  - Label: `MVP`
  - Use for: server-managed sessions, trust boundaries, privileged action protection
  - Note: MFA is optional for MVP; session integrity is not
- `zod-schema-validation`
  - Label: `MVP`
  - Use for: schema enforcement on backend inputs and mutation contracts
- `coding-standards`
  - Label: `MVP`
  - Use for: keeping the integration work DRY and consistent
- `code-quality`
  - Label: `MVP`
  - Use for: correctness review across backend and shared logic
- `playwright-best-practices`
  - Label: `MVP`
  - Use for: verifying the main business flows before release

## Enterprise-Only Skills

These are useful, but they are not the minimum bar for first shipment.

- `fullstack-developer`
  - Label: `Enterprise`
  - Use when broader product-to-platform expansion is needed
- `api-and-interface-design`
  - Label: `Enterprise`
  - Use when the API is already real and needs secondary refinement
- `pino-logging-setup`
  - Label: `Enterprise`
  - Use when observability is being hardened beyond the minimum viable event/log layer
- `email-best-practices`
  - Label: `Enterprise`
  - Use when notification templates, retries, and provider abstraction are being formalized
- `react-testing-patterns`
  - Label: `Enterprise`
  - Use when component and hook coverage becomes a separate workstream
- `e2e-testing-patterns`
  - Label: `Enterprise`
  - Use when the repo needs broader scenario matrices beyond the first critical Playwright flows
- `documentation-audit`
  - Label: `Enterprise`
  - Use when implementation drift across docs becomes material

## Dog Shit

For this repo, `Dog Shit` means a skill is redundant, off-target, or adds ceremony without closing a real MVP gap.

- None of the selected skills are currently `Dog Shit`.

## Current Completeness Against the MVP Skill Baseline

Current state is not yet shippable against the full MVP baseline.

- Substantially present: 1. standalone frontend surfaces, 2. core domain workflow coverage in code
- Partial: 1. backend API boundary, 2. auth/session integrity, 3. backend validation, 4. file lifecycle, 5. notifications, 6. release verification
- Missing: 1. server-side RBAC, 2. audit and observability

Practical reading:

- the repo is beyond prototype-only UI work
- the repo is not yet a fully integrated production portal
- auth trust, authorization, auditability, and file lifecycle remain the highest-risk blockers to shipment

## Explicit Non-MVP Items

These are intentionally excluded from the MVP bundle for this document:

- CI/CD design and workflow automation
- mandatory MFA rollout
- advanced tracing and enterprise incident tooling
- deep notification provider abstraction beyond the first required workflow events
- migration planning from Retool to target-state deployment

## Recommended Order

1. `api-design-principles`
2. `two-factor-authentication-best-practices`
3. `fullstack-guardian`
4. `zod-schema-validation`
5. `playwright-best-practices`
6. Add enterprise-only skills only after the MVP baseline is actually met

## Notes

- The strongest current evidence of non-MVP behavior is the browser-stored auth state in `frontend/hooks/useClientAuth.tsx` and the Retool-coupled runtime declared in the root `package.json`.
- The strongest current evidence of incomplete evidence handling is `backend/declarations/uploadDeclarationFile.ts`, which validates uploads but does not implement a full authorized upload/finalize/download contract.
- Use this document with [client-declaration-portal-target-architecture.md](C:/JackProject/afenda-bolt/Client-Declaration-Login/docs/architecture/client-declaration-portal-target-architecture.md), [fullstack-skill-bundle.md](C:/JackProject/afenda-bolt/Client-Declaration-Login/docs/architecture/fullstack-skill-bundle.md), and [fullstack-implementation-sequence.md](C:/JackProject/afenda-bolt/Client-Declaration-Login/docs/architecture/fullstack-implementation-sequence.md).
