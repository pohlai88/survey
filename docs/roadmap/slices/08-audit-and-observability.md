# Slice 08: Audit and Observability

## Overview

This slice makes the portal operable and accountable. The system must emit audit records for security and business events, and operators must be able to diagnose failures across frontend, backend, workflow, notification, storage, and database boundaries.

## Goals

- Persist immutable audit events for sensitive and workflow-significant actions.
- Add structured application logs with request correlation.
- Add metrics and alerts for critical failure classes.
- Define operational dashboards and investigation paths.

## Non-goals

- Build a custom observability platform.
- Implement long-term compliance reporting UI.
- Replace provider-native monitoring where it is sufficient.

## Scope

- Audit event schema and writer
- Structured logging
- Request IDs and trace propagation
- Metrics for API, auth, workflow, notification, storage, and database failures
- Alert definitions
- Operator runbook links

## Proposed Design

Audit events are business records. Logs and traces are operational signals. They should be linked through request IDs and resource IDs, but they should not replace each other.

Minimum audit events:

- login succeeded / failed
- session revoked
- invitation created / accepted / revoked / resent
- profile completed
- assignment created / submitted / cancelled
- declaration submitted
- evidence uploaded / downloaded
- review feedback created
- declaration status changed
- question set or profile field configuration changed
- authorization denied for sensitive resources

## Interfaces and Dependencies

- Consumes actor context from Slice 02.
- Consumes event producers from Slices 04 through 07.
- Depends on API request ID propagation from Slice 01.

## Implementation Steps

1. Finalize audit event schema and retention expectations.
2. Ensure all sensitive handlers write audit events with actor, resource, and metadata.
3. Add structured logger with request ID, actor type, actor ID, operation, and outcome.
4. Add metrics for latency, error rate, auth failures, denied authorization, notification failures, storage failures, and workflow backlog.
5. Define alert thresholds and escalation path.
6. Create operator checks for failed invitations, stuck submissions, dead-letter notifications, and storage access failures.
7. Update docs with commands, dashboards, or provider links once selected.

## Enterprise Controls

- Owner: platform/operations engineer with compliance reviewer.
- ADR required for audit retention, log provider, metrics provider, and alert routing if they affect compliance or operations.
- Audit records must be append-only for business actions and must not store secrets or full sensitive payloads.
- Logs must include request ID, operation, actor type where available, and outcome.
- Alert thresholds must include owner, escalation path, and expected first response.
- Observability must cover deployed frontend, backend, workflow worker, database, storage, and notification provider boundaries.

## Acceptance Criteria

- Every privileged admin mutation writes an audit event.
- Every evidence download authorization writes an audit event.
- API errors are traceable by request ID.
- Notification and workflow failures are visible without reading raw database rows.
- Operators have documented first checks for major failure classes.

## Validation

- Unit tests for audit writer.
- Integration tests verifying audit events for sensitive operations.
- Manual log check for request ID propagation through a production-like request.
- Alert dry run or documented simulation for at least one failure class.

## Rollback

- Logging changes can be rolled back independently if they break runtime.
- Audit writes should fail closed only for compliance-critical actions; otherwise define explicit degraded-mode behavior.
- Do not delete audit events during rollback.

## Risks and Mitigations

- Risk: Audit metadata stores sensitive payloads.
- Mitigation: Define allowed metadata fields and redact secrets, tokens, passwords, and full file URLs.

- Risk: Logs are too noisy to operate.
- Mitigation: Use structured levels and emit high-cardinality details only where needed for investigation.

## Done Evidence

- Audit event coverage exists for all critical flows.
- Request IDs appear in frontend-visible errors and backend logs.
- Operators can identify failed notifications, auth spikes, storage failures, and stuck workflows.
