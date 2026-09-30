# saas-client-template

The starter for the frontend of an InfinitiBit SaaS **Application**. Each Application is a **Service** (its own backend) plus the client in front of it; this template is the client. It already handles the parts every Application shares, so a new one starts with its own Screens:

- **Two Modes, one build.** `APP_MODE=saas` is Launched from the Tenant portal and calls the Service directly. `APP_MODE=standalone` signs in through gt and reaches the Service through gt's Facade. The browser speaks the Service's own contract in both; only the `/api` proxy knows the difference.
- **A Session no script can read.** Launch credentials leave the address bar before the router starts and live in `__Host-` HttpOnly cookies. The proxy renews them once on a `401`.
- **A Session gate drawn on the server,** so a visitor without a Session never sees the Application flash before the sign-in card.
- **Two Brands,** `default` and `gt`, chosen at runtime and independent of the Mode.
- **English and German** through Paraglide, with the locale kept in a cookie rather than the URL.
- **A generated API client.** orval turns the Service's OpenAPI spec into typed TanStack Query hooks, with MSW mocks for dev and tests.
- **List Screens with their state in the URL,** drawn by one `DataTable`.

The words in bold have exact meanings, defined in [`CONTEXT.md`](CONTEXT.md).

## Stack

[TanStack Start](https://tanstack.com/start) (React 19, Router, Query, Form, Table) on Vite and Nitro · [`@infinitibit_gmbh/ui`](https://www.npmjs.com/package/@infinitibit_gmbh/ui) with Tailwind 4 · orval + axios · zod · Paraglide · Vitest + Testing Library + MSW · oxlint + oxfmt · TypeScript 7.

## Requirements

- Node 22
- pnpm, at the version pinned in `packageManager` (`corepack enable` picks it up)

## Run it with no backend

```sh
cp .env.saas.example .env
pnpm install
pnpm dev
```

`pnpm dev` answers the Service's paths from MSW in the browser, so the example Notes list pages with no Service running. The Session gate still wants a Session: open `http://localhost:3000/dev#token=dev.dev.dev` to Launch yourself. A Launch is checked only for the token's shape, and the mocked Service checks nothing, so you land signed in. The account menu shows no Identity, which comes from the Service.

## Run it against real upstreams

Pick the Mode by copying its example over `.env`. Everything here is read by the server at runtime; nothing reaches the browser, and one image serves every Mode and Brand.

| Variable            | Mode       | Purpose                                                                                                                                                  |
| ------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_MODE`          | both       | `saas` or `standalone`. Required, no default: the server refuses to start without it.                                                                    |
| `APP_BRAND`         | both       | `default` or `gt`. Anything else falls back to `default`.                                                                                                |
| `PORT`              | both       | Where the dev and built servers listen.                                                                                                                  |
| `HOST_PORT`         | both       | Where compose publishes the container on the host.                                                                                                       |
| `TENANT_PORTAL_URL` | SaaS       | Where a visitor with no Session is sent to be Launched from.                                                                                             |
| `PLATFORM_AUTH_URL` | SaaS       | Where a Session is renewed and, on sign-out, revoked.                                                                                                    |
| `SERVICE_URL`       | SaaS       | The Service `/api` forwards to. Unset, `/api` answers `501`, so the client runs before its Service exists.                                               |
| `GT_SERVER_URL`     | Standalone | gt, which signs the user in and fronts the Service. It must list this Application in its `SSO_APP_RETURN_URIS`, or sign-in fails with `SSO_APP_UNKNOWN`. |

In SaaS, sign in from the Tenant portal, which Launches you onto `/<tenant-slug>`. In Standalone, the sign-in card sends you through gt and back to `/auth/callback`.

## Start a new Application from this template

1. Create the repo with **Use this template** on GitHub.
2. Replace `saas-client-template` everywhere with the Application's name. It names the package, the compose service (the client's hostname on the platform network), the Session cookies, and the Facade prefix in [`src/application.ts`](src/application.ts). Confirm the Facade prefix with gt, which chooses it.
3. Replace [`openapi.yaml`](openapi.yaml) with the Service's spec, or point `API_SPEC` at a file or URL. List the Service's tags in `FORWARDED_TAGS` ([`src/features/api/lib/api.ts`](src/features/api/lib/api.ts)): that list decides both which paths the proxy forwards and which hooks get generated.
4. Run `pnpm api:generate`. Every operation needs a `summary`, which names its hook (`List Notes` → `useListNotes`).
5. Build your Screens under `src/features/<feature>/`, using `src/features/notes/` as the worked example, then delete it.
6. Add your own domain words to `CONTEXT.md`.

## Scripts

| Command             | What it does                                                   |
| ------------------- | -------------------------------------------------------------- |
| `pnpm dev`          | Dev server with the MSW-backed Service                         |
| `pnpm build`        | Production build into `.output/`                               |
| `pnpm start`        | Serve the build, reading `.env` if present                     |
| `pnpm test`         | Vitest, once                                                   |
| `pnpm lint`         | oxlint, type-aware, with the design-system token rules         |
| `pnpm format`       | oxfmt (`format:check` to verify only)                          |
| `pnpm type:check`   | Compile the messages, then `tsc`                               |
| `pnpm api:generate` | Regenerate `src/features/api/generated/` from the OpenAPI spec |
| `pnpm commit`       | Write a Conventional Commit through commitizen                 |

Husky runs lint-staged on commit, commitlint on the message, and checks the branch name on push.

## Layout

```
src/
  routes/            thin route files; behaviour comes from features
  features/
    api/             the /api proxy, the axios mutator, and the generated client
    auth/            Launch, Session cookies, sign-in and the Session gate
    brand/           reading APP_BRAND for the root document
    shell/           the frame around every Screen
    notes/           the example feature; replace it
  components/        shared by more than one feature (DataTable, ListSearch)
  testing/           MSW server, render and request helpers for tests
  application.ts     this Application's name and Facade prefix
  env.server.ts      the server's environment, validated per use
messages/            en.json and de.json
docs/adr/            why things are the way they are
```

Server-only modules end in `.server.ts` and live in the feature that owns them.

## Building Screens

- Build every Screen from `@infinitibit_gmbh/ui`, styled only with its `--ib-*` tokens and icons from its `<Icon>`. `pnpm lint` rejects raw colours, arbitrary values and restyled components.
- Call the generated hooks directly and invalidate by the generated key prefix. See [`docs/agents/data-fetching.md`](docs/agents/data-fetching.md).
- A list is a `DataTable` whose page, size and search live in the URL through `listSearchSchema` and `ListSearch`.
- Put user-facing copy in `messages/*.json`, in both languages.

## Testing

Tests drive the client from the outside, with every upstream stubbed by MSW. A request no test declared fails the test.

- Call a server route as `Request` → `Response` with `respond()` from [`src/testing/respond.ts`](src/testing/respond.ts).
- Render the real router at an address with `renderRouter()` from [`src/testing/render-router.tsx`](src/testing/render-router.tsx).

Mock the Service over HTTP, never the hooks. `holdSession()` from `src/testing/session.ts` starts a test with a Session.

## Deploy

```sh
cp .env.saas.example .env   # or .env.standalone.example
docker compose up -d --build
```

The image is a two-stage Node 22 build that runs `.output/server/index.mjs` as a non-root user, with a health check on `/`. Compose joins the external `ib-saas-platform_default` network, so start the platform first.

## Branches and releases

Work flows `dev` → `stage` → `main`. `dev` is the default branch.

- Branch from `dev` as `type/scope/slug`, e.g. `feat/notes/create-dialog`, and open the pull request against `dev`. The pre-push hook rejects any other name. A squash merge turns the pull request title into the commit, so write the title as a Conventional Commit.
- Promote `dev` to `stage` for testing, and `stage` to `main` to release. Promote with a merge commit, never a squash: the release is computed from the individual commits.
- `main` holds releases only. Every push to it runs [semantic-release](https://semantic-release.gitbook.io), which reads the Conventional Commits since the last tag and, when one warrants a release, tags the version and publishes a GitHub release with the notes. The GitHub releases are the changelog. `fix` makes a patch, `feat` a minor, a `BREAKING CHANGE` footer a major; other types release nothing.
- A hotfix branches from `main` as `fix/scope/slug` and merges into `main`. Once it is released, merge `main` into `stage` and `stage` into `dev`, so the fix reaches every branch.

CI (lint, format, types, tests, build) runs on demand from the Actions tab.

## Further reading

- [`CONTEXT.md`](CONTEXT.md) — the domain language
- [`docs/adr/`](docs/adr) — the architecture decisions, one per file
- [`AGENTS.md`](AGENTS.md) — the working rules, for people and agents alike
