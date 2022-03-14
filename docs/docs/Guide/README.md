---
title: Introducing Lage
---

## Overview

Your JS repo has gotten large enough that you have turned to using a tool to help you manage multiple packages inside a repository. That's great! However, you realized quickly that the tasks defined inside the workspace have to be run in package dependency order.

Lerna, Rush, wsrun and even pnpm will provide a simple way for you to run npm scripts to be run in a topological order. However, these tools will force you to run your tasks by script name one at a time. For example, all the `build` scripts will have to run first. Then all the `test` scripts run in the topological order.

This usually means that there are wasted CPU cycles in between `build` and `test`. We can achieve better pipelining the npm scripts if we had a way to say that `test` can run as soon as `build` are done for the package.

`lage` (Norwegian for "make", pronounced law-geh) solves this by providing a terse pipelining syntax. It has features specifically address large monorepos with high number of packages:

- package and task scopes
- output caching
- sound scheduling with package task pipeline
- prioritization
