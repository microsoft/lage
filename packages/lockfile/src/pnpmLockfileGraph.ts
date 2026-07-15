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

export type PnpmPackageMetadata = Record<string, unknown>;

export interface PnpmImporterDependency {
  specifier?: string;
  version: string;
}

/** An importer (workspace project) entry in a pnpm `9.0` lockfile's `importers` section. */
export interface PnpmImporter {
  dependencies?: Record<string, PnpmImporterDependency>;
  devDependencies?: Record<string, PnpmImporterDependency>;
  optionalDependencies?: Record<string, PnpmImporterDependency>;
  [key: string]: unknown;
}

/** The parts of a parsed pnpm `9.0` lockfile that are relevant to closure analysis. */
export interface PnpmLockfile {
  lockfileVersion?: string | number;
  importers?: Record<string, PnpmImporter>;
  packages?: Record<string, PnpmPackageMetadata>;
  snapshots?: Record<string, PnpmSnapshot>;
  [key: string]: unknown;
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

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));

  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableSerialize(entryValue)}`).join(",")}}`;
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

function resolveImporterDepPaths(dependencies: Record<string, PnpmImporterDependency> | undefined): string[] {
  if (!dependencies) {
    return [];
  }

  const depPaths: string[] = [];
  for (const [name, entry] of Object.entries(dependencies)) {
    const relative = refToRelative(entry.version, name);
    if (relative) {
      depPaths.push(relative);
    }
  }
  return depPaths;
}

function getChildDepPaths(snapshot: PnpmSnapshot | undefined): string[] {
  return [...resolveChildDepPaths(snapshot?.dependencies), ...resolveChildDepPaths(snapshot?.optionalDependencies)].sort();
}

function getPackageMetadata(depPath: string, packages: Record<string, PnpmPackageMetadata>): PnpmPackageMetadata | undefined {
  const exact = packages[depPath];
  if (exact !== undefined) {
    return exact;
  }

  // pnpm v9 stores peer- and patch-resolved snapshots under suffixed keys such as
  // `react-dom@18.3.1(react@18.3.1)` while artifact metadata remains under the base key.
  const suffixIndex = depPath.indexOf("(");
  return suffixIndex === -1 ? undefined : packages[depPath.slice(0, suffixIndex)];
}

function getNodeMetadataHash(
  depPath: string,
  snapshots: Record<string, PnpmSnapshot>,
  packages: Record<string, PnpmPackageMetadata>
): string {
  return hashOrdered([
    depPath,
    stableSerialize(getPackageMetadata(depPath, packages) ?? null),
    stableSerialize(snapshots[depPath] ?? null),
  ]);
}

function findStronglyConnectedComponents(depPaths: string[], getChildren: (depPath: string) => string[]): string[][] {
  const sortedDepPaths = [...depPaths].sort();
  const childrenByDepPath = new Map(sortedDepPaths.map((depPath) => [depPath, getChildren(depPath)]));
  const reverseChildren = new Map(sortedDepPaths.map((depPath) => [depPath, [] as string[]]));

  for (const [depPath, children] of childrenByDepPath) {
    for (const child of children) {
      reverseChildren.get(child)?.push(depPath);
    }
  }
  for (const parents of reverseChildren.values()) {
    parents.sort();
  }

  const visited = new Set<string>();
  const finishOrder: string[] = [];
  for (const start of sortedDepPaths) {
    if (visited.has(start)) {
      continue;
    }

    visited.add(start);
    const stack: Array<{ depPath: string; childIndex: number }> = [{ depPath: start, childIndex: 0 }];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const children = childrenByDepPath.get(frame.depPath) ?? [];
      const child = children[frame.childIndex];
      if (child !== undefined) {
        frame.childIndex++;
        if (!visited.has(child)) {
          visited.add(child);
          stack.push({ depPath: child, childIndex: 0 });
        }
      } else {
        finishOrder.push(frame.depPath);
        stack.pop();
      }
    }
  }

  const assigned = new Set<string>();
  const components: string[][] = [];
  for (let index = finishOrder.length - 1; index >= 0; index--) {
    const start = finishOrder[index];
    if (assigned.has(start)) {
      continue;
    }

    assigned.add(start);
    const component: string[] = [];
    const stack = [start];
    while (stack.length > 0) {
      const depPath = stack.pop()!;
      component.push(depPath);
      for (const parent of reverseChildren.get(depPath) ?? []) {
        if (!assigned.has(parent)) {
          assigned.add(parent);
          stack.push(parent);
        }
      }
    }
    components.push(component.sort());
  }

  return components;
}

/**
 * Computes a stable Merkle-style hash for every resolved package (snapshot) in the lockfile.
 *
 * Each node's hash is derived from its own dep path, package metadata, snapshot metadata, and the
 * hashes of its resolved children, so a change anywhere in a package's transitive closure changes
 * its hash. Cycles are collapsed into strongly connected components so changes to any member of the
 * cycle propagate to every importer that enters the component.
 */
function computeSnapshotHashes(
  snapshots: Record<string, PnpmSnapshot>,
  packages: Record<string, PnpmPackageMetadata>
): Map<string, string> {
  const allDepPaths = Object.keys(snapshots).sort();
  const knownDepPaths = new Set(allDepPaths);
  const getKnownChildren = (depPath: string): string[] => {
    const children = getChildDepPaths(snapshots[depPath]);
    const unresolvedChild = children.find((child) => !knownDepPaths.has(child));
    if (unresolvedChild !== undefined) {
      throw new Error(`snapshot "${depPath}" references missing snapshot "${unresolvedChild}"`);
    }
    return children;
  };
  const components = findStronglyConnectedComponents(allDepPaths, getKnownChildren);
  const componentByDepPath = new Map<string, number>();

  components.forEach((component, componentIndex) => {
    for (const depPath of component) {
      componentByDepPath.set(depPath, componentIndex);
    }
  });

  const componentChildren = components.map(() => new Set<number>());
  const componentParents = components.map(() => new Set<number>());
  for (const [depPath, componentIndex] of componentByDepPath) {
    for (const child of getKnownChildren(depPath)) {
      const childComponentIndex = componentByDepPath.get(child)!;
      if (childComponentIndex !== componentIndex) {
        componentChildren[componentIndex].add(childComponentIndex);
        componentParents[childComponentIndex].add(componentIndex);
      }
    }
  }

  const componentHashes = new Map<number, string>();
  const remainingChildren = componentChildren.map((children) => children.size);
  const ready = remainingChildren.flatMap((count, componentIndex) => (count === 0 ? [componentIndex] : []));
  while (ready.length > 0) {
    const componentIndex = ready.pop()!;
    const memberHashes = components[componentIndex].map((depPath) => getNodeMetadataHash(depPath, snapshots, packages));
    const childHashes = [...componentChildren[componentIndex]].map((childIndex) => componentHashes.get(childIndex)!).sort();
    componentHashes.set(componentIndex, hashOrdered(["component", ...memberHashes, ...childHashes]));

    for (const parentIndex of componentParents[componentIndex]) {
      remainingChildren[parentIndex]--;
      if (remainingChildren[parentIndex] === 0) {
        ready.push(parentIndex);
      }
    }
  }

  if (componentHashes.size !== components.length) {
    throw new Error("could not hash the pnpm snapshot component graph");
  }

  const nodeHashes = new Map<string, string>();
  for (const depPath of allDepPaths) {
    const componentIndex = componentByDepPath.get(depPath);
    if (componentIndex !== undefined) {
      nodeHashes.set(depPath, hashOrdered([depPath, componentHashes.get(componentIndex)!]));
    }
  }

  return nodeHashes;
}

function computeImporterSignature(importerId: string, importer: PnpmImporter, snapshotHashes: Map<string, string>): string {
  const directDepPaths = [
    ...resolveImporterDepPaths(importer.dependencies),
    ...resolveImporterDepPaths(importer.devDependencies),
    ...resolveImporterDepPaths(importer.optionalDependencies),
  ];

  const uniqueSorted = [...new Set(directDepPaths)].sort();
  const childHashes = uniqueSorted.map((depPath) => {
    const signature = snapshotHashes.get(depPath);
    if (signature === undefined) {
      throw new Error(`importer "${importerId}" references missing snapshot "${depPath}"`);
    }
    return signature;
  });

  return hashOrdered([stableSerialize(importer), ...childHashes]);
}

/**
 * Builds a {@link LockfileGraph} from a parsed pnpm lockfile.
 */
export function buildPnpmLockfileGraph(lockfile: PnpmLockfile): LockfileGraph {
  const snapshotHashes = computeSnapshotHashes(lockfile.snapshots ?? {}, lockfile.packages ?? {});

  const importerSignatures = new Map<string, string>();
  for (const [importerId, importer] of Object.entries(lockfile.importers ?? {})) {
    importerSignatures.set(importerId, computeImporterSignature(importerId, importer, snapshotHashes));
  }

  const { importers: _importers, packages: _packages, snapshots: _snapshots, ...globalFields } = lockfile;
  return { importerSignatures, globalSignature: hashOrdered([stableSerialize(globalFields)]) };
}
