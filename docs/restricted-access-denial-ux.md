# Restricted Access Denial UX

## Status

Proposal for Supagate development review.

## Problem statement

Supagate correctly denies an authenticated member who does not have access to
a restricted application. Today, `/api/auth/verify` returns this response:

```json
{"authenticated":true,"authorized":false,"reason":"restricted_app"}
```

Traefik forwards that `403` response to the browser. The policy decision is
correct, but the browser experience is not: users see raw JSON with no app
name, explanation, recovery path, or way to request access. This is especially
confusing for a new user who has just completed signup and email verification.

The same issue can affect other authenticated denial reasons, including a
disabled member or an unknown protected host. Supagate should preserve secure,
deny-by-default behavior while presenting browser users with an intentional
and actionable result.

## Current flow

1. A visitor requests a service protected by Traefik forward-auth.
2. An unauthenticated visitor is redirected to Supagate login with the original
   URL in `next`.
3. After authentication, Supagate creates or updates the member record and
   evaluates the requested host's policy.
4. Universal apps allow any active member. Restricted apps require direct or
   group access.
5. A denied authenticated request receives raw `403` JSON from
   `/api/auth/verify`.

## Recommendation

Add a Supagate-hosted access-denied page and redirect ordinary browser
requests to it. Keep structured `403` responses available for programmatic
clients.

An example destination is:

```text
https://supagate.example.com/access-denied?reason=restricted_app&app=<app-id>
```

The page should obtain authoritative app and member information on the server.
Do not trust a query-string app name, email, authorization result, or return
URL for security decisions.

### Page content

For `restricted_app`, show:

- A clear heading such as "Access required."
- The protected application's display name.
- The signed-in member's email address.
- A short explanation that authentication succeeded but access has not been
  granted.
- A primary "Request access" action when that workflow is available.
- "Switch account" and "Sign out" actions.
- A safe link back to an approved destination.

Provide tailored copy for other denial reasons:

- `disabled_member`: explain that the account is disabled and provide a support
  path.
- `unknown_host`: show a generic configuration error without exposing internal
  infrastructure details.
- `missing_host`: show a generic invalid-request message and log the diagnostic
  details for administrators.

## Browser and API behavior

Content negotiation must be explicit and predictable.

- Browser document navigation: redirect to the access-denied page.
- API or non-browser request: return `403` JSON using the existing response
  shape.
- Unauthenticated request: continue redirecting browser users to login.
- Successful forward-auth request: continue returning `200` with the existing
  identity headers.

The implementation should verify how Traefik forwards status and `Location`
headers from the forward-auth endpoint. Automated tests should cover the real
proxy flow, not only direct route-handler calls.

Avoid relying solely on a broad `Accept: */*` header to identify a browser.
Useful inputs may include `Sec-Fetch-Mode`, `Sec-Fetch-Dest`, `Accept`, and an
explicit opt-in header for API consumers. The final contract should be
documented.

## Request-access workflow

The first version may provide only a friendly denial page and administrator
contact instructions. A subsequent version should add a request/approval
workflow:

1. The member selects "Request access."
2. Supagate records one pending request for the member and application.
3. Administrators see pending requests in the admin UI and optionally receive
   an email notification.
4. An administrator approves or denies the request.
5. Approval creates direct app access or adds the member to a selected group.
6. Supagate records request, approval, and denial events in the audit log.

Recommended request states are `pending`, `approved`, `denied`, and
`cancelled`. Enforce uniqueness for an active pending request per member and
application, and rate-limit submissions to prevent notification spam.

## Security requirements

- Keep unknown hosts denied by default.
- Do not make restricted applications universal as a UX workaround.
- Validate all return URLs with the existing safe-redirect rules.
- Do not reveal restricted application details to unauthenticated users.
- Derive the current member from the server-side Supabase session.
- Re-evaluate authorization after approval; do not treat the request record as
  an access grant.
- Preserve existing access-denied audit events and add request lifecycle events.
- Apply CSRF protections appropriate to any state-changing request action.

## Suggested delivery phases

### Phase 1: Friendly denial

- Add a server-rendered access-denied page.
- Redirect authenticated browser denials to it.
- Retain JSON `403` responses for API clients.
- Include sign-out and switch-account recovery actions.
- Add route, policy, redirect-safety, and Traefik integration tests.

### Phase 2: Access requests

- Add the request data model and migration.
- Add member request submission and duplicate prevention.
- Add admin review controls and optional email notification.
- Add audit events and end-to-end tests.

## Acceptance criteria

- An authenticated user without restricted-app access no longer sees raw JSON
  during normal browser navigation.
- The denial page identifies the situation without implying that login failed.
- Restricted access remains denied until an administrator grants direct or
  group access.
- API clients can still receive a machine-readable `403` response.
- Disabled-member, unknown-host, and missing-host cases have safe behavior.
- Original and fallback destinations cannot be used for open redirects.
- The behavior is verified through Traefik forward-auth in an end-to-end test.

## Open questions

- Should request access ship in the first release or follow the friendly page?
- Which administrators should receive notifications for a given app?
- Should approval grant direct access or require selecting a group?
- Should deployments be able to disable public signup or require invitations?
- What is the supported, explicit content-negotiation contract for API clients?

## Non-goals

- Changing existing universal/restricted policy semantics.
- Replacing Supabase authentication.
- Automatically granting a new member access to restricted applications.
- Exposing administrative policy details on the public denial page.
