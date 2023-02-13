---
marp: true
---

## Lage: Never Build Your Code Twice

kchau@microsoft.com

---

# State of Scale of Web Repos at Microsoft

Microsoft Web applications codebases are large and ever increasing:

- Outlook, Teams codebase is in the 10-million lines of code range
- Thousands of packages
- ~50k source files
- hundreds of commits a day

---

# Problem

- There is simply too much code authored by too many people to be laid out in a monolith
- Node.js tooling are generally single threaded
- (rare) Tools that can take advantage of multi-cores do not share solution with other tools
- Performance degrades as number of code or packages increase
- Duplicate work given the same input
- Scaled solution work very differently between pipelines vs locally
- Freemium solutions exist, but at the cost of using third party controlled SaaS

---

# Sketching a Solution

1. Works with all kinds of workspace management tools (yarn, pnpm, npm)
2. Take advantage of multiple cores
3. A standard set of reusable techniques to scale for all tools (cache, scope, pipeline)
4. Ability to allow individual tools to share some state between tasks for different packages
5. Open sourced - to ease adoption and to ensure a degree of polish

---

# 1. Workspaces Management

- JS code repositories manages complexity through packages
- Packages can take internal and external dependencies
- Internal packages are modified, built, and validated together atomically
- Packages managed together inside a monorepo are grouped as a workspace

---

## Treating internal and external dependencies the same way

```js
// importing "internal" or "external" modules
import React from "react";
import { Button } from "ui-components";
```

Search paths:

- /project/path/**node_modules**/react/**index.js**
- /project/**node_modules**/react/**index.js**
- /**node_modules**/react/**index.js**
- /**node_modules**/react/**index.js**
- \$HOME/.node_modules/react/**index.js**
- \$HOME/.node_libraries/react/**index.js**
- \$PREFIX/lib/node/react/**index.js**

---

## Disk layout of a typical monorepo in a single workspace

A single git repo that contains many related packages:

```
root:
  node_modules/
    react/
    [...external package]
    [...symlinks to internal packages]
  
  packages/
    app/
      package.json
      [...lots of source code]
    businesslogic/
      package.json
      [...lots of source code]
    ui-components/
      package.json
      [...lots of source code]
    utils/
      package.json
      [...lots of source code]

  package.json # metadata about which packages are in workspace
```

---

## Importing Code

Importing internal and external code are consistent:

```js
import React from "react";
import { Button } from "ui-components";
```

---

## 2. Taking advantage of all cores

* Every workspace is a directed acyclic graph of packages
* Implicit is a similar graph of task dependencies (build depends on dev)



---

---

## 2. Task scheduler & runner

- **Runs npm scripts** for all packages
- **Optimize** task run speeds at the dev machine and CI
- Optionally in **topological** order or in **parallel**
- On the market: `lerna`, `wsrun`, `rush`, `pnpm recursive`, `lage`

---

## Problem Statement

Optimizes package tasks in a monorepo for a single machine

---

## Solution

A task runner that is:

- **Open sourced**
  - easily shared, public development demands **polish**
  - **easily contributed** to by many groups
- Works with all workspace implementations
- Easy setup
- Minimize idle CPU cores
- **Sublinear increase** in build time per package

---

_... doesn't exist out there, so we built one..._

# Lage

> _v. to make (Norwegian); pr. LAH-geh_

- Open sourced: https://github.com/microsoft/lage
- Easy to integrate with existing codebase
- Scales up with pipelining
- Scales out with caching and scoping
- Contributions from: OXO, FAST, ODSP, Bohemia (Fluid Exp)

---

## How does it work?

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

## 3. Package publish tool

- Automated management of **semver** based on a change description
- **Validation** of description of changes
- **Synchronize versions** between npm registry and git repository
- Automated management of **changelog**
- On the market: `rush`, `lerna`, `semantic-release`, `beachball`

---

## Solution

Use an automated package versioning manager

---

1. Make a new branch, edit code
2. Run a CLI tool to create a "change file"

```
> beachball change


Please describe the changes for: beachball
? Change type » - Use arrow-keys. Return to submit.
>   Patch      - bug fixes; no backwards incompatible changes.
    Minor      - small feature; backwards compatible changes.
    None       - this change does not affect the published package in any way.
```

3. Push branch & create a PR with complete with change file

---

## Change Files

> [An example PR](https://github.com/microsoft/beachball/pull/406/files#diff-cfc65aa360b77c3648a75d921c3876e1)

```json
{
  "type": "minor",
  "comment": "Adds the ability to create and publish canary packages",
  "packageName": "beachball",
  "email": "kchau@microsoft.com",
  "dependentChangeType": "patch",
  "date": "2020-09-11T23:37:59.115Z"
}
```

---

## Publishing to npm registry and push to git origin

> [An example publish](https://github.com/microsoft/beachball/runs/1104357745?check_suite_focus=true)

```
> beachball publish

...
Publishing - beachball@1.36.0
publish command: publish --registry https://registry.npmjs.org/ --tag latest --loglevel warn --//registry.npmjs.org/:_authToken=***
Published!
...
Pushing to https://github.com/microsoft/beachball
POST git-receive-pack (1116 bytes)
remote:
remote: GitHub found 6 vulnerabilities on microsoft/beachball's default branch (2 high, 2 moderate, 2 low). To find out more, visit:
remote:      https://github.com/microsoft/beachball/network/alerts
remote:
To https://github.com/microsoft/beachball
   72fce75..f9fa782  HEAD -> master
 * [new tag]         beachball_v1.36.0 -> beachball_v1.36.0
updating local tracking ref 'refs/remotes/origin/master'
```

---

Where to find everything we mentioned here:

- Flywheel team (OXO web engineering): <flywheel-team@microsoft.com>
- [midgard-yarn](https://www.npmjs.com/package/midgard-yarn) - yarn, but faster
- lage [repo](https://github.com/microsoft/lage), [docs](https://microsoft.github.io/lage)
- beachball [repo](https://github.com/microsoft/beachball), [docs](https://microsoft.github.io/beachball)
- One JavaScript wiki: https://aka.ms/1js

---

# Appendix

---

## Node.js modularity

The current standard is called "CommonJS"

- 1 JS file is a "module"
- modules can import and export code

---

## Imports and Exports

```js
// speech.js
module.exports = {
    sayHello: (name) => console.log(`hello ${name}`);
}

// main.js
const { sayHello } = require('./speech');
sayHello("humans!")
```

---

## Module state

require() caches the module exports as well as the state

```js
// count.js - Keeping count
let count = 1;
module.exports.inc = () => count++;

// main.js
const { inc } = require("./count");
console.log(inc()); // displays: 1
console.log(inc()); // displays: 2
```

> advanced mode: you can clear this cache to reset state & "hot reload" the module
