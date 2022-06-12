---
sidebar_position: 11

title: Migration Guide
---

# Migration Guide

## v0.x.y -> v1.0.0

Lage is graduating to 1.0.0! We have a breaking change. Namely, the remote cache mechanism is changing. See this [PR #172](https://github.com/microsoft/lage/pull/172) for details. The behavior is [described here](./remote-cache). The behavior is changed for remote cache:

1. `lage` only write to a remote cache if the environment variable `LAGE_WRITE_REMOTE_CACHE` is set to true
2. remote cache now works as a fallback; always reading & writing to the local cache first
