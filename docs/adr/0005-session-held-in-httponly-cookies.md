# ADR 0005: The Session Is Held in HttpOnly Cookies, Never Web Storage

## Status

Accepted

## Context

A **Launch** hands the browser an access token and, usually, a refresh token in the URL fragment: the Tenant portal opens `/<tenant-slug>#token=…&refresh_token=…` in SaaS, and gt's sign-in callback redirects to `/auth/callback#token=…&refresh_token=…` in Standalone. Something has to hold those tokens for the life of the **Session**.

A token in `localStorage`, `sessionStorage` or a JavaScript variable is readable by any script on the page, so a single cross-site scripting flaw hands over a credential that is good upstream until it expires. The refresh token is worse, since it lasts for days.

## Decision

**The browser's script holds the credentials for one request and then forgets them. From then on only this origin's server can read them.**

- Before the router is created, the browser reads `token` and `refresh_token` from the fragment, removes them from the address bar with `history.replaceState`, and `POST`s them as JSON to `/session`.
- `/session` stores them in `__Host-<app>-session` and `__Host-<app>-refresh`: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, with no `Max-Age`. The `__Host-` prefix stops a sibling host from planting or overwriting them. The Application name in the cookie name keeps Applications that share a host (every `localhost` port shares one cookie jar) from overwriting each other.
- Each token is checked for shape before it goes into a `Set-Cookie`. The request must be JSON, which an HTML form cannot send and a cross-site `fetch` cannot send without a preflight.
- A Launch without a refresh token still starts a Session. It also clears any refresh cookie left from a previous Session, which Platform Auth would read as token reuse and answer by revoking the whole family.
- Standalone adoption requires `__Host-<app>-arrival`. `/signin` sets it for ten minutes before sending the browser to gt, and adoption spends it. gt's callback address is public, so anyone can send a link to it carrying their own pair; what a link cannot do is give the victim's browser a `__Host-` cookie that this origin set. SaaS has no such mark, because a portal Launch never goes through `/signin`.
- `DELETE /session` clears both cookies. In SaaS it first revokes the Session at Platform Auth (`POST /api/v1/auth/logout`) on a best-effort basis, with a timeout. In Standalone nothing is revoked upstream. gt's tokens are stateless and its `/logout` only clears gt's own cookies, so there is nothing to call. The next sign-in forces Entra's account prompt instead.

## Consequences

- Every upstream call has to go through this origin's server, which turns the cookie into a bearer header. That is the API proxy.
- The server cannot see a fragment, so the arrival routes are rendered by the client and navigate to `/` once the Launch has been adopted. A server redirect would reach the Session gate before the cookie exists.
- A single path segment is a tenant slug. An unknown one-segment address lands on `/` rather than on not-found.
- No QueryClient is cleared on a Launch. The portal opens every Launch in a new tab (`window.open(…, '_blank', 'noopener')`) and gt's callback is a full redirect, so every Launch starts a new document with an empty cache.
- The arrival cookie proves that this browser started a sign-in, not that this particular pair belongs to that sign-in. Binding the two needs gt to echo back a nonce this Application supplies.
- A Standalone sign-out leaves gt's tokens valid until they expire.
- With no arrival mark in SaaS, a crafted `/<slug>#token=<someone else's token>` link signs the person who follows it in as that someone (login CSRF). Closing this needs the Tenant portal to send something the Application can check.
- Platform Auth revokes only with an access token that is still valid. Signing out after the access token has expired leaves the refresh-token family alive until the refresh that comes with the API proxy is used to renew first.
- Hydration waits for `POST /session`, which times out after ten seconds.
