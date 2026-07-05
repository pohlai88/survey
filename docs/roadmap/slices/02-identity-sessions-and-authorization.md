# Slice 02: Identity, Sessions, and Authorization

## Overview

This slice establishes server-trusted actors for client and admin operations. Current code has moved toward opaque client sessions, but the target requires backend-controlled session issuance, revocation, admin identity binding, and server-side authorization for every privileged operation.

## Goals

- Make client sessions server-trusted and revocable.
- Bind admin actions to authenticated admin identity.
- Enforce client ownership and admin role checks in the backend.
- Remove user-supplied identity fields from trust decisions.

## Non-goals

- Implement MFA unless required by the chosen identity provider.
- Replace every business workflow.
- Build organization-wide identity management for internal staff.

## Scope

- Client activation and sign-in session issuance
- Session introspection and logout
- Admin actor context
- Role and permission model
- Backend authorization middleware or helper layer
- Audit events for sensitive auth and authorization outcomes

## Proposed Design

All backend handlers receive an `ActorContext` resolved from the request before business logic executes.

```ts
type ActorContext =
  | { type: 'client'; clientId: number; sessionId: string }
  | { type: 'admin'; adminId: string; roles: string[] }
  | { type: 'anonymous' }
```

Client sessions should be stored in secure HTTP-only same-site cookies or an equivalent server-trusted mechanism. Admin sessions should come from the organization identity provider or hosting-platform identity integration, then be mapped into portal roles.

Minimum roles:

- `portal_admin`
- `reviewer`
- `configuration_manager`
- `support_readonly`

## Interfaces and Dependencies

- Depends on Slice 01 API routing.
- Feeds actor context into all later slices.
- Writes audit events consumed by Slice 08.

## Implementation Steps

1. Define `ActorContext` and authorization helpers.
2. Implement client session issuance using server response controls.
3. Implement session introspection and logout using backend truth.
4. Add admin identity adapter and role mapping.
5. Replace browser-provided `client_id`, reviewer names, and admin identifiers with actor context.
6. Add permission checks to invitation, assignment, review, configuration, evidence, and declaration handlers.
7. Add audit events for login, logout, failed auth, denied authorization, and privileged admin actions.

## Enterprise Controls

- Owner: security/backend engineer with admin workflow reviewer.
- ADR required for the chosen admin identity provider, client session transport, and role model.
- Authentication and authorization must fail closed when actor context is absent, expired, malformed, or incompatible with the resource.
- Cookies, tokens, passwords, reset secrets, and invitation secrets must never appear in logs, audit metadata, or frontend-visible errors.
- Admin roles must be least-privilege and mapped to explicit permissions.
- Authorization denial must be auditable without leaking whether another client's resource exists.

## Acceptance Criteria

- Client cannot access another client's profile, assignments, declarations, or evidence.
- Admin review and configuration mutations require server-resolved admin actor context.
- Logout invalidates the server-side session.
- Expired or revoked sessions fail closed.
- Backend tests cover ownership denial and role denial.

## Validation

- Unit tests for session creation, introspection, revocation, and authorization helpers.
- E2E test for client attempting to access unauthorized declaration returns `403`.
- E2E test for unauthenticated admin mutation returns `401`.
- Manual production check verifies cookies or token mechanics are secure for the selected topology.

## Rollback

- Keep legacy session token parsing temporarily behind a feature flag only if required for migration.
- Roll back by disabling new auth enforcement only before production user data is accepted.
- Once production data exists, rollback must preserve session revocation and audit records.

## Risks and Mitigations

- Risk: Mixing client and admin identity in one session model causes privilege confusion.
- Mitigation: Use explicit actor types and deny by default when actor type is incompatible.

- Risk: Frontend tests pass because mocks skip authorization.
- Mitigation: Add backend-level authorization tests independent of UI mocks.

## Done Evidence

- Business handlers no longer trust browser-submitted actor identity.
- Admin and client authorization failures are observable.
- Session lifecycle is controlled by backend state.

## Current Implementation Status

- Started: the Vercel API boundary now classifies every supported operation as `public`, `client`, or `admin` in one policy map.
- Started: client-protected operations fail closed with `401 UNAUTHORIZED` when no session token is present.
- Started: admin-protected operations fail closed before backend execution; missing admin auth configuration returns `503 ADMIN_AUTH_UNCONFIGURED`, missing credentials return `401 UNAUTHORIZED`, and invalid credentials return `403 FORBIDDEN`.
- Evidence: `pnpm --dir frontend run test:api` covers the current fail-closed API boundary cases and operation-contract coverage.
- Not complete: the current admin token check is a boundary guard, not the final role-based identity model.
- Not complete: client sessions are still not backed by a server-side session store, revocation mechanism, or HTTP-only session transport.
- Not complete: authorization denials are not yet persisted as audit events.
