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
  packages?: Record<string, PnpmPackageMetadata>;
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

function getChildDepPaths(snapshot: PnpmSnapshot | undefined): string[] {
  return [...resolveChildDepPaths(snapshot?.dependencies), ...resolveChildDepPaths(snapshot?.optionalDependencies)].sort();
}

function getNodeMetadataHash(
  depPath: string,
  snapshots: Record<string, PnpmSnapshot>,
  packages: Record<string, PnpmPackageMetadata>
): string {
  return hashOrdered([depPath, stableSerialize(packages[depPath] ?? null), stableSerialize(snapshots[depPath] ?? null)]);
}

function findStronglyConnectedComponents(depPaths: string[], getChildren: (depPath: string) => string[]): string[][] {
  let index = 0;
  const indexes = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];

  const strongConnect = (depPath: string): void => {
    indexes.set(depPath, index);
    lowLinks.set(depPath, index);
    index++;
    stack.push(depPath);
    onStack.add(depPath);

    for (const child of getChildren(depPath)) {
      if (!indexes.has(child)) {
        strongConnect(child);
        lowLinks.set(depPath, Math.min(lowLinks.get(depPath)!, lowLinks.get(child)!));
      } else if (onStack.has(child)) {
        lowLinks.set(depPath, Math.min(lowLinks.get(depPath)!, indexes.get(child)!));
      }
    }

    if (lowLinks.get(depPath) === indexes.get(depPath)) {
      const component: string[] = [];
      let member: string;
      do {
        member = stack.pop()!;
        onStack.delete(member);
        component.push(member);
      } while (member !== depPath);
      components.push(component.sort());
    }
  };

  for (const depPath of depPaths.sort()) {
    if (!indexes.has(depPath)) {
      strongConnect(depPath);
    }
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
  const allDepPaths = [...new Set([...Object.keys(snapshots), ...Object.keys(packages)])].sort();
  const knownDepPaths = new Set(allDepPaths);
  const getKnownChildren = (depPath: string) => getChildDepPaths(snapshots[depPath]).filter((child) => knownDepPaths.has(child));
  const components = findStronglyConnectedComponents(allDepPaths, getKnownChildren);
  const componentByDepPath = new Map<string, number>();

  components.forEach((component, componentIndex) => {
    for (const depPath of component) {
      componentByDepPath.set(depPath, componentIndex);
    }
  });

  const componentHashes = new Map<number, string>();
  const visitComponent = (componentIndex: number): string => {
    const cached = componentHashes.get(componentIndex);
    if (cached !== undefined) {
      return cached;
    }

    const component = components[componentIndex];
    const memberHashes = component.map((depPath) => getNodeMetadataHash(depPath, snapshots, packages));
    const childComponentIndexes = new Set<number>();

    for (const depPath of component) {
      for (const child of getKnownChildren(depPath)) {
        const childComponentIndex = componentByDepPath.get(child);
        if (childComponentIndex !== undefined && childComponentIndex !== componentIndex) {
          childComponentIndexes.add(childComponentIndex);
        }
      }
    }

    const childComponentHashes = [...childComponentIndexes]
      .sort((left, right) => left - right)
      .map((childIndex) => visitComponent(childIndex));
    const hash = hashOrdered(["component", ...memberHashes, ...childComponentHashes]);
    componentHashes.set(componentIndex, hash);
    return hash;
  };

  const nodeHashes = new Map<string, string>();
  for (const depPath of allDepPaths) {
    const componentIndex = componentByDepPath.get(depPath);
    if (componentIndex !== undefined) {
      nodeHashes.set(depPath, hashOrdered([depPath, visitComponent(componentIndex)]));
    }
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
  const snapshotHashes = computeSnapshotHashes(lockfile.snapshots ?? {}, lockfile.packages ?? {});

  const importerSignatures = new Map<string, string>();
  for (const [importerId, importer] of Object.entries(lockfile.importers ?? {})) {
    importerSignatures.set(importerId, computeImporterSignature(importer, snapshotHashes));
  }

  return { importerSignatures };
}
