import crypto from "crypto";
import type { LockfileGraph } from "./types.js";

/** Only the latest pnpm lockfile format is supported. */
const SUPPORTED_MAJOR_LOCKFILE_VERSION = "9";

/**
 * Resolves a dependency reference (as found in a lockfile) to its relative dep path (the key used
 * in the lockfile's `snapshots` map), or `null` for references that do not map to a lockfile entry
 * (e.g. workspace `link:` references).
 *
 * This is a native port of `@pnpm/dependency-path`'s `refToRelative`. It is reimplemented here
 * (rather than depending on the package) because `@pnpm/dependency-path` is ESM-only and pulls in a
 * heavy dependency tree; the logic itself is small and stable for the supported lockfile format.
 */
export function refToRelative(reference: string, pkgName: string): string | null {
  if (reference.startsWith("link:")) {
    return null;
  }
  if (reference[0] === "@") {
    return reference;
  }
  const atIndex = reference.indexOf("@");
  if (atIndex === -1) {
    return `${pkgName}@${reference}`;
  }
  const colonIndex = reference.indexOf(":");
  const bracketIndex = reference.indexOf("(");
  if ((colonIndex === -1 || atIndex < colonIndex) && (bracketIndex === -1 || atIndex < bracketIndex)) {
    return reference;
  }
  return `${pkgName}@${reference}`;
}

/** A resolved snapshot in a pnpm `9.0` lockfile's `snapshots` section. */
export interface PnpmSnapshot {
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

/** An importer (workspace project) entry in a pnpm `9.0` lockfile's `importers` section. */
export interface PnpmImporter {
  dependencies?: Record<string, { version: string }>;
  devDependencies?: Record<string, { version: string }>;
  optionalDependencies?: Record<string, { version: string }>;
}

/** The parts of a parsed pnpm `9.0` lockfile that are relevant to closure analysis. */
export interface PnpmLockfile {
  lockfileVersion?: string | number;
  importers?: Record<string, PnpmImporter>;
  snapshots?: Record<string, PnpmSnapshot>;
}

/**
 * Returns true if the given pnpm `lockfileVersion` is supported by the smarter invalidation logic.
 * Only the latest major format (`9.x`, e.g. `"9.0"`) is supported.
 */
export function isSupportedPnpmLockfileVersion(lockfileVersion: string | number | undefined): boolean {
  if (lockfileVersion === undefined) {
    return false;
  }

  const asString = String(lockfileVersion);
  const [major] = asString.split(".");
  return major === SUPPORTED_MAJOR_LOCKFILE_VERSION;
}

function hashOrdered(parts: string[]): string {
  const hasher = crypto.createHash("sha1");
  for (const part of parts) {
    // Length-prefix each part so that concatenation is unambiguous.
    hasher.update(String(part.length));
    hasher.update("\0");
    hasher.update(part);
  }
  return hasher.digest("hex");
}

function resolveChildDepPaths(dependencies: Record<string, string> | undefined): string[] {
  if (!dependencies) {
    return [];
  }

  const depPaths: string[] = [];
  for (const [name, reference] of Object.entries(dependencies)) {
    // `refToRelative` returns null for workspace links (e.g. `link:../b`), which are internal
    // dependencies handled by Lage's package graph rather than the external lockfile closure.
    const relative = refToRelative(reference, name);
    if (relative) {
      depPaths.push(relative);
    }
  }
  return depPaths;
}

function resolveImporterDepPaths(dependencies: Record<string, { version: string }> | undefined): string[] {
  if (!dependencies) {
    return [];
  }

  const depPaths: string[] = [];
  for (const [name, entry] of Object.entries(dependencies)) {
    if (!entry || typeof entry.version !== "string") {
      continue;
    }
    const relative = refToRelative(entry.version, name);
    if (relative) {
      depPaths.push(relative);
    }
  }
  return depPaths;
}

/**
 * Computes a stable Merkle-style hash for every resolved package (snapshot) in the lockfile.
 *
 * Each node's hash is derived from its own dep path and the hashes of its resolved children, so a
 * change anywhere in a package's transitive closure changes its hash. Node hashes are memoized and
 * shared across all importers, so the total cost is roughly O(nodes + edges) once, rather than
 * O(importers x closure). Cycles (which can occur through peer dependencies) are broken
 * deterministically using the dep path as a placeholder.
 */
function computeSnapshotHashes(snapshots: Record<string, PnpmSnapshot>): Map<string, string> {
  const nodeHashes = new Map<string, string>();
  const onStack = new Set<string>();

  const visit = (depPath: string): string => {
    const cached = nodeHashes.get(depPath);
    if (cached !== undefined) {
      return cached;
    }

    if (onStack.has(depPath)) {
      // Cycle detected: use the dep path itself as a stable placeholder without recursing.
      return `cycle\0${depPath}`;
    }

    onStack.add(depPath);

    const snapshot = snapshots[depPath];
    const childDepPaths = snapshot
      ? [...resolveChildDepPaths(snapshot.dependencies), ...resolveChildDepPaths(snapshot.optionalDependencies)]
      : [];
    childDepPaths.sort();

    const childHashes = childDepPaths.map((child) => visit(child));
    const hash = hashOrdered([depPath, ...childHashes]);

    onStack.delete(depPath);
    nodeHashes.set(depPath, hash);
    return hash;
  };

  // Pre-warm in a deterministic (sorted) order so that memoized results do not depend on importer
  // traversal order.
  for (const depPath of Object.keys(snapshots).sort()) {
    visit(depPath);
  }

  return nodeHashes;
}

function computeImporterSignature(importer: PnpmImporter, snapshotHashes: Map<string, string>): string {
  const directDepPaths = [
    ...resolveImporterDepPaths(importer.dependencies),
    ...resolveImporterDepPaths(importer.devDependencies),
    ...resolveImporterDepPaths(importer.optionalDependencies),
  ];

  const uniqueSorted = [...new Set(directDepPaths)].sort();
  const childHashes = uniqueSorted.map((depPath) => snapshotHashes.get(depPath) ?? hashOrdered([depPath]));

  return hashOrdered(childHashes);
}

/**
 * Builds a {@link LockfileGraph} from a parsed pnpm lockfile.
 */
export function buildPnpmLockfileGraph(lockfile: PnpmLockfile): LockfileGraph {
  const snapshotHashes = computeSnapshotHashes(lockfile.snapshots ?? {});

  const importerSignatures = new Map<string, string>();
  for (const [importerId, importer] of Object.entries(lockfile.importers ?? {})) {
    importerSignatures.set(importerId, computeImporterSignature(importer, snapshotHashes));
  }

  return { importerSignatures };
}
