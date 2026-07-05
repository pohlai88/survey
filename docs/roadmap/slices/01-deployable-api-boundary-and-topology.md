# Slice 01: Deployable API Boundary and Topology

## Overview

This slice establishes the production runtime boundary between the Vercel-hosted frontend and backend domain operations. The current Vercel deployment proves the Vite frontend can be served, but production `/api/...` calls return `404`. This slice turns that frontend shell into an application that can call a real backend contract.

## Goals

- Define the canonical backend entry point for production.
- Make frontend runtime configuration explicit and environment-specific.
- Expose domain operations through HTTP endpoints with stable request and response envelopes.
- Remove ambiguity between Retool query invocation, local test mocks, and production API calls.

## Non-goals

- Implement every business workflow in depth.
- Choose final providers for database, identity, storage, queueing, or email.
- Build public API documentation.

## Scope

- `frontend/lib/backend/runtime.ts`
- New API/BFF routing layer or external backend adapter
- Environment variables for `development`, `preview`, and `production`
- Request correlation ID generation and propagation
- API response envelope and error serialization

## Proposed Design

The frontend should call one backend boundary in production. The recommended first production shape is a same-origin BFF if the backend can run on the same hosting platform; otherwise use `VITE_PORTAL_API_BASE_URL` and treat that value as required in production.

Canonical operation path:

```text
frontend operation name -> /api/<domain>/<operation>
auth.getClientSession -> POST /api/auth/getClientSession
declarations.submitFeedback -> POST /api/declarations/submitFeedback
```

Canonical response envelope:

```json
{
  "data": {},
  "error": null,
  "request_id": "req_..."
}
```

Canonical error envelope:

```json
{
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication is required.",
    "details": {}
  },
  "request_id": "req_..."
}
```

## Interfaces and Dependencies

- Frontend depends on `VITE_PORTAL_API_BASE_URL` only when backend is not same-origin.
- Backend endpoints depend on shared request parsing, response serialization, and operation dispatch.
- All handlers must accept actor context later provided by Slice 02.

## Implementation Steps

1. Decide same-origin BFF versus external API URL for the first production runtime.
2. Add a production configuration check that fails fast when no backend boundary exists.
3. Implement a generic HTTP operation dispatcher for existing backend operation names.
4. Normalize response and error envelopes.
5. Add request ID propagation from frontend request through backend logs.
6. Update Vercel project settings or environment configuration.
7. Redeploy and verify `/api/auth/getClientSession` no longer returns `404`.

## Enterprise Controls

- Owner: platform/API engineer with frontend reviewer.
- ADR required if the slice chooses same-origin BFF, external API service, or managed backend as the long-term topology.
- Secrets and environment variables must be documented without exposing secret values.
- Production must not allow silent fallback to Retool query invocation or local mocks.
- API responses must include request IDs for support correlation.
- Topology changes must update Vercel project settings and the architecture deployment evidence appendix.

## Acceptance Criteria

- Production frontend can call `POST /api/auth/getClientSession` or the configured external equivalent.
- Unknown operations return a normalized `404` API error, not a platform 404 HTML response.
- Backend validation errors return `400` with a stable code and message.
- Unauthenticated requests return `401`.
- Frontend runtime has no silent fallback that masks missing production backend configuration.

## Validation

- `pnpm --dir frontend run build`
- `pnpm --dir frontend run typecheck`
- `pnpm --dir frontend run test:api`, which checks API boundary behavior, method rejection, malformed JSON handling, readiness, runtime bridge gating, and verifies every backend handler has a matching API operation contract.
- Production smoke check:

```powershell
Invoke-WebRequest -Uri "https://<production-host>/api/health/readiness" -Method POST -ContentType "application/json" -Body "{}"
```

Expected result after this slice: JSON API response with `api_boundary: true`, not `404` from Vercel static routing.

## Rollback

- Keep the previous frontend deployment available in Vercel.
- If API routing breaks the frontend, rollback the Vercel deployment alias to the last known static build.
- Do not rollback database or business data in this slice because no durable business writes are introduced here.

## Risks and Mitigations

- Risk: BFF path becomes a thin wrapper around Retool-specific assumptions.
- Mitigation: Keep the dispatcher operation-oriented at first, but enforce HTTP contracts and remove Retool runtime dependency from production.

- Risk: External backend URL introduces CORS and cookie complexity.
- Mitigation: Prefer same-origin where feasible; otherwise define CORS, credentials, and cookie domain rules explicitly.

## Done Evidence

- Deployed production URL returns JSON from `/api/auth/getClientSession`.
- Unknown production API operations return JSON `OPERATION_NOT_FOUND`, not a platform 404 page.
- Non-POST requests return JSON `METHOD_NOT_ALLOWED`; malformed JSON returns JSON `INVALID_JSON`; `OPTIONS` returns `204` with API headers.
- Resource-backed production operations return JSON `BACKEND_RESOURCE_UNAVAILABLE` when required resource configuration is missing.
- Resource-configured operations return JSON `BACKEND_ADAPTER_NOT_IMPLEMENTED` until real adapters are connected.
- Resource-backed API errors identify the missing resource class: `database`, `storage`, or `notification`.
- `POST /api/health/readiness` reports non-secret API, admin-auth, resource-configuration, and adapter-implementation readiness.
- API operation contracts live in `frontend/api/_contracts.js` and are consumed by both the route and the contract coverage check.
- `pnpm --dir frontend run test:api` proves API behavior and contract coverage for all backend handlers.
- Frontend sends request IDs to the API boundary.
- Frontend production runtime uses HTTP API calls by default; Retool and injected backend bridges require explicit `VITE_ENABLE_*_BRIDGE` flags outside development.
- API responses set `Cache-Control: no-store`, `Pragma: no-cache`, and `X-Content-Type-Options: nosniff`.
- Architecture doc and roadmap links are updated to reflect that API routing is active and resource adapters remain missing.

## Current Implementation Status

- Status: `Routing complete; backend resource adapters still missing`.
- Production deployment: `dpl_738Yj1Vcb1Z3ffB1nyDRLj3PWjKm`.
- Production alias: `survey-one-gules.vercel.app`.
- Environment contract: `frontend/.env.example` names same-origin/external API, explicit bridge flags, admin guard, database, notification, and storage settings.
- Verified:
  - `GET /` returned `200`.
  - `POST /api/client/getMyAssignments` with no session returned JSON `401 UNAUTHORIZED`.
  - `POST /api/admin/inviteClient` without configured admin auth returned JSON `503 ADMIN_AUTH_UNCONFIGURED`.
  - `POST /api/bad/missing` returned JSON `404 OPERATION_NOT_FOUND`.
  - `GET /api/health/readiness` returned JSON `405 METHOD_NOT_ALLOWED`.
  - `POST /api/health/readiness` returned `200` with `status: degraded` and missing `database`, `notification`, and `storage` resources and adapters.
  - API responses included `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, and `X-Request-Id`.
- Remaining work moves to the next backend slices: replace Retool-coupled resource assumptions with production database, storage, email, identity, workflow, and observability adapters.
