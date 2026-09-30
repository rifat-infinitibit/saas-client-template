# ADR 0008: List State Lives in the URL

## Status

Accepted

## Context

A list Screen has a page, a page size and a search. If those are held in component state, reload drops them, Back skips over them and a shared link opens a different list than the sender saw. A Screen can also draw its table in any number of ways, so no two lists would page, align or name their actions the same.

## Decision

**A list's page, size and search live in the address, and `DataTable` is the only caller of the design system's table and pagination primitives.**

- One zod schema, `listSearchSchema` (`src/components/list-search.tsx`), holds `page`, `size` and `search`. Each has a default and a `.catch`, so a malformed value falls back instead of failing the route. The schema goes straight to the route's `validateSearch`; zod 4 is a Standard Schema and needs no adapter. A route with filters of its own `.extend`s it.
- The route strips the defaults with `stripSearchParams(listSearchDefaults)`, so an untouched list is a bare URL.
- The Screen reads the address with `getRouteApi(...).useSearch()` and passes it straight to the generated hook, whose query key follows. It writes with a functional `navigate`, so a write never drops a parameter it does not name.
- A page change pushes a history entry, so Back returns to the previous page. A search commits through `ListSearch`: the field shows each keystroke at once, and a TanStack Pacer debouncer commits once typing stops or the field loses focus. The commit uses `replace: true` and resets `page` to 1 in the same navigation, so no request ever pairs the new search with the old page.
- The query keeps `keepPreviousData`, so the current page stays on screen while the next one loads.
- `DataTable` (`src/components/data-table.tsx`) is the one component that imports `Table*` and `Pagination`. A Screen passes it columns, rows and the page. It never draws a table itself.

## Alternatives considered

- **Component state.** It is lost on reload and invisible to Back and to shared links.
- **A search commit per keystroke.** It floods history and sends a request per letter.
- **Pushing each search.** Back would retrace every search the user settled on while typing, instead of leaving the list.
- **Client row models in TanStack Table.** The Service already pages and searches. Doing it again in the client would show different results than the Service.

## Consequences

- A link can hold a page past the last one. The list then shows its empty state rather than clamping.
- The size has no control on the Screen yet. It is read from the address and bounded at 100, as the Service allows.
- The router parses search values as JSON, so a hand-typed `?search=123` is read as a number and falls back to no search. A search the field commits is written quoted and survives.
- "Only `DataTable`" is a convention reviewers hold, not a lint rule.
