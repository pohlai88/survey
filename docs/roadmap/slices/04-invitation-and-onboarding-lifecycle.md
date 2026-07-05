# Slice 04: Invitation and Onboarding Lifecycle

## Overview

This slice delivers the client entry flow: admin invitation, client acceptance, account activation, session issuance, and onboarding profile completion. It depends on the API, identity, and persistence foundations.

## Goals

- Make invitation creation, resend, revocation, expiry, and acceptance production-ready.
- Activate client accounts through the identity/session boundary.
- Persist onboarding profile data with server-side validation.
- Emit workflow, notification, and audit records for lifecycle events.

## Non-goals

- Implement all declaration or assignment workflows.
- Build advanced identity recovery beyond the required activation path.
- Build a marketing-style onboarding experience.

## Scope

- Admin invite and resend
- Invitation token validation
- Account activation
- Client session creation
- Profile field definition retrieval
- Profile submission and onboarding completion
- Notification trigger for invitation email

## Proposed Design

Invitation tokens are one-time, expiring, revocable references. The stored value should be protected, and the client-facing link should not expose database identifiers directly.

Onboarding profile submission validates against active profile field definitions:

- required fields
- allowed field types
- allowed select values
- maximum lengths
- field activation status

## Interfaces and Dependencies

- Depends on Slice 02 for session issuance and admin authorization.
- Depends on Slice 03 for invitation, client, profile, and field definition storage.
- Publishes events consumed by Slice 07 and audit consumed by Slice 08.

## Implementation Steps

1. Implement admin invitation create/resend/revoke endpoints with role checks.
2. Generate protected invitation tokens with expiry.
3. Implement invitation validation endpoint for activation links.
4. Implement activation endpoint that creates or links client identity and issues session.
5. Implement onboarding field retrieval from active profile definitions.
6. Implement profile save with server-side validation and onboarding status transition.
7. Emit `invitation.created`, `invitation.accepted`, `profile.completed`, and related audit events.
8. Update frontend flows to rely only on backend states.

## Enterprise Controls

- Owner: backend workflow engineer with security reviewer.
- Invitation token format, expiry, resend, and revocation policy must be documented.
- Activation must be idempotent by invitation and fail closed for expired, revoked, reused, or tampered tokens.
- Invitation links must not expose protected token storage, client IDs, or admin IDs.
- Profile field definitions must be versioned or lifecycle-controlled before required fields change in production.
- Support repair procedures must preserve invitation and activation audit history.

## Acceptance Criteria

- Expired, revoked, reused, and invalid invitation tokens fail with stable domain errors.
- Accepted invitation cannot be reused.
- Activated client receives a server-trusted session.
- Required onboarding fields are enforced server-side.
- Profile completion changes onboarding status exactly once and records actor/time.

## Validation

- Unit tests for token state transitions.
- Integration tests for invite -> accept -> activate -> onboarding.
- E2E test from invitation link through dashboard access.
- Manual production check that invite links point to the deployed frontend and call deployed backend.

## Rollback

- Invitation changes can be rolled back by disabling new invitation issuance while preserving existing invitation records.
- Do not delete accepted invitations or client accounts during rollback.
- If activation fails after client creation, provide a support repair path rather than reusing the same token blindly.

## Risks and Mitigations

- Risk: Duplicate client accounts for one email.
- Mitigation: Enforce database uniqueness and activation idempotency by invitation ID.

- Risk: Invitation email is sent but database transaction fails.
- Mitigation: Persist invitation first, then trigger notification through outbox.

## Done Evidence

- Full invite-to-onboarding E2E test passes against the deployed or deployable API.
- Invitation state transitions are auditable.
- Client profile data is validated against active field definitions.
