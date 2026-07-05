# Client Declaration Portal Implementation Roadmap

## Overview

This roadmap converts the target architecture into implementation slices for the Client Declaration Portal. It is written for engineers, architects, and operators who will turn the current frontend deployment and Retool-derived backend handlers into a production full-stack portal.

The roadmap is based on:

- [Target architecture](../architecture/client-declaration-portal-target-architecture.md)
- [Slice quality evaluation](slice-quality-evaluation.md)
- [Implementation completeness audit](implementation-completeness-audit.md)
- Current Vercel deployment evidence: frontend and same-origin `/api/...` routing are deployed, but backend resource adapters are missing.
- Repository-discovered workflows for invitation, onboarding, assignments, declaration submission, evidence upload, review, and configuration.

## Goals

- Deliver the portal in slices that are independently reviewable and testable.
- Close the production blockers identified in the architecture appendix.
- Preserve working frontend behavior while replacing platform-coupled runtime assumptions.
- Make every slice produce evidence: code, tests, deployment checks, or operational signals.

## Non-goals

- This roadmap does not prescribe a specific database, identity vendor, storage provider, or queue provider.
- This roadmap does not include CI/CD automation work.
- This roadmap does not define customer-facing help content or public API documentation.

## Slice Principles

- Each slice must leave the repo closer to a deployable production portal.
- Each slice must own one primary architectural boundary.
- Each slice must include rollback notes and validation evidence.
- Later slices may refine earlier implementation, but must not depend on undocumented behavior.

## KISS and DRY Rules

- Keep shared policy in this roadmap; keep slice files focused on slice-specific execution.
- Do not repeat the full architecture document inside a slice. Link to the architecture when broader context is needed.
- Do not add provider-specific detail until the provider decision is made or blocking.
- Do not introduce a new slice for work that is only a task inside an existing boundary.
- Keep acceptance criteria testable and short enough to drive implementation review.
- Prefer one clear owner and one clear closure signal per slice.
- If two slices need the same rule, promote the rule to `Cross-Slice Contracts` instead of copying it.

## Enterprise Quality Bar

Each slice must meet this bar before implementation starts:

- Scope is narrow enough to implement and review without hiding cross-cutting risk.
- Dependencies, owners, and decision points are explicit.
- Security, privacy, and audit implications are named.
- Data migration and rollback behavior are concrete where durable state is touched.
- Validation includes automated checks plus at least one production-like verification path.
- Operational handoff is clear enough for support and incident response.

Each slice must meet this bar before it is accepted:

- Acceptance criteria are proven by tests, deployment checks, or inspected runtime evidence.
- New secrets, environment variables, providers, queues, or storage buckets are documented.
- Any architectural decision made during implementation is recorded or linked.
- Target architecture gaps closed by the slice are updated in the architecture appendix.
- No slice leaves a temporary bypass for authentication, authorization, audit, or evidence access unless it is time-boxed, tracked, and disabled outside non-production.

## Roadmap Sequence

| Order | Slice | Primary outcome | Depends on |
|---|---|---|---|
| 1 | [Deployable API Boundary and Topology](slices/01-deployable-api-boundary-and-topology.md) | Vercel frontend can reach a real backend contract. | None |
| 2 | [Identity, Sessions, and Authorization](slices/02-identity-sessions-and-authorization.md) | Client and admin actions have server-trusted actors. | Slice 1 |
| 3 | [Relational Data Model and Persistence](slices/03-relational-data-model-and-persistence.md) | Core entities, status history, and invariants are durable. | Slice 1 |
| 4 | [Invitation and Onboarding Lifecycle](slices/04-invitation-and-onboarding-lifecycle.md) | Invite, activation, and profile completion work end to end. | Slices 2, 3 |
| 5 | [Questionnaires, Assignments, and Declarations](slices/05-questionnaires-assignments-and-declarations.md) | Client submission and admin review workflows are complete. | Slices 2, 3, 4 |
| 6 | [Evidence File Lifecycle](slices/06-evidence-file-lifecycle.md) | Evidence upload/download is authorized, auditable, and storage-backed. | Slices 2, 3, 5 |
| 7 | [Workflow and Notifications](slices/07-workflow-and-notifications.md) | Business events drive retries, notifications, and async work. | Slices 3, 4, 5, 6 |
| 8 | [Audit and Observability](slices/08-audit-and-observability.md) | Operators can trace, diagnose, and audit portal behavior. | Slices 1 through 7 |
| 9 | [Production Verification and Release Readiness](slices/09-production-verification-and-release-readiness.md) | The deployed portal is proven end to end. | Slices 1 through 8 |

## Architecture Gap Traceability

| Architecture gap | Owning slice | Supporting slices | Closure evidence |
|---|---|---|---|
| Frontend-to-backend runtime returned production `/api/...` 404 | Slice 01 | Slice 09 | Closed for routing: production API endpoint returns JSON envelope and frontend can call it. |
| Backend resource adapters are not deployed behind the API boundary | Slice 01 | Slices 02 through 05 | Domain handlers execute against production database, storage, and notification adapters. |
| Server-trusted identity and sessions are incomplete | Slice 02 | Slice 04 | Session issue, introspect, revoke, and ownership denial tests pass. |
| Admin authorization is not server-enforced | Slice 02 | Slices 05, 08 | Admin mutations require role checks and write audit events. |
| Relational lifecycle governance is incomplete | Slice 03 | Slices 04, 05, 08 | Migrations, status transition history, and versioned configuration exist. |
| Invitation and onboarding are not reachable in production | Slice 04 | Slices 01, 02, 03, 07 | Invite-to-onboarding E2E test passes against deployed API. |
| Assignment, declaration, and review flows are incomplete end to end | Slice 05 | Slices 02, 03, 06, 07, 08 | Client submission and admin review E2E tests pass. |
| Evidence upload/download is not production-secure | Slice 06 | Slices 02, 03, 05, 08 | Upload/finalize/download authorization tests pass and no permanent public URL is exposed. |
| Notifications are not durable or retryable | Slice 07 | Slices 04, 05, 08 | Outbox records, retry state, provider adapter, and failure visibility exist. |
| Audit and observability are insufficient for operations | Slice 08 | All prior slices | Audit coverage matrix, logs, metrics, traces, and alert checks exist. |
| Deployment readiness is not proven end to end | Slice 09 | All prior slices | Release evidence bundle proves every core workflow in production-like runtime. |

## Slice Completion Standard

A slice is complete only when all of the following are true:

- Code implements the stated contract.
- Tests or checks cover the acceptance criteria.
- Documentation reflects the final behavior.
- Rollback is possible without corrupting business data.
- The slice does not leave ambiguous runtime paths between Retool, local mocks, and production APIs.

## Required Slice Sections

Every individual slice must keep these sections stable:

- `Overview`
- `Goals`
- `Non-goals`
- `Scope`
- `Proposed Design`
- `Interfaces and Dependencies`
- `Implementation Steps`
- `Enterprise Controls`
- `Acceptance Criteria`
- `Validation`
- `Rollback`
- `Risks and Mitigations`
- `Done Evidence`

If a section is intentionally not applicable, it must say why. Omitting the section is treated as incomplete.

## Cross-Slice Contracts

### Frontend API Contract

- Frontend calls must resolve through one production backend boundary.
- API errors must use a stable envelope with machine-readable codes.
- Frontend code must not trust browser-provided client IDs, reviewer names, or authorization state.

### Identity Contract

- All business operations receive actor context from server-trusted identity.
- Client and admin identities must be distinguishable in audit and authorization logic.
- Session expiry, logout, and revocation are backend responsibilities.

### Data Contract

- Business state transitions are explicit and persisted.
- Workflow-significant changes write history.
- Dynamic configuration uses versioning or activation rules to protect in-flight work.

### Evidence Contract

- Files require authorized upload and authorized retrieval.
- Storage keys are opaque.
- Metadata links evidence to owners and business records before it is trusted.

### Operations Contract

- Critical events produce audit records.
- Production failures are visible through logs, metrics, traces, or dashboards.
- Notifications and async jobs have retry and dead-letter handling.

### Security and Compliance Contract

- Authentication and authorization fail closed by default.
- Tokens, passwords, signed URLs, and provider secrets are never logged or stored in audit metadata.
- Personal and declaration data access is auditable by actor, resource, and action.
- Evidence access is time-bound, scoped, and revocable where the provider supports revocation.

### ADR Contract

Record an ADR when a slice chooses or changes:

- backend runtime topology
- identity provider or admin auth model
- database and migration tooling
- object storage provider
- notification provider
- workflow or queue runtime
- audit retention or observability provider

## Readiness Gates

### MVP Gate

- Vercel frontend reaches a deployed API boundary.
- Client can accept invite, sign in, complete onboarding, and submit a declaration.
- Admin can review a declaration and record feedback.
- Evidence upload is access-controlled.
- Smoke tests verify the core happy path.

### Enterprise Gate

- Admin RBAC is server-enforced.
- Sessions use HTTP-only or equivalent server-trusted mechanics.
- Evidence download uses signed or proxied retrieval.
- Notifications are durable and retryable.
- Audit, logs, and alerts cover auth, workflow, storage, and notification failures.
- Production deployment is validated against the release readiness slice.

## Open Decisions

- Final backend runtime: Vercel functions/BFF, separate API service, or managed backend platform.
- Final relational database and migration mechanism.
- Final identity provider for admin users.
- Final object storage provider.
- Final notification provider.
- Final queue/workflow runner.

These choices should be made in the slice where they first become blocking, then recorded in an ADR if the decision materially affects long-term operations.
