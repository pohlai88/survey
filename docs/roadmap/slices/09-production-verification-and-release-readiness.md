# Slice 09: Production Verification and Release Readiness

## Overview

This slice proves the portal is ready to operate as a full-stack production system. It ties together deployment, smoke tests, security checks, workflow validation, observability, and rollback readiness.

## Goals

- Verify every architecture workflow against a production-like deployment.
- Confirm the Vercel frontend is connected to the correct backend, database, storage, notification, and observability services.
- Establish release and rollback gates.
- Produce evidence that the system is end-to-end operational.

## Non-goals

- Build CI/CD automation.
- Implement new business features.
- Replace formal security review where required by policy.

## Scope

- Production environment configuration
- Smoke and E2E tests
- Manual operational checks
- Security and access checks
- Deployment rollback procedure
- Documentation reconciliation

## Proposed Design

Release readiness is evidence-based. A deployment is not considered complete because the frontend returns `200`; it is complete only when the full portal flows work against the deployed backend and supporting services.

Required release evidence:

- frontend root returns `200`
- API health/session endpoint returns JSON
- invite -> accept -> activate -> onboarding succeeds
- client sign-in -> dashboard -> assignment submission succeeds
- self-service declaration with evidence succeeds
- admin review -> feedback -> status decision succeeds
- unauthorized access attempts fail closed
- notification queue or provider shows expected delivery state
- audit events exist for critical flows
- rollback path is documented and tested at least once in non-production

## Interfaces and Dependencies

- Depends on all previous slices.
- References Vercel project configuration, backend deployment, database, storage, notification provider, and observability tooling.

## Implementation Steps

1. Define production and preview environment variables.
2. Validate backend connectivity from deployed frontend.
3. Run smoke tests against preview deployment.
4. Run E2E tests against a seeded production-like environment.
5. Execute manual security checks for client ownership and admin authorization.
6. Verify notification delivery or outbox processing.
7. Verify audit and logs for the same test run.
8. Document rollback procedure for frontend, backend, database migrations, and worker processes.
9. Reconcile architecture and roadmap docs with implemented reality.

## Enterprise Controls

- Owner: release engineer with engineering, security, and operations approvers.
- Release checklist must name the exact frontend deployment, backend deployment, database migration version, storage bucket, notification provider, and observability dashboard.
- Production verification must use real deployed services or approved production-like test adapters, not frontend-only mocks.
- Security checks must include unauthenticated access, cross-client access, admin role denial, and evidence download denial.
- Rollback must include side-effect controls for workers, notifications, and storage writes.
- Final release notes for internal operators must link to runbooks, dashboards, and rollback commands.

## Acceptance Criteria

- Production or preview deployment proves all core user flows.
- No endpoint required by frontend returns platform `404`.
- Sensitive routes fail closed when unauthenticated or unauthorized.
- Evidence files cannot be retrieved without authorization.
- Operators can locate logs, audit events, and failed workflow records from a test run.
- Rollback steps are explicit and usable.

## Validation

- `pnpm --dir frontend run typecheck`
- `pnpm --dir frontend run build`
- `pnpm --dir frontend run test:e2e`
- Production API smoke check:

```powershell
Invoke-WebRequest -Uri "https://<production-host>/api/health/readiness" -Method POST -ContentType "application/json" -Body "{}"
```

- Manual review of audit records for the test run.
- Manual review of notification outbox or provider delivery state.

## Rollback

- Frontend: promote previous Vercel deployment alias.
- Backend: redeploy previous backend artifact when schema remains compatible.
- Database: use forward fixes for production data unless a migration rollback has been explicitly tested.
- Workers: pause processors before rollback if repeated side effects are possible.
- Notifications: pause outbound delivery if templates or routing are incorrect.

## Risks and Mitigations

- Risk: Tests pass against mocks while production services are disconnected.
- Mitigation: Run a final smoke suite against the deployed environment with real backend, database, storage, and notification test adapters.

- Risk: Rollback corrupts workflow state.
- Mitigation: Prefer forward-only status correction and pause side-effect processors before reverting code.

## Done Evidence

- A release checklist links to test run output, deployment URLs, API smoke output, audit records, and rollback notes.
- The architecture appendix no longer lists production `/api/...` as missing.
- The portal is demonstrably full-stack, not only frontend-hosted.
