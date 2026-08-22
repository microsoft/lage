import fs from "fs";
import { createRequire } from "module";
import path from "path";
import type jsYaml from "js-yaml";
import type { PackageInfos } from "workspace-tools";
import { buildPnpmLockfileGraph, isSupportedPnpmLockfileVersion, type PnpmLockfile } from "./pnpmLockfileGraph.js";
import type { LockfileGraph, LockfileGraphResult, PackageLockfileSignatures } from "./types.js";

/** The default pnpm lockfile file name. */
export const PNPM_LOCKFILE_NAME = "pnpm-lock.yaml";

const requireModule = createRequire(__filename);
let yaml: typeof jsYaml | undefined;

function parseYaml(rawContent: string): unknown {
  yaml ??= requireModule("js-yaml") as typeof jsYaml;
  return yaml.load(rawContent);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateStringRecord(value: unknown, context: string): void {
  if (!isRecord(value)) {
    throw new Error(`${context} must be an object`);
  }
  for (const [name, entry] of Object.entries(value)) {
    if (typeof entry !== "string") {
      throw new Error(`${context}.${name} must be a string`);
    }
  }
}

function validateImporterDependencies(value: unknown, context: string): void {
  if (!isRecord(value)) {
    throw new Error(`${context} must be an object`);
  }
  for (const [name, entry] of Object.entries(value)) {
    if (!isRecord(entry) || typeof entry.version !== "string") {
      throw new Error(`${context}.${name} must contain a string version`);
    }
    if (entry.specifier !== undefined && typeof entry.specifier !== "string") {
      throw new Error(`${context}.${name}.specifier must be a string`);
    }
  }
}

function validatePnpmLockfile(doc: unknown): PnpmLockfile {
  if (!isRecord(doc)) {
    throw new Error("pnpm lockfile content was empty or malformed");
  }
  if (!isRecord(doc.importers)) {
    throw new Error("pnpm lockfile importers must be an object");
  }
  if (doc.packages !== undefined && !isRecord(doc.packages)) {
    throw new Error("pnpm lockfile packages must be an object");
  }
  if (doc.snapshots !== undefined && !isRecord(doc.snapshots)) {
    throw new Error("pnpm lockfile snapshots must be an object");
  }

  for (const [importerId, importer] of Object.entries(doc.importers)) {
    if (!isRecord(importer)) {
      throw new Error(`pnpm importer "${importerId}" must be an object`);
    }
    for (const dependencyType of ["dependencies", "devDependencies", "optionalDependencies"] as const) {
      if (importer[dependencyType] !== undefined) {
        validateImporterDependencies(importer[dependencyType], `pnpm importer "${importerId}".${dependencyType}`);
      }
    }
  }

  for (const [depPath, metadata] of Object.entries((doc.packages as Record<string, unknown> | undefined) ?? {})) {
    if (!isRecord(metadata)) {
      throw new Error(`pnpm package "${depPath}" must be an object`);
    }
  }

  for (const [depPath, snapshot] of Object.entries((doc.snapshots as Record<string, unknown> | undefined) ?? {})) {
    if (!isRecord(snapshot)) {
      throw new Error(`pnpm snapshot "${depPath}" must be an object`);
    }
    for (const dependencyType of ["dependencies", "optionalDependencies"] as const) {
      if (snapshot[dependencyType] !== undefined) {
        validateStringRecord(snapshot[dependencyType], `pnpm snapshot "${depPath}".${dependencyType}`);
      }
    }
  }

  return doc as PnpmLockfile;
}

/**
 * Parses raw pnpm lockfile content (e.g. read from disk or `git show`) into a {@link LockfileGraph}.
 *
 * Returns an `unsupported` result (rather than throwing) when the content cannot be parsed or the
 * lockfile version is not supported, so callers can safely fall back to blanket invalidation.
 */
export function parsePnpmLockfileGraph(rawContent: string): LockfileGraphResult {
  let doc: unknown;
  try {
    doc = parseYaml(rawContent);
  } catch (e) {
    return { status: "unsupported", reason: `pnpm lockfile could not be parsed as YAML: ${e}` };
  }

  if (!isRecord(doc)) {
    return { status: "unsupported", reason: "pnpm lockfile content was empty or malformed" };
  }
  if (!isSupportedPnpmLockfileVersion(doc.lockfileVersion as string | number | undefined)) {
    return {
      status: "unsupported",
      reason: `unsupported pnpm lockfileVersion "${String(doc.lockfileVersion)}"; only the latest format (9.x) is supported`,
    };
  }

  let lockfile: PnpmLockfile;
  try {
    lockfile = validatePnpmLockfile(doc);
  } catch (e) {
    return { status: "unsupported", reason: `pnpm lockfile schema is not supported: ${e}` };
  }

  let graph: LockfileGraph;
  try {
    graph = buildPnpmLockfileGraph(lockfile);
  } catch (e) {
    return { status: "unsupported", reason: `pnpm lockfile could not be interpreted: ${e}` };
  }

  return { status: "success", graph };
}

/**
 * Loads and analyzes the pnpm lockfile at the repo root.
 *
 * Returns `no-lockfile` if no lockfile exists, `unsupported` for unsupported versions/parse errors,
 * or `success` with the computed {@link LockfileGraph}.
 */
export function loadPnpmLockfileGraph(root: string): LockfileGraphResult {
  const lockfilePath = path.join(root, PNPM_LOCKFILE_NAME);
  let rawContent: string;
  try {
    rawContent = fs.readFileSync(lockfilePath, "utf8");
  } catch {
    return { status: "no-lockfile" };
  }

  return parsePnpmLockfileGraph(rawContent);
}

function toPosix(p: string): string {
  return p.replace(/\\/g, "/");
}

/**
 * Builds a map of importer id (posix-relative path from the root) to workspace package name.
 */
function createImporterIdToPackageName(packageInfos: PackageInfos, root: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const [name, info] of Object.entries(packageInfos)) {
    const packageDir = path.dirname(info.packageJsonPath);
    const importerId = toPosix(path.relative(root, packageDir)) || ".";
    map.set(importerId, name);
  }
  return map;
}

/**
 * Splits a lockfile graph's per-importer signatures into workspace-package signatures and unmapped
 * importer signatures. Unmapped importers (commonly the root importer `"."`) are not safe to ignore:
 * root dev tools can affect every package script, so callers should treat changes to these
 * signatures as global invalidation.
 */
export function splitImporterSignatures(graph: LockfileGraph, packageInfos: PackageInfos, root: string): PackageLockfileSignatures {
  const importerIdToPackageName = createImporterIdToPackageName(packageInfos, root);
  const packageSignatures = new Map<string, string>();
  const unmappedImporterSignatures = new Map<string, string>();

  for (const [importerId, signature] of graph.importerSignatures) {
    const packageName = importerIdToPackageName.get(importerId);
    if (packageName !== undefined) {
      packageSignatures.set(packageName, signature);
    } else {
      unmappedImporterSignatures.set(importerId, signature);
    }
  }

  return { packageSignatures, unmappedImporterSignatures };
}

/**
 * Maps a lockfile graph's per-importer signatures to per-workspace-package signatures.
 */
export function mapImporterSignaturesToPackages(graph: LockfileGraph, packageInfos: PackageInfos, root: string): Map<string, string> {
  return new Map(splitImporterSignatures(graph, packageInfos, root).packageSignatures);
}

/**
 * Returns the set of workspace packages whose resolved dependency closure changed between two
 * lockfile graphs. A package is considered changed if its signature differs, or if it gained or
 * lost a lockfile entry.
 */
export function diffPackageSignatures(oldSignatures: ReadonlyMap<string, string>, newSignatures: ReadonlyMap<string, string>): Set<string> {
  const changed = new Set<string>();

  for (const [packageName, signature] of newSignatures) {
    if (oldSignatures.get(packageName) !== signature) {
      changed.add(packageName);
    }
  }

  for (const packageName of oldSignatures.keys()) {
    if (!newSignatures.has(packageName)) {
      changed.add(packageName);
    }
  }

  return changed;
}
