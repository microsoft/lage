# Memory Leak Analysis (Issue #957)

## Problem

RSS grows steadily per task (~MB per task), even when all tasks are skipped (cache hits), accumulating to ~3GB with hundreds of tasks in a monorepo.

## Root Causes

### 1. `TargetHasher.targetHashesLog` — Accumulates file hash records for every target

**File:** `packages/hasher/src/TargetHasher.ts`

```typescript
private targetHashesLog: Record<string, { fileHashes: Record<string, string>; globalFileHashes: Record<string, string> }> = {};
```

Every time a target is hashed (line 198), its full file-to-hash mapping is stored in memory:

```typescript
this.targetHashesLog[target.id] = { fileHashes, globalFileHashes };
```

- `fileHashes` maps **every input file** of the target to its content hash. With `getInputFiles()` defaulting to `["**/*"]`, this can include hundreds of files per package.
- This data is only ever written to disk in `cleanup()` — it is **never cleared from memory** during the run.
- For a monorepo with 500 targets, each with 100–1000 input files, this accumulates 50K–500K file path+hash string pairs: **10–100MB+**.

**Fix:** Write each target's hash log to disk immediately after computing it, instead of batching all writes at the end.

### 2. Reporter `logEntries` Maps — Never cleared during a run

All four reporter implementations store log entries in Maps that grow throughout the entire run:

| Reporter | File | Accumulating Structure |
|---|---|---|
| `LogReporter` | `packages/reporters/src/LogReporter.ts:77` | `private logEntries = new Map<string, LogEntry[]>()` |
| `BasicReporter` | `packages/reporters/src/BasicReporter.ts:56` | `private taskData = new Map<..., { logEntries: LogEntry[] }>()` |
| `GroupedReporter` | `packages/reporters/src/GroupedReporter.ts:49-50` | `protected logEntries` **AND** `private groupedEntries` |
| `ProgressReporter` | `packages/reporters/src/ProgressReporter.ts:33` | `private logEntries = new Map<...>()` |

These Maps are **only needed for error reporting** at summary time. Successful/skipped targets' entries are never read again. Clearing entries for non-failed targets after they complete prevents unbounded growth.

Additionally, `WrappedTarget.run()` replays cached output via the logger:

```typescript
const cachedOutput = fs.readFileSync(cachedOutputFile, "utf8");
logger.verbose(cachedOutput.trim(), { target });
```

This creates large `msg` strings stored in every reporter's Map for every cache-hit target.

**Fix:** Clear log entries for completed (non-failed) targets immediately after they finish, since they're only needed for error reporting at summary time.

### 3. `bufferTransform` — Transform streams never destroyed

**File:** `packages/scheduler/src/bufferTransform.ts`

Per-task `bufferTransform()` calls create Transform streams with closure-captured `chunks: string[]` arrays. After use, the streams are unpiped but **never destroyed**. An undestroyed Transform stream retains its internal state and closure, preventing GC of the `chunks` array.

**Fix:** Destroy the Transform stream after extracting the buffer contents.

### 4. `WrappedTarget.#result` — stdout/stderr buffers retained

**File:** `packages/scheduler/src/WrappedTarget.ts`

Each completed task stores its `WorkerResult` (containing `stdoutBuffer` and `stderrBuffer` strings) in `this.#result`, which lives in the `SimpleScheduler.targetRuns` Map for the entire run. After the output is saved to cache (or for skipped tasks), these string buffers serve no further purpose but are never released.

**Fix:** Clear the stdout/stderr buffer strings from the result after they've been used for cache writing.

### 5. Recursive scheduling prevents early GC

**File:** `packages/scheduler/src/SimpleScheduler.ts`

The scheduling uses a recursive pattern where `#generateTargetRunPromise` awaits `scheduleReadyTargets()` recursively. This means the first task's async frame stays alive (with all its closure references) until the entire run finishes. V8 may not eagerly GC the locals from `runInPool()` while the parent async frame is still pending.

This is noted but not directly fixed, as it would require a significant architectural change. The other fixes reduce the size of what's retained in those closures.

## Impact Summary

| Source | Per-task growth | With 500 tasks |
|---|---|---|
| `targetHashesLog` | ~20–200KB | 10–100MB |
| Reporter logEntries (×N reporters) | ~5–500KB | 2.5–250MB |
| WorkerResult buffers | ~1–10KB | 0.5–5MB |
| Undestroyed Transform streams | ~1–5KB | 0.5–2.5MB |
| Retained async closures | variable | variable |
