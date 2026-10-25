# `backfill-cache`

> Backfill Cache Providers

## Usage

This package shouldn't be used directly. It's an internal package to
[`backfill`](https://www.npmjs.com/package/backfill).

`LocalCacheStorage` retains the original copy-based fetch and put behavior.
Lage selects the experimental materialized-output provider only when
`experimentalCacheHitOptimization: true` is set in `lage.config.js`.
Standalone Backfill callers retain the legacy provider by default.

Experimental cache entries retain their existing directory layout. An optional
`<hash>.state.json` sibling records verified output identities, sizes, permissions,
and nanosecond modification/status-change timestamps. Unchanged outputs are not
rewritten on subsequent fetches; missing or modified outputs are restored.
Older entries work without this metadata and acquire it after verification.

`CacheStorage.isUpToDate(hash)` defaults to false. The experimental provider
implements it as a read-only local-output check. It returns false
without complete metadata, when the cache directory is missing or replaced, or
when any output changes. It never restores files or contacts remote storage.
Symlinks and filesystems without usable file identities/status timestamps use the
normal fetch path. Content verification brackets reads with metadata checks, and
new entries and metadata are published by rename only after writes finish.

## Optional Rust output validation

A matching N-API binary accelerates the metadata checks without changing receipt
formats or relaxing validation. It compares file identities, permissions, sizes,
and nanosecond modification/status-change timestamps in bounded native batches.
Windows status-change time is distinct from file creation time.
The addon image is retained before asynchronous work is queued so its shared
worker pool remains safe across Node Worker teardown. Platforms without module
retention support use serial native validation instead of unmanaged threads.

After configuration opt-in, `BACKFILL_CACHE_NATIVE` selects the backend.
It does not enable the optimization or load the addon when the setting is off:

- `auto` (default): use a compatible packaged binary when available; otherwise
  use JavaScript. An incompatible or unloadable binary produces a warning.
- `0` or `false`: use JavaScript without loading a native binary.
- `1` or `true`: require Rust. Missing/incompatible binaries and native validation
  errors fail explicitly rather than silently falling back to cache restoration.

From the Lage repository root, build the optional binary with
`yarn workspace backfill-cache native:build`.
Rust is needed to build it, not to run a package containing the binary. `CARGO`
and `RUSTC` can select a toolchain without changing global configuration.
The existing JavaScript implementation remains available on unsupported hosts.
