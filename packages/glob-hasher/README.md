# glob-hasher

Native globbing and hashing for Node.js, implemented with Rust and NAPI-RS.
The source was imported from `kenotron/glob-hasher` at commit
`e7a94023aaef2a984972d17e5f2f235fcccd6fe5` (the upstream 1.4.3 baseline).
The import includes upstream's `gix` update and Linux ARM64 support.

## API

```js
const { hash, hashGlobGit, hashGlobXxhash, glob, stat } = require("glob-hasher");

hash(["src/index.ts"], { cwd: process.cwd() });
hashGlobGit(["**/*.ts", "!node_modules/**"], { cwd: process.cwd() });
hashGlobXxhash(["**/*.ts"], { cwd: process.cwd(), concurrency: 16 });
glob(["**/*.ts"], { cwd: process.cwd(), gitignore: true });
stat(["src/index.ts"], { cwd: process.cwd() });
```

`hash` and `hashGlobGit` return Git blob SHA-1 hashes. Text CRLF line endings
are normalized to LF; binary files are unchanged. `hashGlobXxhash` returns
64-bit XXH3 values as JavaScript `bigint`s. `stat` returns file sizes and
modification times in milliseconds as `bigint`s. See `index.d.ts` for all
signatures and nullable results.

## Supported platforms

Prebuilt packages support macOS, Windows, and Linux glibc on x64 and ARM64.
Linux release binaries target glibc 2.17. Musl, Android, FreeBSD, and 32-bit
targets are not built or published, even though the generated loader includes
branches for them.

Development and CI target Node 22 and newer. The standalone package retains its
Node-API 8 engine compatibility; older runtimes are not a migration release gate.
Installing a published package requires neither Rust nor install scripts.

## Development

From the repository root, install the Yarn dependencies, then run:

```sh
yarn workspace glob-hasher build
yarn workspace glob-hasher test --runInBand
yarn workspace glob-hasher lint
```

Install Rust with rustup first; `rust-toolchain.toml` selects the exact
compiler and components. Cargo uses the committed package-local lockfile.
Rust 1.97 is pinned because Rust 1.98+ passes an ARM64 linker option that Zig
does not yet support.
The native build copies the host binding into its sibling binary workspace.
Root `yarn build` and `yarn ci` also build the native package explicitly.
No install lifecycle scripts are needed.

The original Rust implementation is retained, with mechanical changes needed
for the pinned compiler's Clippy checks. API tests preserve upstream's hash
snapshots. `index.js` and `index.d.ts` are generated NAPI-RS bindings; builds
regenerate both files into `temp`, and fail if either differs from its checked-in
copy. To intentionally update bindings, review and copy the generated files.

## CI and release

The PR workflow builds and tests all six targets, including offline packed
installation tests. Linux builds use pinned Zig tooling to retain the glibc
baseline. Each artifact records its target, source commit, and SHA-256 digest.
Ordinary workspace CI reuses these verified binaries instead of compiling Rust.

The wrapper and all six binary packages form one Beachball version group.
The wrapper's `workspace:*` optional dependencies become exact versions when
packed or published. Native packages carry the repository's MIT license.

Before publishing, download and assemble the complete artifact set. The download
command requires a successful `push` run of this repository's PR workflow on
`main`, at the exact checked-out revision:

```sh
node scripts/native-packages.js download RUN_ID native-artifacts
node scripts/native-packages.js assemble native-artifacts
yarn release
```

Use `yarn release:pack` instead of `yarn release` to version and pack packages
without publishing or pushing.

`yarn release` records the source revision before Beachball's version commit.
The prepublish hook rejects missing, modified, mismatched, or incomplete native
artifacts. Beachball orders binary dependencies before the wrapper and its
consumers. There is no separate NAPI-RS publisher.
