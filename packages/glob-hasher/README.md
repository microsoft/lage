# glob-hasher

A library that will glob for files and return the xxhash in u64 / BigInt as a JS library. It uses NAPI-RS to interop with the Rust libraries doing the heavy lifting of both globbing and hashing, using the `xxhash-rust` and `ignore` crates.

## API

```ts
import { hash, hashGlobGit, hashGlobXxhash, glob, stat } from "glob-hasher";

hash(["src/index.ts"], { cwd: process.cwd() });
hashGlobGit(["**/*.ts", "!node_modules/**"], { cwd: process.cwd() });
hashGlobXxhash(["**/*.ts"], { cwd: process.cwd(), concurrency: 16 });
glob(["**/*.ts"], { cwd: process.cwd(), gitignore: true });
stat(["src/index.ts"], { cwd: process.cwd() });
```

`hash` and `hashGlobGit` return Git blob SHA-1 hashes. Text CRLF line endings are normalized to LF; binary files are unchanged. `hashGlobXxhash` returns 64-bit XXH3 values as JavaScript `bigint`s. `stat` returns file sizes and modification times in milliseconds as `bigint`s. See `index.d.ts` for full docs.

## Supported platforms

`glob-hasher` requires Node 22.18.0 or later. Prebuilt native packages are available for macOS, Windows, and Linux glibc on x64 and ARM64, plus Linux musl on x64 (including Alpine). Linux musl support is best effort and is not runtime-tested in CI.

## Development

<!-- See root CONTRIBUTING.md for more about the Rust setup -->

`index.js` and `index.d.ts` are NAPI-RS-generated bindings. Local builds generate both into `temp/` and automatically update their checked-in copies when content changes.
