# saas-client-template

## Run it with no backend

```sh
cp .env.saas.example .env
pnpm install
pnpm dev
```

`pnpm dev` answers the Service's paths from MSW in the browser, so the example Notes list pages with no Service running. The Session gate still wants a Session: open `http://localhost:3000/dev#token=dev.dev.dev` to Launch yourself. Adoption checks only the token's shape and the mocked Service checks nothing, so you land signed in. The account menu shows no Identity, which comes from the Service.

## Branches and releases

Work flows `dev` → `stage` → `main`. `dev` is the default branch.

- Branch from `dev` as `type/scope/slug`, e.g. `feat/notes/create-dialog`, and open the pull request against `dev`. The pre-push hook rejects any other name. A squash merge turns the pull request title into the commit, so write the title as a Conventional Commit.
- Promote `dev` to `stage` for testing, and `stage` to `main` to release. Promote with a merge commit, never a squash: the release is computed from the individual commits.
- `main` holds releases only. Every push to it runs [semantic-release](https://semantic-release.gitbook.io), which reads the Conventional Commits since the last tag and, when one warrants a release, tags the version and publishes a GitHub release with the notes. The GitHub releases are the changelog. `fix` makes a patch, `feat` a minor, a `BREAKING CHANGE` footer a major; other types release nothing.
- A hotfix branches from `main` as `fix/scope/slug` and merges into `main`. Once it is released, merge `main` into `stage` and `stage` into `dev`, so the fix reaches every branch.
