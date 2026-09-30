# saas-client-template

## Branches and releases

Work flows `dev` → `stage` → `main`.

- Branch from `dev` as `type/scope/slug`, e.g. `feat/notes/create-dialog`, and open the pull request against `dev`. The pre-push hook rejects any other name.
- Promote `dev` to `stage` for testing, and `stage` to `main` to release.
- `main` holds releases only. Every push to it runs [semantic-release](https://semantic-release.gitbook.io), which reads the Conventional Commits since the last tag and, when one warrants a release, tags the version, publishes a GitHub release and commits the new `CHANGELOG.md` entry. `fix` makes a patch, `feat` a minor, a `BREAKING CHANGE` footer a major; other types release nothing.
- A hotfix branches from `main` as `fix/scope/slug` and merges back into `main`. Once it is released, merge `main` into `stage` and `stage` into `dev`, so the fix and the release commit reach every branch.
