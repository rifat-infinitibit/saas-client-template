# saas-client-template

## Run it with no backend

```sh
cp .env.saas.example .env
pnpm install
pnpm dev
```

`pnpm dev` answers the Service's paths from MSW in the browser, so the example Notes list pages with no Service running. The Session gate still wants a Session: open `http://localhost:3000/dev#token=dev.dev.dev` (on your `PORT`) to Launch yourself. A Launch is checked only for the token's shape, and the mocked Service checks nothing, so you land signed in. The account menu shows no Identity, which comes from the Service.

## Start a new Application

Click **Use this template** on GitHub and tick **Include all branches**, or create `stage` and `main` from `dev` afterwards. Then, in the new repository:

1. **Application name and cookie prefix.** Set `APPLICATION_NAME` in `src/application.ts` to the code the platform and gt know the Application by; the cookie prefix follows from it. Set `FACADE_PREFIX` to the path gt's Facade mounts the Service under, which gt chooses. Put the same name in `package.json`, the service in `compose.yaml` (it becomes the hostname on the platform network) and the headings of `README.md` and `AGENTS.md`, and the display name in the page `title` in `src/routes/__root.tsx` and the heading of `CONTEXT.md`. Point `AGENTS.md` at the new repository's issues.
2. **`PORT`.** Pick the port in both `.env.*.example` files. It is part of the Launch URL the Tenant portal registers and of the return URI gt lists in `SSO_APP_RETURN_URIS`, so give each Application its own. `HOST_PORT` is where compose publishes it and `SERVICE_URL` where the Service answers.
3. **Service spec.** Replace `openapi.yaml` with the Service's OpenAPI spec, or run generation with `API_SPEC=<file or URL>`. Each operation needs a `summary`, which names its hook.
4. **Forwarded tags.** List the Service's tags in `FORWARDED_TAGS` (`src/features/api/lib/api.ts`). The proxy forwards only those and orval generates only those. Run `pnpm api:generate`.
5. **Brand assets.** Each Brand wears the `favicon.ico`, `logo.svg` and `mark.svg` in `public/brand/<brand>/`. They are the company's, not the Application's: replace them only where the Application ships its own. A new Brand needs those three files, its name in `src/features/brand/lib/brand.ts` and a theme imported in `src/styles.css` as `brand-gt.css` is.
6. **Nav items.** Set the `nav` list in `src/routes/_authenticated.tsx`, with its labels in `messages/*.json`.

Then delete the Notes example, and run `pnpm lint`, `pnpm type:check`, `pnpm test` and `pnpm build`.

### Delete the Notes example

Notes stands in for the Service until yours exists; remove it once steps 3 and 4 point at your Service.

- Delete `src/features/notes/`, `src/routes/_authenticated.notes.tsx` and `src/__tests__/notes.test.tsx`.
- Drop the Notes nav item from `src/routes/_authenticated.tsx`, and `shell_nav_notes` and every `notes_*` key from `messages/en.json` and `messages/de.json`.
- In `src/features/api/lib/dev-service.ts`, swap the Notes handlers for the ones orval generated in `src/features/api/generated/service.msw.ts` (`get<Service>Mock()`), or for none.
- Delete `openapi.yaml` unless step 3 replaced it with your Service's spec.
- Rewrite the Notes examples in `docs/agents/data-fetching.md` with your own feature.
- Run `pnpm build` once: it regenerates `src/routeTree.gen.ts` without the Notes route, which the type check and the tests read.

## Branches and releases

Work flows `dev` → `stage` → `main`. `dev` is the default branch.

- Branch from `dev` as `type/scope/slug`, e.g. `feat/notes/create-dialog`, and open the pull request against `dev`. The pre-push hook rejects any other name. A squash merge turns the pull request title into the commit, so write the title as a Conventional Commit.
- Promote `dev` to `stage` for testing, and `stage` to `main` to release. Promote with a merge commit, never a squash: the release is computed from the individual commits.
- `main` holds releases only. Every push to it runs [semantic-release](https://semantic-release.gitbook.io), which reads the Conventional Commits since the last tag and, when one warrants a release, tags the version and publishes a GitHub release with the notes. The GitHub releases are the changelog. `fix` makes a patch, `feat` a minor, a `BREAKING CHANGE` footer a major; other types release nothing.
- A hotfix branches from `main` as `fix/scope/slug` and merges into `main`. Once it is released, merge `main` into `stage` and `stage` into `dev`, so the fix reaches every branch.
