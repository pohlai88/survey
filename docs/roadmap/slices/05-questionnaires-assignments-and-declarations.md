# Slice 05: Questionnaires, Assignments, and Declarations

## Overview

This slice delivers the core business workflow: admins configure question sets and assignments, clients submit assigned questionnaires or self-service declarations, and admins review submissions.

## Goals

- Manage question sets and questions with version-aware activation.
- Assign questionnaires to clients.
- Support client submission of assigned questionnaires.
- Support client self-service declaration submission.
- Support admin review, feedback, and status decisions.

## Non-goals

- Implement final evidence storage mechanics beyond references supplied by Slice 06.
- Build analytics or reviewer workload optimization.
- Implement complex approval chains unless explicitly required.

## Scope

- Question set CRUD and activation
- Question CRUD and ordering
- Assignment create/list/cancel/reissue
- Declaration create/list/detail
- Declaration answers
- Review feedback and status transition
- Client and admin frontend integration for these flows

## Proposed Design

Question sets are templates. Declarations and assignment submissions store answer records against the version of the question set active at submission time. Admin review writes feedback and status transitions without mutating submitted answers.

Allowed declaration status model:

```text
draft -> submitted -> under_review -> approved
draft -> submitted -> under_review -> rejected
submitted -> needs_more_information -> submitted
```

Allowed assignment status model:

```text
assigned -> in_progress -> submitted -> reviewed
assigned -> cancelled
submitted -> returned -> in_progress
```

## Interfaces and Dependencies

- Depends on Slice 02 for actor context.
- Depends on Slice 03 for persistence and transitions.
- Integrates with Slice 06 for evidence references.
- Emits events for Slice 07 and audit records for Slice 08.

## Implementation Steps

1. Define status enums and transition rules.
2. Implement question set activation and versioning rules.
3. Implement assignment creation with admin role checks and due dates.
4. Implement client assignment listing scoped to authenticated client.
5. Implement assignment submission with server-side answer validation.
6. Implement self-service declaration submission with dynamic question support.
7. Implement admin declaration detail and review feedback endpoints.
8. Add frontend error handling for validation and transition conflicts.

## Enterprise Controls

- Owner: product workflow engineer with reviewer/admin stakeholder.
- Status transition rules must be centralized and covered by tests.
- Question set activation must not mutate the meaning of existing declarations or assignments.
- Submitted answers must be immutable except through explicit correction workflows.
- Admin review decisions must be attributed to authenticated admin actor and written to transition history.
- Client-facing validation errors must be actionable without exposing internal schema or authorization details.

## Acceptance Criteria

- Client can see only their own assignments and declarations.
- Required questions are enforced server-side.
- Invalid status transitions fail with stable domain errors.
- Admin feedback is attributed to authenticated admin actor.
- Question set changes do not corrupt already-submitted declarations.

## Validation

- Unit tests for answer validation and status transitions.
- Integration tests for assignment submission and declaration submission.
- E2E tests for client dashboard -> assigned questionnaire -> admin review.
- E2E tests for self-service declaration with dynamic questions.

## Rollback

- Roll back frontend route changes by restoring the previous deployment.
- Business data rollback must be forward-only for submitted declarations; use corrective status transitions rather than deleting records.
- If question set versioning introduces an error, deactivate the affected version and create a corrected version.

## Risks and Mitigations

- Risk: Dynamic questions create inconsistent answer shapes.
- Mitigation: Validate every answer against question type and validation rules at submission.

- Risk: Concurrent admin reviews overwrite decisions.
- Mitigation: Use optimistic concurrency or transition checks with updated timestamps.

## Done Evidence

- Core declaration and assignment E2E tests pass.
- Review feedback and status changes write transition history.
- Frontend no longer relies on local-only assumptions for submission identity.
