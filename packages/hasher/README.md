# @lage-run/hasher

This package takes code from both backfill-hasher & package-dep-hash and strips out the extraneous dependencies: backfill-logger and @rushstack/node-core-lib. This is done so that `lage` can become a pure ES Module package. It also allows us to control how the hashing works should lage gains the ability to customize the `inputs` in the future.
