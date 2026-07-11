import fs from "fs";
import path from "path";
import {
  diffPackageSignatures,
  getLockfileName,
  parseLockfileGraph,
  splitImporterSignatures,
  type ExperimentalLockfileInvalidationOptions,
} from "@lage-run/lockfile";
import { getFileFromRef, getMergeBase, type PackageInfos } from "workspace-tools";
import type { TargetLogger } from "@lage-run/reporters";

/**
 * The outcome of analyzing a lockfile change for the experimental smarter invalidation feature.
 *
 * - `unchanged`: the lockfile did not change; no packages are affected and the caller should do no
 *   extra work.
 * - `affected`: the lockfile changed and was analyzed successfully; only `packages` had their
 *   resolved dependency closure changed.
 * - `fallback`: the lockfile changed but could not be analyzed (unsupported version, missing old
 *   version, parse error, etc.); the caller should keep the previous blanket invalidation behavior
 *   so that builds never silently under-invalidate.
 */
export type LockfileChangeResult =
  | { status: "unchanged" }
  | { status: "affected"; packages: Set<string> }
  | { status: "fallback"; reason: string };

/**
 * Determines which workspace packages are affected by a pnpm lockfile change between the `--since`
 * ref (merge-base) and the working tree.
 *
 * The lockfile is only analyzed when it is actually among the changed files, so this does no extra
 * work when the lockfile is unchanged.
 */
export function getLockfileChangedPackages(options: {
  root: string;
  since: string;
  changedFiles: string[];
  packageInfos: PackageInfos;
  experimentalLockfileInvalidation: ExperimentalLockfileInvalidationOptions;
  logger: TargetLogger;
}): LockfileChangeResult {
  const { root, since, changedFiles, packageInfos, experimentalLockfileInvalidation, logger } = options;

  const lockfileName = getLockfileName(experimentalLockfileInvalidation);

  // Cheap membership check first: if the lockfile is not among the changed files, do no extra work.
  if (!changedFiles.includes(lockfileName)) {
    return { status: "unchanged" };
  }

  let newContent: string;
  try {
    newContent = fs.readFileSync(path.join(root, lockfileName), "utf8");
  } catch (e) {
    return { status: "fallback", reason: `could not read current ${lockfileName}: ${e}` };
  }

  // Read the old lockfile from the merge-base so it is consistent with the changed-files set.
  const mergeBase = getMergeBase({ ref: since, cwd: root, throwOnError: false });
  if (mergeBase === undefined) {
    return { status: "fallback", reason: `could not determine the merge-base for ref "${since}"` };
  }
  const oldRef = mergeBase;
  const oldContent = getFileFromRef({ filePath: lockfileName, ref: oldRef, cwd: root, throwOnError: false });
  if (oldContent === undefined) {
    return { status: "fallback", reason: `could not read ${lockfileName} at ref "${oldRef}"` };
  }

  const oldResult = parseLockfileGraph(experimentalLockfileInvalidation, oldContent);
  const newResult = parseLockfileGraph(experimentalLockfileInvalidation, newContent);

  if (oldResult.status !== "success") {
    const reason = oldResult.status === "unsupported" ? oldResult.reason : "no lockfile content";
    return { status: "fallback", reason: `could not analyze old ${lockfileName}: ${reason}` };
  }
  if (newResult.status !== "success") {
    const reason = newResult.status === "unsupported" ? newResult.reason : "no lockfile content";
    return { status: "fallback", reason: `could not analyze current ${lockfileName}: ${reason}` };
  }

  if (oldResult.graph.globalSignature !== newResult.graph.globalSignature) {
    return { status: "fallback", reason: `${lockfileName} global installation metadata changed` };
  }

  const oldSignatures = splitImporterSignatures(oldResult.graph, packageInfos, root);
  const newSignatures = splitImporterSignatures(newResult.graph, packageInfos, root);
  const changedUnmappedImporters = diffPackageSignatures(
    oldSignatures.unmappedImporterSignatures,
    newSignatures.unmappedImporterSignatures
  );
  if (changedUnmappedImporters.size > 0) {
    return {
      status: "fallback",
      reason: `${lockfileName} changed unmapped importer(s): ${[...changedUnmappedImporters].join(", ")}`,
    };
  }

  const changed = diffPackageSignatures(oldSignatures.packageSignatures, newSignatures.packageSignatures);

  logger.verbose(
    `Experimental lockfile invalidation: ${lockfileName} changed; ${changed.size} package(s) affected: ${[...changed].join(",")}`
  );

  return { status: "affected", packages: changed };
}
