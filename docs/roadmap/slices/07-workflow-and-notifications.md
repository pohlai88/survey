# Slice 07: Workflow and Notifications

## Overview

This slice moves long-running business side effects out of fragile inline request behavior. Invitation emails, assignment notifications, submission confirmations, review outcomes, audit fan-out, and retryable work should flow through explicit workflow events and notification processing.

## Goals

- Define domain events for portal lifecycle changes.
- Persist events or outbox records transactionally with business writes.
- Send notifications through a provider abstraction.
- Add retry, failure state, and operational visibility for notification delivery.

## Non-goals

- Build a generic workflow platform.
- Implement complex customer notification preferences unless required before launch.
- Replace all synchronous logic with asynchronous jobs.

## Scope

- Workflow event model
- Notification outbox
- Message templates
- Provider adapter
- Retry and dead-letter state
- Operator visibility for failed notifications

## Proposed Design

Business handlers write workflow events inside the same transaction as the state change. A worker or scheduler processes pending events and notification outbox rows.

Minimum workflow events:

- `invitation.created`
- `invitation.resent`
- `invitation.accepted`
- `profile.completed`
- `assignment.created`
- `assignment.submitted`
- `declaration.submitted`
- `review.completed`
- `status.changed`

Notification records should include recipient, template, payload, status, attempt count, last error, and originating event ID.

## Interfaces and Dependencies

- Depends on Slice 03 for outbox persistence.
- Depends on Slices 04, 05, and 06 for event producers.
- Feeds observability requirements in Slice 08.

## Implementation Steps

1. Define event names, payload schemas, and versioning rules.
2. Implement transactional event/outbox writer.
3. Implement notification template registry.
4. Implement provider adapter for selected email service.
5. Implement worker or scheduled processor for pending notifications.
6. Add retry policy and dead-letter state.
7. Add admin/operator view or query for failed notifications.
8. Remove direct email sending from request handlers.

## Enterprise Controls

- Owner: backend/workflow engineer with operations reviewer.
- ADR required for queue, scheduler, or workflow runtime.
- Events must be versioned and idempotent.
- Notification payloads must not contain raw invitation tokens, passwords, signed file URLs, or unnecessary declaration content.
- Retries must use bounded backoff and visible dead-letter state.
- Operators must be able to pause delivery, replay failed work, and identify duplicate-send risk.

## Acceptance Criteria

- Invitation creation persists even if email delivery is delayed.
- Notification failures are retried and visible.
- Notification payloads do not expose secrets or raw invitation token storage.
- Review outcome and assignment notifications are supported.
- Duplicate processing is idempotent.

## Validation

- Unit tests for event schema and notification template rendering.
- Integration test for outbox creation inside business transaction.
- Worker test for retry and failure states.
- E2E test verifies invitation email is queued or sent through a test adapter.

## Rollback

- Pause notification worker if provider behavior is faulty.
- Keep outbox rows for replay after fix.
- Restore direct send only as a temporary controlled fallback and record operational risk.

## Risks and Mitigations

- Risk: Duplicate emails after retry.
- Mitigation: Use idempotency keys per originating event and template.

- Risk: Event payloads become inconsistent across versions.
- Mitigation: Version event schemas and keep consumers tolerant of older payloads.

## Done Evidence

- Core workflows write events.
- Notifications are processed from durable state.
- Failed notifications can be found and retried.
