# Slice 06: Evidence File Lifecycle

## Overview

This slice makes evidence handling production-grade. Current implementation binds file metadata to authenticated clients, but the target requires authorized upload, metadata finalization, authorized retrieval, retention metadata, and audit logging.

## Goals

- Implement secure evidence upload and download contracts.
- Store evidence metadata in the relational system of record.
- Prevent clients from accessing other clients' evidence.
- Audit upload and download access.

## Non-goals

- Implement malware scanning unless required by compliance before launch.
- Implement long-term archival automation.
- Build rich document previewing.

## Scope

- Upload authorization
- Upload finalization
- Evidence metadata storage
- Evidence association to declarations and answers
- Download authorization
- Signed URL or proxy retrieval
- Audit records for file access

## Proposed Design

Evidence upload is a two-step flow:

1. Backend authorizes upload and returns a short-lived upload target.
2. Client uploads file to storage or proxy endpoint.
3. Backend finalizes metadata and links the file to owner and business context.

Evidence download is authorized on every request:

1. Actor requests access to a file for a declaration or answer.
2. Backend verifies actor, ownership, role, and business linkage.
3. Backend returns a short-lived signed URL or streams the file through a controlled proxy.
4. Backend writes an audit event.

## Interfaces and Dependencies

- Depends on Slice 02 for actor context.
- Depends on Slice 03 for metadata persistence.
- Depends on Slice 05 for declaration and answer linkage.
- Emits audit records consumed by Slice 08.

## Implementation Steps

1. Choose object storage provider and storage key format.
2. Implement upload authorization endpoint.
3. Implement upload finalization endpoint with checksum, size, MIME type, and owner validation.
4. Update declaration and assignment submissions to accept finalized file IDs only.
5. Implement download authorization endpoint.
6. Replace direct storage URL exposure with signed URL or proxy retrieval.
7. Add audit events for upload finalization and download access.
8. Add retention class and deletion policy metadata fields.

## Enterprise Controls

- Owner: backend/storage engineer with security reviewer.
- ADR required for object storage provider, signed URL strategy, and proxy versus direct retrieval.
- Permanent public URLs must not be exposed for evidence files.
- Upload authorization must enforce file size, MIME type, extension policy, and owner scope before storage accepts the file.
- Download authorization must be checked on every access and recorded in audit events.
- Retention and deletion behavior must be documented before production evidence is accepted.

## Acceptance Criteria

- Upload authorization requires authenticated client or privileged admin actor.
- File metadata is not trusted until finalization succeeds.
- Declaration submission rejects file IDs not owned by the submitting client.
- Admin access to evidence requires a valid review permission.
- Download URLs are short-lived or proxied.
- File access is audited.

## Validation

- Unit tests for file ownership checks.
- Integration tests for upload authorization and finalization.
- E2E test for declaration submission with evidence.
- E2E test for unauthorized evidence download denial.
- Manual production check that permanent public file URLs are not exposed.

## Rollback

- Preserve existing evidence metadata.
- If signed retrieval fails, temporarily disable new downloads while retaining admin visibility of metadata.
- Do not delete storage objects during rollback unless they are confirmed orphaned test artifacts.

## Risks and Mitigations

- Risk: Upload succeeds but finalization fails.
- Mitigation: Track orphaned uploads and add cleanup jobs or manual remediation.

- Risk: Signed URLs leak beyond intended actor.
- Mitigation: Use short TTLs, opaque keys, and authorization on every signed URL issuance.

## Done Evidence

- Evidence cannot be accessed without server authorization.
- Evidence metadata includes owner, linkage, size, MIME type, checksum or equivalent integrity marker, and retention metadata.
- Audit logs show upload and download events.
