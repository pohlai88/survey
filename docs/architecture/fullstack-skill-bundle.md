# Full-Stack Skill Bundle

## Purpose

This bundle is the minimum practical skill set for taking the Client Declaration Portal from Retool-coupled implementation toward a production-grade full-stack system.

## Audit Outcome

- Status: useful but still too broad unless used in a strict order.
- DRY/KISS decision: keep one primary skill per concern and avoid overlapping guidance unless it closes a concrete repo gap.
- Vercel review focus:
  - authenticated upload flows should use server-side token generation and post-upload completion handling
  - environment variables should be explicit per deployment environment
  - observability should be enabled at the project level and deployment logs must be part of incident review
- GitHub review focus:
  - currently blocked because this workspace has no GitHub repository locator or remote metadata for the plugin to inspect
  - missing GitHub integration is itself a gap because CI, PR review, and workflow audit cannot be verified plugin-side

## Installed Now

- `fullstack-guardian`
  - Broad full-stack implementation guardrails.
  - Best used for cross-layer changes and end-to-end gap closure.
- `api-design-principles`
  - Use before introducing the standalone API/BFF layer.
  - Helps normalize domain boundaries, request/response contracts, and error shapes.
- `two-factor-authentication-best-practices`
  - Use when replacing local-storage-only auth with server sessions, recovery, MFA, and stronger account protection.

## Optimized Bundle

Use this trimmed set first. Everything else is secondary.

- Core architecture
  - `fullstack-guardian`
  - `api-design-principles`
- Auth and trust boundary
  - `two-factor-authentication-best-practices`
  - `zod-schema-validation`
- Frontend and integration quality
  - `coding-standards`
  - `code-quality`
- End-to-end verification
  - `playwright-best-practices`
  - `e2e-testing-patterns`
- Operations and notifications
  - `pino-logging-setup`
  - `email-best-practices`
- Documentation alignment
  - `documentation-audit`

## Secondary Skills

- `coding-standards`
  - Baseline code quality and refactor discipline.
- `code-quality`
  - Correctness-focused review for backend and shared logic.
- `zod-schema-validation`
  - Request validation once a real API layer is added.
- `playwright-best-practices`
  - End-to-end flow coverage for invite, onboarding, submission, and review.
- `react-testing-patterns`
  - Component and hook validation for frontend state and forms.
- `pino-logging-setup`
  - Structured logs for auditability and observability.
- `email-best-practices`
  - Notification abstraction beyond inline invitation email logic.
- `documentation-audit`
  - Keep architecture and implementation docs aligned.

## Recommended Usage Order

1. `api-design-principles`
   Define the standalone API/BFF domains: `auth`, `clients`, `declarations`, `questions`, `assignments`, `files`, `admin`.
2. `two-factor-authentication-best-practices`
   Replace client-trusted auth state with session-backed identity.
3. `fullstack-guardian`
   Drive integrated changes across frontend, backend, storage, and workflow boundaries.
4. `zod-schema-validation`
   Add request/response schemas at the API edge.
5. `pino-logging-setup`
   Add audit/event-oriented structured logging.
6. `playwright-best-practices`
   Lock in end-to-end verification.
7. `documentation-audit`
   Reconcile code, ops guidance, and architecture after each major boundary change.

## Target Gaps This Bundle Covers

- Standalone API/BFF layer
- Server-managed authentication and session handling
- Request validation and normalized contracts
- Full-stack observability and auditability
- Notification abstraction
- End-to-end test coverage

## Missing Coverage and Remarks

- Missing GitHub plugin audit target
  - No `origin` or repository URL is present locally, so plugin-based PR, Actions, and repo-policy review is not possible yet.
- Missing deployment implementation
  - Vercel guidance is relevant, but this repo does not yet contain a real Vercel-native API/runtime deployment surface.
- Missing file lifecycle completion
  - The repo still lacks signed upload/download, durable file metadata finalization, and evidence access auditing.
- Missing audit and RBAC implementation
  - Skills can guide this work, but the codebase still does not implement a first-class audit-event model or backend role enforcement.
- Missing automated CI verification
  - There is no checked-in GitHub Actions or equivalent workflow to enforce typecheck, build, and E2E coverage.

## Plugin-Based Best-Practice Notes

- From Vercel docs:
  - secure uploads should authenticate before token generation and run post-upload completion logic server-side
  - deployment environments should be explicit through environment variables
  - observability and deployment logs should be part of standard operational review
- From GitHub plugin constraints:
  - repository metadata must be available before repo audit, PR review, and Actions inspection can be trusted as complete

## Notes

- The external skill installer reported PromptScript global-install warnings after copy, but the skills are present under `C:\Users\dlbja\.agents\skills`.
- For this repo, use this bundle together with `docs\architecture\client-declaration-portal-target-architecture.md`.
