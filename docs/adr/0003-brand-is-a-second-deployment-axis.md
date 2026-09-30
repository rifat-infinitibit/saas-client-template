# ADR 0003: Brand Is a Second Deployment Axis

## Status

Accepted

## Context

An Application ships to InfinitiBit's own deployments and to Grant Thornton's. GT's has to read as their product: their colours, typeface, favicon, logo and mark. No screen, route, copy or capability differs.

Today the two axes coincide — Standalone is GT's, SaaS is InfinitiBit's — which makes deriving the Brand from the **Mode** look free. The design system already keeps them apart: a Brand rides `data-theme`, light and dark ride a class, and published theme packages emit `[data-theme='<brand>']` selectors.

## Decision

**`APP_BRAND=default|gt`, read on the server at runtime.** A root server function reads it and the root document sets `<html data-theme>`, so the server-rendered first byte is already themed. The browser learns one word; one image serves either Brand.

**Never derived from the Mode, and never validated against it.** A white-labelled SaaS tenant or a default-branded Standalone deployment is a combination nobody has asked for yet, not a wrong one.

**Anything else falls back to `default`: unset, empty, or a typo.** A wrong Mode talks to the wrong upstream and should stop; a wrong Brand is the same working app in the wrong colours, and a cosmetic mistake should not be an outage.

**The attribute is `data-theme`; the concept is Brand.** The DOM uses upstream's spelling so a published theme package's selector matches unchanged.

**Every Brand ships the same filenames** under `public/brand/<brand>/` — `favicon.ico`, `logo.svg`, `mark.svg` — so each asset is one interpolation rather than a mapping to keep in step.

**A Brand's stylesheet only overrides `--ib-*` values the theme already declares, under `:root[data-theme='<brand>']`.** Its `@font-face` rules are the one unscoped part; `@font-face` is lazy, so the other Brand never fetches the files.

**`src/brand-gt.css` stands in for a GT theme package the design system does not publish yet.** ADR 0002 sends a missing token or variant upstream rather than overriding it locally. A Brand's stylesheet is neither of those: it mints no token and restyles no component. It is a theme, the same token values under the same `[data-theme]` scope that a published theme package ships. When `@infinitibit_gmbh/theme-gt` exists, one `@import` replaces this file.

## Alternatives considered

- **Deriving the Brand from `APP_MODE`.** Correct for every deployment today, but encodes a current coincidence as architecture.
- **A build-time variable and one image per Brand.** Drops the inactive Brand's bytes, at the cost of two pipelines and a Brand frozen at build.
- **Throwing on an unknown value.** The first boundary that asks is the root loader, so one typo in a cosmetic setting would answer every request with a `500`.

## Consequences

- Every image carries both Brands, including GT's licensed typeface on disk in InfinitiBit deployments.
- A GT deployment that forgets or mistypes `APP_BRAND` ships InfinitiBit's colours and says nothing. No health check catches it; that is the accepted cost of the fallback.
- Adding a Brand is a key in `src/brand.ts`, a directory under `public/brand/`, and a scoped stylesheet.
