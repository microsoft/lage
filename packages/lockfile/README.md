# @lage-run/lockfile

**Experimental.** Utilities for computing which workspace packages are actually affected by a
package-manager lockfile change, so that Lage's cache hashing and `--since` filtering can avoid
treating every lockfile change as a repo-wide, full-graph invalidation.

Only **pnpm** is supported, and only the latest pnpm lockfile format (`lockfileVersion 9.0`).
Strict, deterministic lockfiles (like pnpm's) are what make this analysis reliable. For
unsupported package managers or lockfile versions, Lage falls back to its previous blanket
invalidation behavior.

See the [caching guide](https://microsoft.github.io/lage/docs/guides/cache) for details.
