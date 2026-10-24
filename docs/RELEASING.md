# Releasing MakePace

Use Semantic Versioning: alpha versions follow `0.2.0-alpha.1`, `alpha.2`, etc.
Patch versions fix compatible behavior; pre-1.0 minor versions may break behavior
and must document migration. The package version is the desktop version.

1. Run `npm run check` and `npm run build:site`. Inspect the desktop on supported OSs.
2. Update the changelog. Run `npm version <version> --no-git-tag-version` to
   synchronize package/lock versions, then commit reviewed changes.
3. Push the matching tag: `git tag v0.2.0-alpha.1` and
   `git push origin v0.2.0-alpha.1`.
4. Desktop builds validates tag/package agreement, runs checks, builds four native
   installers, and creates a **draft** release with SHA-256 checksums.
5. Download and smoke-test artifacts, review notes, then publish the draft.
   Alpha tags remain prereleases. Never overwrite released installers; bump the version.

The landing currently sends visitors to the GitHub installation guide. Its
installer chooser is preserved but disabled. If re-enabled, its installer URLs
are generated from the package version; publish that release before enabling it.
The app checks only on request. Stable installs ignore prereleases; alpha installs
include them. Workspaces stay in OS user data across installer upgrades.

## Automation

Pull requests use read-only checks without publishing credentials. Only the final
tagged release job gets release write permissions. Workflow dispatch creates test
artifacts, not releases. Never execute untrusted pull request code with secrets.
Future signing credentials belong in GitHub environment secrets.

The repository must be public for unauthenticated downloads/update checks.
The optional legacy R2 gateway is no longer the release source. Keep existing
downloads until old links are no longer needed.

Vercel builds with `npm ci --ignore-scripts` and `npm run build:site`, then serves
only `dist/site`. Never host the local server or workspace data. Open sourcing
does not remove OS signing warnings.
