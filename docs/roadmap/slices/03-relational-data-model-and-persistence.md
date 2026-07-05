# Slice 03: Relational Data Model and Persistence

## Overview

This slice establishes the relational system of record for the portal. Existing handlers reference core entities, but the target requires durable lifecycle history, stronger invariants, and controlled configuration versioning.

## Goals

- Define and migrate core relational tables.
- Add status transition history for workflow-significant entities.
- Version or lifecycle-control question sets and profile field definitions.
- Create a persistence layer that business handlers can use consistently.

## Non-goals

- Implement every workflow endpoint.
- Choose analytics or reporting warehouse strategy.
- Build data retention automation beyond schema support.

## Scope

- Clients
- Invitations
- Client sessions
- Profiles and profile field definitions
- Question sets and questions
- Assignments
- Declarations and declaration answers
- Evidence file metadata
- Review feedback
- Workflow events and notification outbox
- Audit events

## Proposed Design

The database is the source of truth for business state. Handlers should use repository functions or a thin data-access layer rather than embedding ad hoc SQL across UI-specific operations.

Minimum transition history table:

```text
status_transitions
- id
- resource_type
- resource_id
- from_status
- to_status
- actor_type
- actor_id
- reason
- created_at
```

Configuration records should support activation without mutating the meaning of already-submitted data.

## Interfaces and Dependencies

- Depends on Slice 01 for runtime boundary.
- Supports Slice 02 session persistence.
- Required by all workflow slices.

## Implementation Steps

1. Choose migration tooling and database connection strategy.
2. Define schema for core entities and indexes.
3. Add uniqueness rules for client email, active invitation tokens, session tokens, and configuration versions.
4. Add status transition history helpers.
5. Add repository functions for core read/write operations.
6. Migrate existing handler logic to use shared persistence helpers.
7. Add seed data or fixtures for local and E2E testing.

## Enterprise Controls

- Owner: backend/data engineer with architecture reviewer.
- ADR required for database provider, migration tool, and rollback policy.
- Migrations touching production data require backup, dry run, and forward-fix plan.
- Tables containing client identity, declarations, answers, evidence metadata, or audit events must have explicit retention and access assumptions.
- Schema changes must preserve audit and submission history.
- Indexes must support expected dashboard, review queue, and ownership checks before production load.

## Acceptance Criteria

- All core entities named in the architecture doc have durable tables or documented equivalents.
- Status changes for invitations, assignments, declarations, and reviews write history.
- Question set and profile field changes cannot silently rewrite the meaning of prior submissions.
- Persistence errors are normalized at the API boundary.

## Validation

- Migration dry run against an empty database.
- Migration idempotency or rollback test in a disposable database.
- Repository tests for uniqueness, foreign keys, and transition history.
- E2E fixture reset uses migrations rather than hand-built state where practical.

## Rollback

- Each migration must include rollback notes or a forward-fix plan.
- Destructive schema changes require data backup and explicit approval.
- Rollback must not delete audit or submission history unless running in non-production test data.

## Risks and Mitigations

- Risk: Flexible JSON profile data becomes ungoverned schema.
- Mitigation: Store dynamic values as JSON only with versioned field definitions and validation rules.

- Risk: Status strings drift across handlers.
- Mitigation: Centralize allowed statuses and transitions in shared domain code.

## Done Evidence

- Migration files exist and run cleanly.
- Repository layer covers core entities.
- Status transition history is written by at least one end-to-end workflow and unit tested.
