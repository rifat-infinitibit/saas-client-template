# ADR 0006: Two Modes, One Contract; the Seam Is the API Proxy

## Status

Accepted

## Context

The **Service** is reached two ways. In **SaaS** the client calls it directly with the user's platform token. In **Standalone** it sits behind gt's **Facade**, which mounts it under a prefix of its own, because gt already answers paths such as `/api/files`. The Facade authenticates by gt's `sso_access_token` cookie and ignores a bearer header. The two Modes also renew a **Session** differently: Platform Auth takes the refresh token as JSON and returns the pair as JSON, while gt takes and returns both tokens as cookies.

The existing clients split on where to absorb that difference. One generated a client per Mode and chose between them with a build-time alias, so every Screen compiled against two contracts. Another rewrote paths in its proxy. ADR 0005 already puts every upstream call through this origin's server, because only the server can read the Session.

## Decision

**The browser speaks the Service's own contract in both Modes. The same-origin proxy under `/api` is the one place that knows the Mode.**

- One generated client against the Service's paths (`/api/<tag>/…`). In Standalone the proxy inserts the Facade's prefix (`FACADE_PREFIX` in `src/application.ts`) in front of the unchanged path and sends the token as `sso_access_token` as well as a bearer.
- Only paths under the tags in `FORWARDED_TAGS` (`src/api.ts`) are forwarded; anything else is a `404` that never leaves. orval's tag filter is to read the same constant, so no hook is generated for a path the proxy would refuse.
- Only `accept` and `content-type` go upstream. A browser that could send `x-tenant-id` or a cookie of its own could claim a tenant or a credential the Service trusts.
- On a `401` the proxy renews once, at Platform Auth or gt, replays the request, and sets the new pair on the answer. The renewal is single-flight per refresh token and its result is kept for a minute, because Platform Auth reads a spent refresh token as theft and revokes the whole family. A second `401`, or a renewal that fails for any reason, clears the Session cookies.
- The **Identity** is `/api/identity`, shaped by hand into `{ email, workspace, roles, permissions }` from the Service's `/api/session` in SaaS and from gt's `/api/auth/sso/me` in Standalone, which names no **Workspace**. Platform Auth's `/auth/me` names neither roles nor tenant, and its `/auth/context` needs the Application's id and tenant headers the Service already holds, so in SaaS the Service answers.
- In SaaS, `SERVICE_URL` is optional. Without it `/api` answers `501` and the rest of the Application still runs.

## Alternatives considered

- **A generated client per Mode, picked at build time.** Every Screen types against two contracts, and one image can no longer run as either Mode.
- **The browser calling upstreams directly.** It would need the token, which ADR 0005 keeps out of reach of any script.
- **A path denylist.** Any path the Service adds later would be reachable before anyone decided it should be.

## Consequences

- A new Service surface is reachable only once its tag is added to `FORWARDED_TAGS`. That also brings it into generation.
- Single-flight holds within one server process. Two instances serving the same browser could each spend the same refresh token; closing that needs a shared store.
- The Facade's prefix is gt's to choose. It is a rename-checklist item, not something the client derives.
- The Identity endpoint is not in any Service spec, so its type and hook are written by hand. Every Service must serve `/api/session` with `email`, `tenant_slug`, `roles` and `permissions`, and without `SERVICE_URL` SaaS has no Identity either.
- A Platform Auth outage during a renewal signs the user out, the same as a refused refresh token.
- The Service's paths start with `/api`, where a Service mounts each tag, so the example spec's paths are `/api/notes`, not `/notes`.
