# Change Log - lage

This log was last generated on Wed, 29 Mar 2023 22:41:49 GMT and should not be manually modified.

<!-- Start content -->

## 2.3.4

Wed, 29 Mar 2023 22:41:49 GMT

### Patches

- Bump @lage-run/cli to v0.11.4
- Bump @lage-run/scheduler to v0.10.5

## 2.3.3

Wed, 29 Mar 2023 20:02:40 GMT

### Patches

- Bump @lage-run/cli to v0.11.3
- Bump @lage-run/scheduler to v0.10.4

## 2.3.2

Mon, 27 Mar 2023 18:00:15 GMT

### Patches

- Bump @lage-run/cli to v0.11.2
- Bump @lage-run/scheduler to v0.10.3

## 2.3.1

Thu, 23 Mar 2023 19:32:03 GMT

### Patches

- Bump @lage-run/cli to v0.11.1
- Bump @lage-run/scheduler to v0.10.2

## 2.3.0

Wed, 22 Mar 2023 17:26:54 GMT

### Minor changes

- Add bundled config types to lage package (elcraig@microsoft.com)
- Bump @lage-run/cli to v0.11.0

## 2.2.3

Tue, 14 Mar 2023 00:28:38 GMT

### Patches

- Bump @lage-run/cli to v0.10.1
- Bump @lage-run/scheduler to v0.10.1

## 2.2.2

Fri, 10 Mar 2023 01:25:03 GMT

### Patches

- Bump @lage-run/cli to v0.10.0
- Bump @lage-run/scheduler to v0.10.0

## 2.2.1

Wed, 08 Mar 2023 17:35:28 GMT

### Patches

- Bump @lage-run/cli to v0.9.2
- Bump @lage-run/scheduler to v0.9.2

## 2.2.0

Wed, 08 Mar 2023 00:05:27 GMT

### Minor changes

- allows global script cache (kchau@microsoft.com)
- Bump @lage-run/cli to v0.9.1
- Bump @lage-run/scheduler to v0.9.1

## 2.1.0

Tue, 21 Feb 2023 21:30:37 GMT

### Minor changes

- centralized the cache directory (kchau@microsoft.com)
- Bump @lage-run/cli to v0.9.0
- Bump @lage-run/scheduler to v0.9.0

## 2.0.4

Sat, 18 Feb 2023 00:43:33 GMT

### Patches

- Bump @lage-run/cli to v0.8.6

## 2.0.3

Sat, 18 Feb 2023 00:40:18 GMT

### Patches

- Bump @lage-run/cli to v0.8.5

## 2.0.2

Wed, 15 Feb 2023 16:51:15 GMT

### Patches

- Bump @lage-run/cli to v0.8.4
- Bump @lage-run/scheduler to v0.8.5

## 2.0.1

Wed, 15 Feb 2023 16:47:12 GMT

### Patches

- Bump @lage-run/cli to v0.8.3
- Bump @lage-run/scheduler to v0.8.4

## 2.0.0

Tue, 07 Feb 2023 23:52:48 GMT

### Breaking changes

- Lage v2 requires **Node 16** or passing the `--experimental-abortcontroller` flag in Node 14.
- `lage` now will automatically write remote cache if the typical environment variable is set (e.g. `CI` or `TF_BUILD`)
- `info` command is not implemented yet
- `graph` command is not implemented yet

### Features

See the [release notes](./RELEASE.md) and [migration guide](https://microsoft.github.io/lage/docs/Cookbook/migration) for more information about what's new in v2.
