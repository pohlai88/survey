# Client Declaration Portal Target Architecture

## Context

This document defines the correct target architecture for the Client Declaration Portal as a production-grade full-stack system. It is written for engineers, architects, and technical stakeholders who need a normative system model before implementation and hosting details harden around incomplete runtime choices.

The portal supports two primary personas:

- Client users who accept invitations, activate accounts, complete onboarding, submit declarations, upload supporting evidence, and respond to assigned questionnaires.
- Administrative users who manage clients, configure onboarding fields and question sets, assign work, review submissions, issue feedback, and make status decisions.

This document is normative. It does not treat the current Retool-hosted codebase or the current Vercel deployment as the desired end state. Both are used only as evidence:

- The repository is used to confirm actual workflows that must exist in the final system.
- The current Vercel deployment is used to confirm what is presently deployable versus what is still missing for true end-to-end operation.

This document enables these decisions:

- What subsystems the portal must contain to be considered full-stack and end-to-end.
- Where responsibilities and trust boundaries belong.
- Which domain entities and interfaces must exist.
- Which deployment gaps are structural versus surgical.

Assumptions:

- The portal handles sensitive client identity and declaration data.
- The system of record is relational.
- The solution must support both ad hoc client declarations and admin-assigned questionnaires.
- The target frontend may be hosted on Vercel, but the architecture must not depend on Vercel-specific limitations.
- This document defines target-state architecture, not a phased migration plan.

## Responsibilities and Boundaries

### Portal Responsibilities

- Manage the full lifecycle of client identity onboarding.
- Accept and track client declarations and questionnaire responses.
- Collect and store structured answers and supporting files.
- Enable administrative review, verification feedback, and status outcomes.
- Provide an auditable record of user actions, workflow transitions, and review decisions.
- Send notifications related to invitations, assignments, submissions, and review events.

### Explicit Boundaries

- The portal owns client access to declaration workflows, but not enterprise workforce identity management for internal staff.
- The portal owns declaration-related evidence metadata and access control, but not the low-level object storage platform itself.
- The portal owns notification triggering, templates, and delivery state, but may delegate transport to external providers.
- The portal owns business workflow state, but not generic observability vendor internals.

### Out of Scope

- Public developer portal or published API reference.
- End-user help-center content.
- Detailed migration sequencing from Retool to the target system.
- Vendor lock-in decisions beyond interfaces and trust boundaries.

## Target Components

The target system consists of eight named layers.

### 1. Web Frontend

- Separate admin and client experiences served from one web application or closely related frontend surfaces.
- Browser UI for invitation acceptance, account activation, onboarding, dashboarding, declaration creation, questionnaire completion, review, and administration.
- Stateless presentation layer that is never the source of truth for identity, authorization, workflow state, or evidence access.
- Consumes backend APIs through explicit domain contracts only.

### 2. Backend Application / API Layer

- Single business API surface exposing domain-oriented endpoints for auth-adjacent flows, client profile operations, declarations, question sets, assignments, reviews, and file metadata.
- Enforces validation, authorization, workflow invariants, and cross-entity consistency.
- Owns transaction boundaries for submission, assignment, review, and status updates.
- Returns stable domain outcomes and error contracts to the frontend.

### 3. Identity and Session Management

- Dedicated identity subsystem for client authentication, account activation, password reset, session issuance, session revocation, and optional MFA.
- Internal staff authentication delegated to the organization identity provider, with role mapping into portal authorization.
- Session lifecycle separated from frontend local state.
- Invitation acceptance creates a durable identity account only after token validation and policy checks.

### 4. Workflow / Orchestration Layer

- Coordinates invitation lifecycle, onboarding completion, assignment issuance, declaration submission, review, and notifications.
- Emits domain events for downstream processing, audit capture, notifications, and reporting.
- Supports asynchronous handling for email delivery, file post-processing, and audit fan-out.
- Maintains explicit workflow states rather than inferring state from UI navigation.

### 5. Relational System of Record

- Stores durable business entities, workflow states, review history, and references to uploaded evidence.
- Supports transactional integrity for operations spanning declarations, answers, assignments, and feedback.
- Uses normalized tables for core entities and constrained JSON fields only where configurability is required.
- Persists timestamps, actors, and transition history required for traceability.

### 6. Document / File Storage Subsystem

- Stores uploaded evidence in durable object storage using opaque storage keys rather than client-visible paths.
- Uses short-lived signed upload and download flows.
- Maintains metadata in the relational store, including ownership, MIME type, size, checksum, retention class, and business linkage.
- Separates storage access from direct frontend trust.

### 7. Notification Service

- Sends invitation emails, assignment notifications, onboarding reminders, submission confirmations, and review outcome notices.
- Triggered by workflow events, not direct UI-only logic.
- Supports templating, delivery tracking, retry, and failure reporting.
- Maintains message audit records linked to originating business events.

### 8. Audit and Observability Layer

- Captures immutable audit events for authentication, invitation usage, profile completion, assignments, submissions, feedback, status changes, and configuration changes.
- Emits structured logs, metrics, and traces for operational visibility.
- Supports alerting for failed notifications, abnormal auth patterns, storage errors, and workflow dead ends.
- Provides enough evidence to reconstruct who did what, when, and from which subsystem.

## Data and Request Flows

### Flow 1: Invite -> Accept Invite -> Activate Account -> Onboarding

1. An admin creates an invitation for a client with seed identity data such as name and email.
2. The backend validates that the invitation is allowed and creates an invitation record with status, expiry, actor, and token reference.
3. The workflow layer triggers the notification service to send an invitation message containing a one-time activation link.
4. The client opens the link, and the frontend requests invitation validation from the backend.
5. The identity subsystem validates token status, expiry, revocation state, and reuse rules.
6. The client completes activation by setting credentials or completing the configured identity flow.
7. The identity subsystem creates the client account and issues a server-managed session.
8. The frontend redirects the client into onboarding.
9. The client completes required profile fields defined by administrative configuration.
10. The backend persists profile data, marks onboarding status explicitly, and emits audit events.

### Flow 2: Client Sign-In -> Dashboard -> Assigned Questionnaire Submission

1. A client signs in through the identity subsystem.
2. The backend issues a session and returns authorized dashboard bootstrap data.
3. The frontend requests current assignments scoped to the authenticated client.
4. The backend returns assignment metadata, questionnaire summary, due dates, and submission status.
5. The client opens an assignment and the frontend requests the questionnaire definition from the backend.
6. The client submits answers and uploads evidence through backend-authorized file flows.
7. The backend validates required responses, stores the submission transactionally, links evidence metadata, and updates assignment state.
8. The workflow layer emits submission events for audit, notification, and admin work queues.

### Flow 3: Client Self-Service Declaration Submission with Dynamic Questions and Evidence

1. An authenticated client starts a new declaration.
2. The frontend requests the declaration type catalog and active question configuration for the selected type.
3. The client enters declaration details and uploads required evidence.
4. The backend validates declaration content, answer completeness, file associations, and business rules.
5. The backend creates the declaration, persists structured answers, stores evidence references, and sets an initial review status.
6. The workflow layer publishes the submission event and triggers downstream notifications as configured.

### Flow 4: Admin Review -> Feedback -> Status Decision

1. An admin retrieves pending or filtered declarations through review APIs.
2. The backend returns declaration details, structured answers, evidence references, prior feedback, and an auditable timeline.
3. The admin reviews the submission and records verification feedback.
4. The backend persists feedback as a first-class review artifact rather than a transient comment.
5. If the admin changes declaration status, the backend enforces allowed state transitions and writes transition history.
6. The workflow layer emits review outcome events and triggers client notification when required.

### Flow 5: Admin Configuration of Profile Fields and Question Sets

1. An admin manages onboarding profile field definitions and declaration question sets through administrative configuration APIs.
2. The backend validates schema shape, supported field types, required flags, ordering, activation state, and compatibility constraints.
3. The relational store persists versioned or traceable configuration records.
4. The workflow and API layers expose only active configurations to client-facing flows.
5. Changes are audited because they materially affect data collection and downstream review.

## Security and Access Model

### Authentication

- Client authentication is handled by a dedicated identity subsystem with hashed passwords, secure credential recovery, and server-controlled sessions.
- Admin authentication is delegated to enterprise identity and mapped to portal roles.
- Invitation tokens are one-time, time-bounded, revocable, and stored in protected form.

### Authorization

- Every API request is authorized server-side using actor identity, role, and resource ownership.
- Clients can access only their own profile, assignments, declarations, and evidence.
- Admins can access only the administrative surfaces granted by role.
- Sensitive actions such as invitation revocation, status decisions, and configuration changes require explicit privileged permissions.

### Session Handling

- Sessions are stored in secure, HTTP-only, same-site cookies or an equivalent server-trusted mechanism.
- Session expiry, logout, revocation, and invalidation are backend-controlled.
- Frontend local storage is not a trusted authentication boundary.

### Data Protection

- Sensitive data is encrypted in transit and protected at rest.
- API responses that may contain identity, workflow, declaration, or readiness data use no-store cache headers and JSON content-sniffing protection.
- Uploaded evidence is never exposed through permanent public URLs.
- File access is granted via short-lived signed retrieval or streamed proxy access.
- Audit trails preserve actor identity and business context for compliance review.

### Security Monitoring

- Failed login attempts, suspicious invitation reuse, abnormal download patterns, and privileged admin actions are logged and surfaced to monitoring.
- Notification failures and storage-access failures are observable events, not silent UI-only errors.

## Data Model and System Interfaces

### Core Domain Entities

#### Client

- Represents the client identity and business actor.
- Key attributes: `client_id`, `email`, `full_name`, `identity_status`, `onboarding_status`, `created_at`, `last_login_at`.

#### Invitation

- Represents a pending or historical invitation into the portal.
- Key attributes: `invitation_id`, `email`, `full_name`, `token_ref`, `status`, `expires_at`, `invited_by`, `accepted_at`, `revoked_at`.

#### Profile

- Represents the client onboarding profile and collected identity/compliance metadata.
- Key attributes: `client_id`, `profile_version`, `profile_data`, `completed_at`, `updated_at`.

#### QuestionSet

- Represents a configurable questionnaire template tied to a declaration type or assignment use case.
- Key attributes: `question_set_id`, `title`, `declaration_type`, `is_active`, `version`, `created_by`, `updated_at`.

#### Question

- Represents an individual question within a question set.
- Key attributes: `question_id`, `question_set_id`, `question_type`, `prompt`, `is_required`, `sort_order`, `help_text`, `validation_rules`.

#### Assignment

- Represents a request for a client to complete a specific questionnaire.
- Key attributes: `assignment_id`, `client_id`, `question_set_id`, `status`, `assigned_by`, `assigned_at`, `due_date`, `submitted_at`.

#### Declaration

- Represents a client-submitted declaration record subject to review.
- Key attributes: `declaration_id`, `client_id`, `submission_mode`, `declaration_type`, `subject`, `content`, `status`, `submitted_at`, `updated_at`.

#### DeclarationAnswer

- Represents a structured response tied to a declaration and question.
- Key attributes: `answer_id`, `declaration_id`, `question_id`, `answer_type`, `text_value`, `boolean_value`, `file_ref`.

#### EvidenceFile

- Represents uploaded supporting documentation or media.
- Key attributes: `file_id`, `storage_key`, `owner_client_id`, `linked_entity_type`, `linked_entity_id`, `original_name`, `mime_type`, `size_bytes`, `checksum`, `uploaded_at`.

#### ReviewFeedback

- Represents an administrative review artifact.
- Key attributes: `feedback_id`, `declaration_id`, `reviewer_id`, `feedback_type`, `verification_status`, `comments`, `created_at`.

#### AuditEvent

- Represents an immutable record of a security- or workflow-relevant action.
- Key attributes: `audit_event_id`, `actor_type`, `actor_id`, `event_type`, `resource_type`, `resource_id`, `event_time`, `metadata`.

### Logical API Domains

The backend should expose domain-oriented interfaces rather than page-specific handlers.

- `Auth API`
  - Invitation validation
  - Account activation
  - Sign-in / sign-out
  - Password reset
  - Session introspection
- `Client Profile API`
  - Get onboarding requirements
  - Save or update profile
  - Retrieve current client summary
- `Declaration API`
  - Create self-service declaration
  - Get client declarations
  - Get declaration detail
  - Submit admin review feedback
  - Change declaration status
- `Questionnaire Configuration API`
  - Manage question sets
  - Manage questions
  - Publish or activate configuration
- `Assignment API`
  - Create assignment
  - List client assignments
  - Submit assignment response
  - Cancel or reissue assignment
- `File API`
  - Issue upload authorization
  - Finalize upload metadata
  - Retrieve file metadata
  - Authorize file download
- `Admin Client API`
  - Invite client
  - Revoke or resend invitation
  - Get client detail
  - Get client-related declarations and assignments

### Interface Contracts

#### Frontend-to-Backend Boundary

- The frontend sends authenticated domain requests only.
- The backend owns validation, authorization, status transitions, and business invariants.
- The frontend never composes trusted workflow state from client-side storage alone.

#### Identity / Session Boundary

- Identity services expose session issuance and verification without leaking credential internals into business APIs.
- Business APIs consume actor claims or session context, not raw password or token logic.

#### File Upload / Download Contract

- Upload is a two-step flow: authorization, then finalize.
- The backend stores metadata and ownership linkage only after successful upload completion.
- Download access is authorized per request and scoped to the actor and linked business record.

#### Notification Triggers

- Invitation created
- Invitation resent
- Assignment created
- Onboarding incomplete reminder
- Declaration submitted
- Review completed
- Status changed

## Operational Considerations

### Reliability

- Business-critical writes should be transactional where entities must remain consistent.
- Notification sending should be asynchronous with retry and dead-letter handling.
- File storage failures must not produce orphaned trusted metadata without remediation logic.

### Performance

- Dashboard and review APIs should provide summary views optimized for list retrieval.
- Large evidence files should use direct or proxied upload patterns that avoid overloading the app server.
- Search and filtering for declarations, clients, and assignments should be supported by indexed relational queries.

### Scalability

- Stateless frontend and API tiers should scale horizontally.
- Asynchronous workflow handling should absorb spikes in email, audit, and review-related events.
- File storage should scale independently from the relational store.

### Compliance and Governance

- Audit events and review history must be retained according to policy.
- Evidence retention and deletion policies must be explicit.
- Administrative configuration changes must be attributable to actors.

### Supportability

- Operators need dashboards for failed invitations, stuck submissions, notification errors, and abnormal auth activity.
- Engineering needs traces across frontend request, API handling, workflow emission, and downstream notification or storage operations.

## Failure Modes

### Invitation Failures

- Expired, revoked, or reused invitation tokens.
- Notification delivery failure after invitation creation.
- Duplicate identity creation attempts for the same email.

Expected handling:

- Token validation returns stable domain errors.
- Notification failure is retried and surfaced operationally.
- Identity duplication is blocked by backend uniqueness and workflow checks.

### Authentication and Session Failures

- Stolen or stale client-side session indicators.
- Password reset abuse or credential stuffing.
- Session mismatch between browser state and backend truth.

Expected handling:

- Backend session truth overrides frontend state.
- Identity subsystem enforces rate limiting, lockouts, and secure reset flows.
- Audit captures sensitive auth events.

### Submission Failures

- Required questions missing.
- File upload succeeds but metadata finalization fails.
- Declaration persists without all required answer records.

Expected handling:

- Validation occurs server-side before acceptance.
- Upload finalization is explicit and recoverable.
- Submission writes are transactional wherever possible.

### Review Failures

- Concurrent admin review actions conflict.
- Invalid status transitions.
- Feedback stored without clear reviewer attribution.

Expected handling:

- Backend enforces allowed transitions and concurrency-safe updates.
- Feedback requires authenticated reviewer identity.
- Status history is durable and auditable.

### Configuration Failures

- Admin deactivates a question set in active use.
- Profile field changes invalidate previously collected data expectations.
- Unsupported field types or invalid configuration shapes are saved.

Expected handling:

- Configuration validation and versioning protect active workflows.
- Changes are audited and introduced through controlled lifecycle states.

## Known Limits / Future Changes

- This document does not choose a specific identity provider, object storage vendor, relational engine, workflow engine, or notification vendor.
- A later implementation document should define versioning policy for question sets and profile field definitions.
- A later migration document should define how to transition from platform-coupled logic to the target architecture without interrupting active clients.
- Additional future concerns may include MFA, evidence scanning, reviewer queues, SLA tracking, and client notification preferences.

## Appendix A: Vercel Deployment Evidence

This appendix records observed deployment facts from the current Vercel-hosted frontend as of 2026-07-05. It is descriptive evidence only.

### Observed Deployment State

- Vercel project: `survey`
- Vercel framework detection: `vite`
- Team: `Jack's projects`
- Project ID: `prj_3qkhhTdjzm0ov2yZCDH0B7EONhiA`
- Deployment ID: `dpl_738Yj1Vcb1Z3ffB1nyDRLj3PWjKm`
- Production alias observed: `survey-one-gules.vercel.app`
- Root document returned `200`, confirming the static frontend deploys successfully.

### Observed Runtime Boundary

- The deployed artifact is the frontend application rooted in `frontend/`.
- Vercel auto-linked `frontend/.vercel/project.json`, which confirms the deployment boundary is the frontend directory rather than the repository root.
- The deployed application builds and serves the Vite bundle successfully.
- The deployed application now exposes a same-origin `/api/<domain>/<operation>` boundary that returns stable JSON envelopes.

### Observed Backend Gap in Production

- The frontend runtime attempts to call either:
  - a configured `VITE_PORTAL_API_BASE_URL`, or
  - same-origin `POST /api/...` endpoints when no external API base URL is configured.
- Retool and injected backend browser bridges are allowed in development by default, but production bridge use requires explicit `VITE_ENABLE_*_BRIDGE` flags.
- Direct production verification of `POST /api/client/getMyAssignments` with no session returned JSON `401 UNAUTHORIZED`.
- Local boundary verification confirms client sessions can be accepted from a same-site `portal_client_session` cookie or bearer token, with legacy body `__session` retained only for compatibility paths.
- Frontend HTTP API calls now send browser-held client session tokens as `Authorization: Bearer ...` instead of injecting them into JSON request bodies.
- Direct production verification of `POST /api/admin/inviteClient` without configured admin auth returned JSON `503 ADMIN_AUTH_UNCONFIGURED`.
- Direct production verification of an unknown operation returned JSON `404 OPERATION_NOT_FOUND`.
- Direct production verification of `GET /api/health/readiness` returned JSON `405 METHOD_NOT_ALLOWED`.
- Direct production verification confirmed API responses include `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, and `X-Request-Id`.
- Direct handler verification of admin requests with missing, invalid, and valid admin tokens returned `401 UNAUTHORIZED`, `403 FORBIDDEN`, and `503 BACKEND_RESOURCE_UNAVAILABLE` respectively.
- The API boundary now classifies operation dependencies as `database`, `storage`, or `notification` and reports missing resource classes in the error details.
- When required resource configuration is present but no adapter implementation exists, the API boundary returns `501 BACKEND_ADAPTER_NOT_IMPLEMENTED`.
- Direct production verification of `POST /api/health/readiness` returned `200` with `status: degraded` and missing `database`, `notification`, and `storage` resources.
- The readiness response reports non-secret API-boundary, admin-auth, resource-configuration, and adapter-implementation readiness; it is diagnostic only and does not prove business flows are executable.
- This confirms the Vercel deployment now has an API boundary, but not the resource adapters required for full backend execution.

### Operational Meaning of the Deployment Evidence

- Frontend delivery on Vercel is viable.
- Same-origin API routing on Vercel is viable.
- The present Vercel deployment is not proof of end-to-end readiness because backend resources are not configured behind the API boundary.
- The missing work is now primarily resource-backed backend execution, identity, file, workflow, and operational layers, not static asset hosting or API route existence.

## Appendix B: Surgical Gap Analysis to Reach Full End-to-End Operation

This appendix separates the specific missing pieces from the target architecture. It is intentionally surgical: each row describes the smallest missing production capability that blocks true end-to-end behavior.

| Subsystem | Current deployed / implemented reality | Correct target-state capability | Surgical change needed | Priority | Impact if missing |
|---|---|---|---|---|---|
| Frontend delivery | Vercel successfully serves the Vite frontend from `frontend/`. | Standalone web frontend is valid and production-hosted. | Keep the current frontend deployment boundary. No architectural rewrite needed here. | Low | Hosting alone is not the blocker. |
| Frontend-to-backend runtime | Same-origin `/api/<domain>/<operation>` now returns JSON envelopes in production; readiness is exposed at `/api/health/readiness`; Retool/browser bridges are explicitly gated outside development; backend calls distinguish missing configuration from missing adapter implementation. | Frontend can call a real backend consistently in all environments. | Wire the active API boundary to real backend resource adapters instead of the current resource-unavailable placeholder. | High | The deployed app has API routing, but business operations still cannot execute end to end. |
| Backend application layer | Domain logic exists in repo, and production API routing exists, but no production database/storage/email adapters are configured behind it. | Stable application/API layer exposing domain contracts. | Replace Retool-coupled resource assumptions with deployable backend adapters and connect them to the API boundary. | Critical | UI and API route are present, but business operations remain unavailable in production. |
| Identity and session management | Frontend still owns the opaque session token, but HTTP calls now avoid JSON body token injection and the API boundary accepts bearer or same-site cookie session transport before passing sanitized actor context to dispatch. There is still no server session store or revocation path. | Server-managed identity and session subsystem. | Replace browser-trusted session model with server-issued HTTP-only session cookies or equivalent server-trusted session mechanism. Add real session introspection, logout, reset, and revocation endpoints. | Critical | Authentication is improved at the boundary but is still not production-complete or fully trustworthy across requests. |
| Client activation and invitation flow | Invite and accept logic exists in code, but production runtime has no reachable activation backend. | Invitation lifecycle integrated with identity and notification systems. | Deploy invitation validation, activation, token expiry, revocation, and resend flows behind the production API boundary. | High | Client entry into the system is incomplete and operationally fragile. |
| Admin authorization | Admin routes and handlers exist; the deployed API boundary can fail closed for admin operations, but final server-enforced RBAC is not established. | Role-based admin authorization enforced server-side. | Add authenticated admin identity, role mapping, permission checks, and actor binding for all privileged actions. | Critical | Review decisions and configuration changes are not defensible or auditable. |
| Workflow and orchestration | Submission, invitation, and notification logic are mostly inline request behavior. | Explicit workflow state and asynchronous orchestration. | Introduce domain events and background processing for notifications, audit fan-out, and retryable workflow work. | High | Failures remain brittle, synchronous, and hard to recover. |
| Relational system of record | Core tables and handlers exist, but lifecycle governance is incomplete. | Relational source of truth with controlled state transitions and history. | Add status transition history, stronger invariants, and versioned configuration handling for question sets and onboarding field definitions. | Medium | Traceability and change safety remain partial. |
| File and evidence handling | Evidence upload logic exists, but production Vercel deployment has no complete storage integration; current codebase still reflects platform-coupled storage assumptions. | Secure evidence storage with upload authorization and download authorization. | Implement object storage integration, signed upload flow, metadata finalization, signed download or proxy retrieval, and download audit logging. | Critical | Declaration evidence cannot be handled securely end-to-end. |
| Notifications | Invitation email behavior exists conceptually, but there is no production-grade notification subsystem behind the Vercel deployment. | Event-driven notification service with retries and delivery state. | Add notification provider abstraction, message templates, delivery persistence, retry handling, and operational visibility. | High | Invitation, assignment, and review communications are unreliable. |
| Audit and observability | Current deployment has build visibility and the API boundary now has sanitized structured response events for operational failures when enabled. It still lacks durable portal-level audit, traces, metrics, dashboards, alerts, and domain event history. | First-class audit events plus logs, metrics, traces, and alerts. | Add immutable audit-event persistence, domain audit coverage, request tracing, metrics, dashboards, and alerts around auth, notification, storage, and workflow failures. | Critical | Production support, compliance review, and incident diagnosis remain insufficient beyond the API boundary. |
| Deployment topology | Frontend is deployed from `frontend/`; `frontend/.env.example` now names the resource environment contract, but repository root still contains Retool metadata and backend source that Vercel is not serving. | Explicit deployable topology for frontend, backend, storage, and supporting services. | Document and implement the production topology explicitly: frontend on Vercel, backend execution location, database, storage, notification provider, and secrets model. | High | The repo structure and hosting shape remain easy to misread, causing partial deployments. |

### What Is Not Missing

The following are not the main blockers and should not be mistaken for the core architecture gap:

- Static frontend hosting on Vercel
- Vite production build capability
- Presence of admin and client page surfaces in the repository
- Presence of domain-oriented code artifacts in the repository

### What Is Actually Missing

The smallest true end-to-end gap set after Slice 01 is:

1. Production resource adapters behind the deployed API boundary.
2. Server-trusted identity and session management.
3. Secure evidence storage and retrieval integration.
4. Server-side authorization for admin and client actions.
5. Notification, audit, and operational control planes.

Without those five capabilities, the system remains a deployable frontend plus API shell rather than a full-stack portal.

## Appendix C: Repository Workflow Coverage Evidence

The target architecture and surgical gap analysis were derived from repository-discovered application surfaces, including:

- Admin declaration listing and detail review flows.
- Client invitation, acceptance, and login flows.
- Client onboarding and profile completion flow.
- Question set and question management flows.
- Client assignment retrieval and submission flows.
- Self-service declaration submission with dynamic questions and evidence upload.

These workflows are covered in the target-state flows above so the architecture remains complete without inheriting current platform limitations as design decisions.
