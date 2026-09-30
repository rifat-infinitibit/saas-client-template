# ADR 0003: The Locale Comes From a Cookie, Never the URL

## Status

Accepted

## Context

The Application ships in English and German through Paraglide 2. Paraglide's TanStack Start example puts the locale in the URL (`/de/...`) through its `url` strategy, `urlPatterns` and a router rewrite.

In SaaS the Tenant portal **Launches** the user onto a tenant-slug landing, `/<slug>`. The Workspace is still read from the Session, but the slug occupies the first path segment of every Launch URL. A locale segment in the same position collides with it — a slug `de` becomes indistinguishable from the German locale — and any locale redirect lands on the Launch path, where the credentials in the fragment are still being adopted.

## Decision

**The locale is resolved from the `PARAGLIDE_LOCALE` cookie, then the browser's preferred language, then English. It never appears in a URL.**

- `strategy: ['cookie', 'preferredLanguage', 'baseLocale']`, with no `urlPatterns`, no `routeStrategies`, no router rewrite and no locale route segment.
- The options live once in `project.inlang/paraglide.config.ts`, read by both the Vite plugin and the `paraglide-js compile` CLI.
- `paraglideMiddleware` wraps the server entry, so the server renders in the request's locale and `<html lang>` comes from `getLocale()`.
- The generated `src/paraglide/` is not committed. `prepare` compiles it on install, so type-aware lint works on a fresh clone, and `type:check` compiles it before `tsc`.

## Consequences

- Launch URLs are untouched by language.
- Compiling fetches inlang's message-format plugin from a CDN, pinned by version in `settings.json`, as inlang's own setup does.
- A shared link opens in the reader's language, not the sender's, and search engines see one URL per page. Neither matters for a signed-in Application.
- Switching language sets the cookie and reloads; there is no locale state to keep in sync.
- inlang writes its own `project.inlang/.gitignore` that ignores everything but `settings.json`, so `paraglide.config.ts` is tracked by force (`git add -f`).
