# Client Declaration Portal Target Architecture

## Context

This document defines the correct target architecture for the Client Declaration Portal as a production-grade full-stack system. It is intended for engineers, architects, and technical stakeholders who need a shared system model before implementation hardens around platform-specific constraints.

The portal supports two primary personas:

- Client users who accept invitations, activate accounts, complete onboarding, submit declarations, upload supporting evidence, and respond to assigned questionnaires.
- Administrative users who manage clients, configure onboarding fields and question sets, assign work, review submissions, issue feedback, and make status decisions.

This architecture is normative. It does not treat the current Retool-hosted implementation as the desired end state. The current implementation is used only as source evidence for workflows and as input to the appendix gap analysis.

The document enables these decisions:

- What subsystems the portal must contain to be considered end-to-end.
- Where responsibilities and trust boundaries belong.
- Which domain entities and interfaces must exist.
- Which operational and security controls are mandatory for production readiness.

Assumptions:

- The portal is an internal business system with sensitive client identity and declaration data.
- The system of record is relational.
- The solution must support both ad hoc client declarations and admin-assigned questionnaires.
- This document defines target-state architecture, not migration sequencing.

## Responsibilities and Boundaries

### Portal Responsibilities

- Manage the full lifecycle of client identity onboarding.
- Accept and track client declarations and questionnaire responses.
- Collect and store structured answers and supporting files.
- Enable administrative review, verification feedback, and status outcomes.
- Provide an auditable record of user actions, workflow transitions, and review decisions.
- Send operational notifications related to invitations, assignments, and review events.

### Explicit Boundaries

- The portal owns client access to declaration workflows, but not enterprise workforce identity management for internal staff.
- The portal owns declaration-related evidence metadata and access control, but not the low-level object storage infrastructure.
- The portal owns notification triggering and message composition policy, but may delegate transport to external email or messaging providers.
- The portal owns business workflow state, but not generic observability tooling internals.

### Out of Scope

- Public API portal or third-party developer documentation.
- Customer-facing marketing or help-center content.
- Detailed migration plan from the current Retool implementation.
- Fine-grained infrastructure vendor selection unless it affects architecture boundaries.

## Target Components

The target system is composed of eight major layers.

### 1. Web Frontend

- Separate admin and client experiences served from a common web application or closely related frontends.
- Browser-based UI for invitations, account activation, onboarding, dashboarding, declaration creation, questionnaire completion, review, and administration.
- Stateless presentation layer that never acts as the system of record for identity, authorization, or workflow state.
- Uses backend-issued sessions or tokens and consumes backend APIs only through approved application domains.

### 2. Backend Application / API Layer

- Single business API surface that exposes domain-oriented endpoints for authentication-adjacent flows, client profile operations, declarations, question sets, assignments, reviews, and file metadata.
- Enforces validation, authorization, workflow invariants, and cross-entity consistency.
- Owns transaction boundaries for submission, assignment, review, and status updates.
- Normalizes errors into stable domain outcomes that the frontend can handle safely.

### 3. Identity and Session Management

- Dedicated identity subsystem for client authentication, account activation, password reset, session issuance, session revocation, and optional MFA.
- Internal staff authentication delegated to the organization identity provider, with role mapping into portal authorization.
- Session lifecycle separated from frontend local state to prevent the browser from becoming the source of truth.
- Invitation acceptance produces a durable identity account only after token validation and password policy checks.

### 4. Workflow / Orchestration Layer

- Coordinates long-lived business flows: invitation lifecycle, onboarding completion, assignment issuance, client submission, review, and notifications.
- Emits domain events for downstream processing, audit capture, notifications, and operational reporting.
- Supports asynchronous work where appropriate, especially for email delivery, file post-processing, and audit fan-out.
- Maintains explicit workflow states instead of relying on inferred state from UI navigation.

### 5. Relational System of Record

- Stores durable business entities, workflow states, review history, and references to uploaded evidence.
- Supports transactional integrity for operations that span declarations, answers, assignments, and feedback.
- Uses normalized tables for core entities and controlled JSON fields only where configurability is required.
- Persists timestamps, actors, and status transition history needed for traceability.

### 6. Document / File Storage Subsystem

- Stores uploaded evidence in durable object storage using opaque storage keys rather than client-visible physical paths.
- Uses short-lived signed upload and download mechanisms.
- Maintains metadata in the relational store, including ownership, MIME type, size, checksum, retention class, and association to the declaration or answer.
- Separates storage access from direct frontend trust.

### 7. Notification Service

- Sends invitation emails, assignment notifications, onboarding reminders, submission confirmations, and review outcome notices.
- Triggered by workflow events, not by direct UI-only logic.
- Supports templating, delivery tracking, retry, and failure reporting.
- Maintains message audit records linked to the originating business event.

### 8. Audit and Observability Layer

- Captures immutable audit events for authentication events, invitation usage, profile completion, assignments, submissions, feedback, status changes, and administrative configuration changes.
- Emits structured logs, metrics, and traces for operational visibility.
- Supports alerting for failed notifications, abnormal auth patterns, storage errors, and workflow dead ends.
- Provides enough observability to reconstruct who did what, when, and from which subsystem.

## Data and Request Flows

### Flow 1: Invite -> Accept Invite -> Activate Account -> Onboarding

1. An admin creates an invitation for a client with identity seed data such as name and email.
2. The backend validates that the invitation is allowed and creates an invitation record with status, expiry, actor, and token reference.
3. The workflow layer triggers the notification service to send an invitation message containing a one-time activation link.
4. The client opens the link, and the frontend requests invitation validation from the backend.
5. The identity subsystem validates token status, expiry, revocation state, and reuse rules.
6. The client sets a password or completes the configured activation flow.
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
2. The frontend requests the declaration type catalog and any active question configuration for the selected type.
3. The client enters declaration details and uploads any required evidence.
4. The backend validates declaration content, answer completeness, file associations, and business rules.
5. The backend creates the declaration, persists structured answers, stores evidence references, and sets an initial review status.
6. The workflow layer publishes the submission event and triggers downstream notifications as configured.

### Flow 4: Admin Review -> Feedback -> Status Decision

1. An admin retrieves pending or filtered declarations through review APIs.
2. The backend returns declaration details, structured answers, evidence references, prior feedback, and audit-visible timeline data.
3. The admin reviews the submission and records verification feedback.
4. The backend persists feedback as a first-class review artifact rather than a transient comment.
5. If the admin changes declaration status, the backend enforces allowed state transitions and writes the transition history.
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
- Invitation tokens are one-time, time-bounded, revocable, and stored in a non-reversible or otherwise protected form.

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

- This document does not choose a specific identity provider, object storage vendor, relational engine, or workflow engine.
- A later implementation document should define versioning policy for question sets and profile field definitions.
- A later migration document should define how to transition from platform-coupled logic to the target architecture without interrupting active clients.
- Additional future concerns may include MFA, richer evidence scanning, reviewer queues, SLA tracking, and client notification preferences.

## Appendix A: Gap Analysis from Current Retool-Hosted Implementation

This appendix compares the current implementation shape in the repository with the target architecture above. It is descriptive of current state and should not be read as design guidance.

### Subsystem: Frontend and Delivery

#### Current Retool-Hosted Implementation

- React pages are embedded in a Retool application structure.
- Admin and client surfaces coexist inside the same routed frontend.
- The frontend directly depends on generated or platform-coupled hooks for backend actions.

#### Correct Target-State Architecture

- A standalone production web frontend consumes stable backend APIs.
- Frontend concerns are separated from backend execution and platform hosting assumptions.
- Authentication state is derived from backend-managed session truth.

#### Missing Capabilities Required for Full End-to-End Operation

- Independent deployment boundary for the web frontend.
- Stable BFF or API consumption model decoupled from Retool query mechanics.
- Proper session bootstrap and authenticated app initialization patterns.

#### Priority / Impact

- Priority: High
- Impact: The current delivery model makes platform coupling a core runtime dependency and prevents the frontend boundary from behaving like a standard production portal.

### Subsystem: Identity and Session Management

#### Current Retool-Hosted Implementation

- Client login checks plaintext password equality in application logic.
- Client auth state is persisted in browser local storage.
- Invitation acceptance creates accounts directly in the business data store.

#### Correct Target-State Architecture

- Passwords are hashed and managed by a dedicated identity subsystem.
- Sessions are server-managed and revocable.
- Invitation activation is integrated with identity lifecycle controls.

#### Missing Capabilities Required for Full End-to-End Operation

- Secure password hashing and reset flows.
- HTTP-only session or equivalent token management.
- Auth rate limiting, revocation, lockout, and security monitoring.
- Separation between identity data and general business workflow handlers.

#### Priority / Impact

- Priority: Critical
- Impact: The current model is not production-safe for authentication or session trust.

### Subsystem: Backend Application Layer

#### Current Retool-Hosted Implementation

- Backend logic exists as discrete Retool query functions tied closely to specific UI actions.
- Business operations are fragmented by page-level use rather than domain-level APIs.

#### Correct Target-State Architecture

- The backend exposes coherent application services and API domains.
- Validation, authorization, transactions, and workflow rules are centralized.

#### Missing Capabilities Required for Full End-to-End Operation

- Proper service boundary and API contract design.
- Centralized authorization enforcement.
- Shared validation and error normalization strategy.

#### Priority / Impact

- Priority: High
- Impact: Fragmented handlers increase inconsistency risk and make cross-cutting concerns hard to enforce.

### Subsystem: Workflow and Orchestration

#### Current Retool-Hosted Implementation

- Invitation, onboarding, assignment, submission, and feedback flows are executed inline in request handlers.
- Notifications are triggered directly from invitation handlers.
- There is no explicit domain event or workflow orchestration layer.

#### Correct Target-State Architecture

- Long-lived business flows are modeled explicitly and emit events for downstream work.
- Notifications, audit fan-out, and asynchronous remediation are handled outside synchronous UI requests where appropriate.

#### Missing Capabilities Required for Full End-to-End Operation

- Domain event model.
- Job or workflow processing for asynchronous tasks.
- Retryable notification and post-submission processing.

#### Priority / Impact

- Priority: High
- Impact: Inline workflow execution limits resilience, recovery, and observability.

### Subsystem: Relational Data Model

#### Current Retool-Hosted Implementation

- The current schema shape covers core business tables such as clients, invitations, declarations, answers, feedback, question sets, questions, assignments, and profile field definitions.
- Some business state appears to be stored in flexible fields such as profile JSON.
- Status handling is present but transition governance is minimal.

#### Correct Target-State Architecture

- The relational model remains the system of record, but with stricter lifecycle rules, identity separation, and durable status histories.

#### Missing Capabilities Required for Full End-to-End Operation

- Transition history for workflow-critical status changes.
- Stronger schema support for audit and identity boundaries.
- Versioning or lifecycle controls for administrative configuration.

#### Priority / Impact

- Priority: Medium
- Impact: The basic model exists, but governance and traceability are incomplete.

### Subsystem: File Storage

#### Current Retool-Hosted Implementation

- File uploads use Retool storage and store file identifiers with declaration answers.
- The frontend converts files to base64 and submits them through application handlers.

#### Correct Target-State Architecture

- Files are uploaded through authorized storage flows with metadata finalization and controlled retrieval.
- Storage access is detached from UI-only conventions and supports secure evidence handling.

#### Missing Capabilities Required for Full End-to-End Operation

- Signed upload/download workflow.
- Checksum, size, retention, and ownership metadata model.
- Stronger evidence access control and download auditing.

#### Priority / Impact

- Priority: High
- Impact: Evidence handling is central to the portal and needs stronger contracts and controls.

### Subsystem: Notifications

#### Current Retool-Hosted Implementation

- Invitation and resend emails are sent directly from request handlers through Retool email.
- Other business notifications are not clearly modeled as system capabilities.

#### Correct Target-State Architecture

- Notifications are an event-driven subsystem with templates, retries, delivery status, and audit linkage.

#### Missing Capabilities Required for Full End-to-End Operation

- Notification abstraction beyond invitation emails.
- Delivery tracking and retry behavior.
- Review outcome and assignment notifications.

#### Priority / Impact

- Priority: Medium
- Impact: Core communication workflows are incomplete and operationally brittle.

### Subsystem: Audit and Observability

#### Current Retool-Hosted Implementation

- The repository shows business timestamps and reviewer records but no dedicated audit-event model.
- There is no visible structured observability or operational monitoring boundary.

#### Correct Target-State Architecture

- Audit is a first-class subsystem with immutable events.
- Logs, metrics, and traces support operations and compliance review.

#### Missing Capabilities Required for Full End-to-End Operation

- Explicit audit-event persistence.
- Structured logging and metrics.
- Alerting around auth, workflow, notification, and storage failures.

#### Priority / Impact

- Priority: Critical
- Impact: Without audit and observability, the system is not sufficiently supportable or compliant.

### Subsystem: Authorization and Administrative Safety

#### Current Retool-Hosted Implementation

- Admin actions are available in frontend routes and backend handlers, but the repository does not show a full server-side authorization model.
- Reviewer identity is partly user-supplied in feedback submission flows.

#### Correct Target-State Architecture

- Administrative access is enforced by backend role and actor identity.
- Sensitive actions use authenticated actor attribution rather than user-entered identity fields.

#### Missing Capabilities Required for Full End-to-End Operation

- Server-side role-based access control.
- Reviewer identity binding to authenticated staff accounts.
- Privileged action audit and approval controls where required.

#### Priority / Impact

- Priority: Critical
- Impact: Administrative integrity and non-repudiation are not strong enough in the current model.

## Appendix B: Evidence Used from the Repository

The target architecture and gap analysis were derived from the currently implemented application surfaces in the repository, including:

- Admin declaration listing and detail review flows.
- Client invitation, acceptance, and login flows.
- Client onboarding/profile completion flow.
- Question set and question management flows.
- Client assignment retrieval and submission flows.
- Self-service declaration submission with dynamic questions and evidence upload.

This evidence was used to ensure the target architecture covers all currently expressed business workflows without inheriting implementation constraints as design decisions.
