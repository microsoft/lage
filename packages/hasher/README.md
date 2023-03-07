# @lage-run/hasher

This package takes code from both backfill-hasher & package-dep-hash and strips out the extraneous dependencies: backfill-logger and @rushstack/node-core-lib. This is done so that `lage` can become a pure ES Module package. It also allows us to control how the hashing works should lage gains the ability to customize the `inputs` in the future.

# Hasher

## new Hasher(options)

### options

- a cache of hash calculation to be saved as "repoInfo"

## hasher.hash(files, options)

Calculates a hash of all the files passed into the hasher; based on git hash algorithm

### options

- gitignore: whether to obey gitignore (default: true)
- environmentalGlob: an array of glob patterns to add to the key calculation
- salt: an arbitrary string for key calculation

## hasher.hashPackage(packagePath, inputs, options)

Calculates a hash of a package passed into the hasher:

Hash is keyed on:

- a packages source controlled files or the inputs
- internal package source controlled files
- external package locked versions

### options

- gitignore: whether to obey gitignore (default: true)
- environmentalGlob: an array of glob patterns to add to the key calculation
- salt: an arbitrary string for key calculation

# RepoInfo

```yaml
root:
  packages:
    components:
      - file1:
          mtime: 51241351341
          hash: abcdefabcdef
      - file2:
          mtime: 51241351341
          hash: abcdefabcdef
```