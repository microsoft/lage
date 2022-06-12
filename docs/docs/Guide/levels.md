---
sidebar_position: 2

title: How does `lage` work?
---

# How does `lage` work?

So how does `lage` make builds faster? To fully appreciate how `lage` gives you the best build performance compared to other monorepo task runners, take a look at this example. Here we have a repo with this dependency graph:

import Mermaid from '@theme/Mermaid';

<Mermaid chart={`graph TD FooCore --> BuildTool BarCore --> BuildTool FooApp1 --> FooCore FooApp2 --> FooCore BarPage --> BarCore`} />

## Level 1: Typical Lerna or Workspace Runners

First, let's take a look at the typical workspace runners. `Lerna`, `pnpm recursive`, `rush` and `wsrun` all will run one task at a time. This creates a sort of "build phase" effect where `test` scripts are not allowed to run until `build`.

<Mermaid chart={`gantt title Level 1: Typical Lerna or Workspace Runners dateFormat s axisFormat %S section Total prepare: active, total_prepare, 0, 30s build : active, total_build, after total_prepare, 50s test : active, total_test, after total_build, 25s section BuildTool prepare: bt_prepare, 0, 10s build : bt_build, after total_prepare, 10s test : bt_test, after total_build, 6s section FooCore prepare: fc_prepare, after bt_prepare, 10s build: fc_build, after bt_build, 15s test: fc_test, after total_build, 25s section FooApp1 prepare: fa1_prepare, after fc_prepare, 10s build: fa1_build, after fc_build, 25s test: fa1_test, after total_build, 15s section FooApp2 prepare: fa2_prepare, after fc_prepare, 10s build: fa2_build, after fc_build, 12s test: fa2_test, after total_build, 8s section BarCore prepare: bc_prepare, after bt_prepare, 10s build: bc_build, after bt_build, 10s test: bc_test, after total_build, 16s section BarPage prepare: bp_prepare, after bc_prepare, 10s build: bp_build, after bc_build, 25s test: bp_test, after total_build, 12s `} />

## Level 2: Scoping

One of the first way to speeding up build jobs is to use "scoping". Usually a change only affect a subset of the graph. We can get rid of the builds of `FooCore`, `FooApp1` and `FooApp2` if the only changes are inside `BarCore`. However, we'll note that `BarPage` is still affected, resulting in this.

<Mermaid chart={`gantt title Level 2: Scoping dateFormat s axisFormat %S section Total Level 1: 0, 105s prepare: active, total_prepare, 0, 30s build : active, total_build, after total_prepare, 45s test : active, total_test, after total_build, 16s section BuildTool prepare: bt_prepare, 0, 10s build : bt_build, after total_prepare, 10s test : bt_test, after total_build, 6s section FooCore skipped: 0 section FooApp1 skipped: 0 section FooApp2 skipped: 0 section BarCore * prepare: bc_prepare, after bt_prepare, 10s build: bc_build, after bt_build, 10s test: bc_test, after total_build, 16s section BarPage prepare: bp_prepare, after bc_prepare, 10s build: bp_build, after bc_build, 25s test: bp_test, after total_build, 12s `} />

## Level 3. Caching

To further improve build times, we can take advantage of build caches. If we had previously built certain packages, we should be able to speed up the build with a cache. Here, the `BarCore` packages have already been built and tested, and so

<Mermaid chart={`gantt title Level 3: Caching dateFormat s axisFormat %S section Total Level 1: 0, 105s Level 2: 0, 91s prepare: active, total_prepare, 0, 30s build : active, total_build, after total_prepare, 37s test : active, total_test, after total_build, 12s section BuildTool prepare: bt_prepare, 0, 10s build : bt_build, after total_prepare, 10s test : bt_test, after total_build, 6s section FooCore skipped: 0 section FooApp1 skipped: 0 section FooApp2 skipped: 0 section BarCore prepare: bc_prepare, after bt_prepare, 10s build: crit, bc_build, after bt_build, 2s test: crit, bc_test, after total_build, 2s section BarPage * prepare: bp_prepare, after bc_prepare, 10s build: bp_build, after bc_build, 25s test: bp_test, after total_build, 12s `} />

## Level 4. Pipelining

Finally, the last thing we can to speed things up is to break down the wall between build phases from the task runner. In `lage`, we define the relationship between scripts in the `pipeline` configuration.

<Mermaid chart={`gantt title Level 4: Pipelining dateFormat s axisFormat %S section Total Level 1: 0, 105s Level 2: 0, 91s Level 3: 0, 79s prepare: active, total_prepare, 0, 30s build : active, total_build, 10, 45s test : active, total_test, 20, 47s section BuildTool prepare: bt_prepare, 0, 10s build : bt_build, after bt_prepare, 10s test : bt_test, after bt_build, 6s section FooCore skipped: 0 section FooApp1 skipped: 0 section FooApp2 skipped: 0 section BarCore prepare: bc_prepare, after bt_prepare, 10s build: bc_build, after bt_build, 2s test: bc_test, after bc_build, 2s section BarPage * prepare: bp_prepare, after bc_prepare, 10s build: bp_build, after bp_prepare, 25s test: bp_test, after bp_build, 12s `} />
