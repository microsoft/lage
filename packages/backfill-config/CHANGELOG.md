# Change Log - backfill-config

<!-- This log was last generated on Thu, 19 Mar 2026 23:52:35 GMT and should not be manually modified. -->

<!-- Start content -->

## 6.7.2

Thu, 19 Mar 2026 23:52:35 GMT

### Patches

- Move backfill to lage repo (elcraig@microsoft.com)

## 6.7.1

Wed, 06 Aug 2025 08:17:18 GMT

### Patches

- Fix TokenCredentialLike type (elcraig@microsoft.com)

## 6.7.0

Wed, 06 Aug 2025 06:52:42 GMT

### Minor changes

- Remove all direct references to Azure types, update config validation, add docs (elcraig@microsoft.com)
- Internally restructure into multiple files (elcraig@microsoft.com)
- Bump backfill-logger to v5.4.0

### Patches

- Update to typescript 4.7 (should have no significant emit changes) (elcraig@microsoft.com)

## 6.6.1

Thu, 31 Jul 2025 22:24:07 GMT

### Patches

- Remove direct reference to `@azure/storage-blob` in types (use a minimal facade type for `AzureBlobCacheStorageOptions.containerClient`) (elcraig@microsoft.com)

## 6.6.0

Sat, 29 Mar 2025 08:07:16 GMT

### Minor changes

- Update to typescript 4.5 internally (elcraig@microsoft.com)
- Bump backfill-logger to v5.3.0

## 6.5.0

Fri, 27 Dec 2024 21:00:44 GMT

### Minor changes

- Adding an option to pass ContainerClient instead of connection string, container and credentials to AzureBlobCacheStorage (altinokd@microsoft.com)

## 6.4.2

Wed, 15 Nov 2023 23:08:02 GMT

### Patches

- Add credential option for Azure Blob Storage (altinokd@microsoft.com)

## 6.4.1

Tue, 05 Sep 2023 21:29:30 GMT

### Patches

- Update typescript to 4.3 (elcraig@microsoft.com)
- Remove unused dependency on fs-extra (elcraig@microsoft.com)
- Bump backfill-logger to v5.2.1

## 6.4.0

Tue, 05 Sep 2023 19:56:47 GMT

### Minor changes

- Require Node 14; add downlevel syntax compilation to ES2020 for Node 14 (elcraig@microsoft.com)
- Bump backfill-logger to v5.2.0

## 6.3.1

Thu, 08 Dec 2022 02:52:13 GMT

### Patches

- Bump backfill-utils-test to v5.1.3

## 6.3.0

Wed, 18 May 2022 12:15:03 GMT

### Minor changes

- Make incremental cache an opt-in option (vibailly@microsoft.com)

## 6.2.0

Tue, 12 Oct 2021 19:45:45 GMT

### Minor changes

- feat: adds a way to set up custom cache storage provider classes (kchau@microsoft.com)

## 6.1.1

Tue, 27 Apr 2021 08:32:03 GMT

### Patches

- Bump @types/fs-extra from 8.0.1 to 9.0.11 (ronald.ndirangu@gmail.com)

## 6.1.0

Tue, 01 Dec 2020 09:43:25 GMT

### Minor changes

- Bump typescript from 3.7.4 to 4.1.2 (bewegger@microsoft.com)

## 6.0.3

Tue, 01 Dec 2020 09:13:42 GMT

### Patches

- Run Prettier 2.2.0 (bewegger@microsoft.com)

## 6.0.2

Tue, 01 Dec 2020 09:06:20 GMT

### Patches

- Bump find-up from 4.1.0 to 5.0.0 (bewegger@microsoft.com)

## 6.0.1

Wed, 18 Nov 2020 10:47:24 GMT

### Patches

- fix phantom dependencies (vincent.bailly@microsoft.com)

## 6.0.0

Tue, 09 Jun 2020 11:50:22 GMT

### Major changes

- don't expose hashGlob anymore (vibailly@tuta.io)
