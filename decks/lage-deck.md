---
marp: true
paginate: true
theme: uncover
---

# Building the Monorepo

> <kchau@microsoft.com>
> Flywheel Team

---

# About Monorepos

- JS codebases have grown, and are maintained by **thousands of devs**
- Modularity is needed: **package as unit of modularity**
- Related packages are updated at the **same commit**
- Monorepo require a **Monorepo Management Stack**

---

# Monorepo Management Stack

---

## 1. Workspace-enabled package manager

- **Installs dependencies** for all packages
- **Links internal packages** to satisfy the node resolution algorithm
- Handles **dependency resolution** for all packages
- Optional: **hoisting**, **strictness** enforcement (phantom deps)
- On the market: `yarn`, `pnpm`, `rush`, `lerna + npm`

---

## 2. Task scheduler & runner

- **Runs npm scripts** for all packages
- **Optimize** task run speeds at the dev machine and CI
- Optionally in **topological** order or in **parallel**
- On the market: `lerna`, `wsrun`, `rush`, `pnpm recursive`, `lage`

---

## 3. Package publish tool

- Automated management of **semver**
  - Change description files or commit messages
- **Validation** of description of changes
- **Synchronize versions** between npm registry and git repository
- Automated **changelog creation**
- On the market: `rush`, `lerna`, `semantic-release`, `beachball`

---

# Our Focus: Task scheduler & runner

---

## Problem statement

Create a task runner that optimizes package tasks in a monorepo for a single machine

---

## Current state

- JS monorepos in the wild run with **all kinds of workspaces**
- The state-of-the-art monorepo task runners are **not optimized**
- **CPU cores sit idle** for topological scripts
- Large monorepos generally have **clustered graph** of related packages

---

## Philosphy

- Distribute work via smaller libraries with multiple owners
- Leverage OSS as much as possible
- Support package.json scripts as the script runner

---

## Requirements of a task runner

- **Open sourced**
  - easily shared, public development demands **polish**
  - **easily contributed** to by many groups
- Works with all workspace implementations
- Easy setup
- Minimize idle CPU cores
- **Sublinear increase** in build time per package

---

# Prior Art

- This should sound familiar because Vincent made a [version for Midgard](https://msfast.visualstudio.com/FAST/_git/Midgard?path=%2Fpackages%2Fbuild-pipelines%2Fsrc)

---

# Lage

> _v. to make (Norwegian); pr. LAH-geh_

- Open sourced: https://github.com/microsoft/lage
- Easy to integrate with existing codebase
- Scales up with pipelining
- Scales out with caching and scoping

---

# Collaboration

- **OneDrive/SharePoint**: [rush](https://rushjs.io) showed us incremental builds
- **Midgard**: [backfill](https://github.com/microsoft/backfill) cache, [task-scheduler](https://github.com/microsoft/task-scheduler)
- **Flywheel**: pipeline config, [workspace-tools](https://github.com/microsoft/workspace-tools), `lage` tool
- **FluidX**: [p-graph](https://github.com/microsoft/p-graph) promise graph that supports priority queuing

---

# What does it look like?

---

# Full Build

```shell
$ lage build test lint --grouped --verbose --reset-cache
```

[![height:300px](https://asciinema.org/a/352651.svg)](https://asciinema.org/a/352651?speed=100)

---

# Cached Build

```shell
$ lage build test lint --grouped --verbose
```

[![height:300px](https://asciinema.org/a/352653.svg)](https://asciinema.org/a/352653?speed=25)

---

# Scoped Build

```shell
$ lage build test lint --grouped --verbose --scope @fluentui/web-components
```

[![height:300px](https://asciinema.org/a/352654.svg)](https://asciinema.org/a/352654?speed=25)

---

# Profiling

```shell
$ lage build test lint --profile
```

![height:400px](https://microsoft.github.io/lage/assets/img/sample-profile.9725510b.png)

---

# How does it work?

https://microsoft.github.io/lage/guide/levels.html

---

## How to try it at home?

https://microsoft.github.io/lage/guide/getting-started.html

1. npm scripts (build, test, lint) are at package level
2. `npx lage init`

   - creates a `lage.config.js` - configure it
   - adds `lage` as a dep

3. `yarn lage build` or `npm run lage build`

---

# Future

- `lage` is a great solution for a **single machine**, not distributed builds
- For MSFT is [buildxl](https://github.com/microsoft/buildxl)
  - lage needs to spit out [dscript](https://github.com/microsoft/BuildXL/blob/master/Documentation/Wiki/DScript/Introduction.md) or json config for buildxl
- Alternative: also investigate bazel
  - lage can potentially spit out WORKSPACE & BUILD

---

# More info

Github:
https://github.com/microsoft/lage

Documentation:
https://microsoft.github.io/lage/

Complex Configuration:
https://github.com/microsoft/fluentui/blob/master/lage.config.js
