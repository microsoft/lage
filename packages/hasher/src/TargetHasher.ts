import type { Logger } from "@lage-run/logger";
import type { Target } from "@lage-run/target-graph";
import {
  type ExperimentalLockfileInvalidationOptions,
  getLockfileName,
  parseLockfileGraph,
  splitImporterSignatures,
} from "@lage-run/lockfile";
import { resolveExternalDependencies } from "backfill-hasher";
import crypto from "crypto";
import fs from "fs";
import { hash } from "glob-hasher";
import path from "path";
import {
  createDependencyMap,
  type DependencyMap,
  getPackageInfo,
  getPackageInfosAsync,
  type PackageInfos,
  type ParsedLock,
  parseLockFile,
} from "workspace-tools";
import { FileHasher } from "./FileHasher.js";
import { PackageTree } from "./PackageTree.js";
import { getInputFiles } from "./getInputFiles.js";
import { hashStrings } from "./hashStrings.js";
import { globAsyncCached } from "./globAsyncCached.js";

export interface TargetHasherOptions {
  root: string;
  environmentGlob: string[];
  cacheKey?: string;
  cliArgs?: string[];
  // "never" means no structured data arguments are used
  logger?: Logger<never, never>;
  /**
   * **Experimental.** When set, external dependency invalidation is computed from a precise
   * per-package lockfile closure signature instead of the (less reliable) resolved dependency list.
   * Only pnpm (lockfileVersion 9.x) is supported; other package managers/versions fall back to the
   * default behavior.
   */
  experimentalLockfileInvalidation?: ExperimentalLockfileInvalidationOptions;
}

export interface TargetManifest {
  id: string;
  hash: string;
  globalInputsHash: string;
  dependency: Record<string, string>;
  fileHasher: FileHasher;
  files: Record<
    string,
    {
      mtimeMs: number;
      size: number;
      hash: string;
    }
  >;
}

/**
 * TargetHasher is a class that can be used to generate a hash of a target.
 * It uses `glob-hasher` internally.
 */
export class TargetHasher {
  private logger: Logger<never, never> | undefined;
  private fileHasher: FileHasher;
  public packageTree: PackageTree | undefined;

  private initializedPromise: Promise<unknown> | undefined;

  private packageInfos: PackageInfos = {};
  private globalInputsHash: Record<string, string> | undefined;
  private lockInfo: ParsedLock | undefined;
  private targetHashes: Record<string, string> = {};

  /**
   * When the experimental lockfile invalidation feature is enabled and the lockfile is supported,
   * maps a workspace package name to a single stable signature capturing its entire resolved
   * external dependency closure. Undefined when the feature is disabled or the lockfile is
   * unsupported (in which case the default `resolveExternalDependencies` behavior is used).
   */
  private lockfilePackageSignatures: Map<string, string> | undefined;

  /**
   * Signature for lockfile importers that do not map to a workspace package, such as the repo root
   * importer. Root dev tools can affect any package script, so this signature is included in every
   * target hash when available.
   */
  private lockfileGlobalSignature: string | undefined;

  /** Signature used for every target when precise analysis is unavailable. */
  private lockfileFallbackSignature: string | undefined;

  /** Signature used by root targets, which can observe every workspace importer. */
  private lockfileRootSignature: string | undefined;

  /** File stat key used by long-lived server mode to detect lockfile changes cheaply. */
  private lockfileStateKey: string | undefined;

  private readonly unreadableLockfileNonce = crypto.randomUUID();

  public dependencyMap: DependencyMap = {
    dependencies: new Map(),
    dependents: new Map(),
  };

  constructor(private options: TargetHasherOptions) {
    const { root, logger } = options;
    this.logger = logger;

    this.fileHasher = new FileHasher({
      root,
    });
  }

  private ensureInitialized(): void {
    if (!this.initializedPromise) {
      throw new Error("TargetHasher is not initialized");
    }
  }

  public async initialize(): Promise<void> {
    const { environmentGlob, root } = this.options;

    if (this.initializedPromise) {
      await this.initializedPromise;
      return;
    }

    this.initializedPromise = Promise.all([
      this.fileHasher
        .readManifest()
        .then(() => globAsyncCached(environmentGlob, { cwd: root }))
        .then((files) => this.excludeManagedLockfile(files))
        .then((files) => this.fileHasher.hash(files))
        .then((h) => (this.globalInputsHash = h)),

      getPackageInfosAsync(root).then((packageInfos) => {
        if (Object.keys(packageInfos).length) {
          this.packageInfos = packageInfos;
        } else {
          const rootInfo = getPackageInfo(root);
          if (rootInfo) {
            this.packageInfos = { [rootInfo.name]: rootInfo };
          }
        }

        this.dependencyMap = createDependencyMap(this.packageInfos, { withDevDependencies: true, withPeerDependencies: false });
        this.packageTree = new PackageTree({
          root,
          packageInfos: this.packageInfos,

          // TODO: (optimization) false if process.env.TF_BUILD || process.env.CI
          includeUntracked: true,
        });

        return this.packageTree.initialize();
      }),

      this.options.experimentalLockfileInvalidation
        ? Promise.resolve()
        : parseLockFile(root).then((lockInfo) => (this.lockInfo = lockInfo)),
    ]);

    await this.initializedPromise;

    this.initializeLockfileSignatures();

    if (this.logger !== undefined) {
      const globalInputsHash = hashStrings(Object.values(this.globalInputsHash ?? {}));
      this.logger.verbose(`Global inputs hash: ${globalInputsHash}`);
    }
  }

  /**
   * Computes the per-package lockfile closure signatures once, when the experimental lockfile
   * invalidation feature is enabled. Runs after `packageInfos` is populated. On any unsupported or
   * missing lockfile, hashes the raw lockfile state into every target so fallback remains
   * conservative even when users remove the lockfile from `environmentGlob`.
   */
  private initializeLockfileSignatures(): void {
    const { experimentalLockfileInvalidation, root } = this.options;
    if (!experimentalLockfileInvalidation) {
      return;
    }

    this.lockfilePackageSignatures = undefined;
    this.lockfileGlobalSignature = undefined;
    this.lockfileFallbackSignature = undefined;
    this.lockfileRootSignature = undefined;

    const lockfileName = getLockfileName(experimentalLockfileInvalidation);
    const lockfilePath = path.join(root, lockfileName);
    let rawContent: string;
    try {
      const stat = fs.statSync(lockfilePath);
      this.lockfileStateKey = `${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`;
      rawContent = fs.readFileSync(lockfilePath, "utf8");
    } catch (e) {
      const errorCode = e instanceof Error && "code" in e ? String(e.code) : undefined;
      this.lockfileStateKey = errorCode === "ENOENT" ? "missing" : `unreadable:${this.unreadableLockfileNonce}`;
      this.lockfileFallbackSignature = hashStrings([`lockfile:${lockfileName}:${this.lockfileStateKey}`]);
      this.lockfileRootSignature = this.lockfileFallbackSignature;
      this.logger?.warn(
        errorCode === "ENOENT"
          ? `Experimental lockfile invalidation is enabled but no ${lockfileName} was found; using conservative cache invalidation.`
          : `Experimental lockfile invalidation could not read ${lockfileName} (${e}); disabling cross-run cache reuse.`
      );
      return;
    }

    const result = parseLockfileGraph(experimentalLockfileInvalidation, rawContent);
    if (result.status === "success") {
      const { packageSignatures, unmappedImporterSignatures } = splitImporterSignatures(result.graph, this.packageInfos, root);
      const missingPackages = Object.keys(this.packageInfos).filter((packageName) => !packageSignatures.has(packageName));
      if (missingPackages.length > 0) {
        this.setLockfileFallbackSignature(
          lockfileName,
          rawContent,
          `no lockfile importer was found for workspace package(s): ${missingPackages.join(", ")}`
        );
        return;
      }

      this.lockfilePackageSignatures = new Map(packageSignatures);
      const unmappedSignatures = [...unmappedImporterSignatures]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([importerId, signature]) => `${importerId}:${signature}`);
      this.lockfileGlobalSignature = hashStrings([result.graph.globalSignature, ...unmappedSignatures]);
      this.lockfileRootSignature = hashStrings([
        result.graph.globalSignature,
        ...[...result.graph.importerSignatures]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([importerId, signature]) => `${importerId}:${signature}`),
      ]);
      this.logger?.verbose(
        `Experimental lockfile invalidation enabled for "${experimentalLockfileInvalidation.packageManager}"; computed closure signatures for ${this.lockfilePackageSignatures.size} package(s) and ${unmappedImporterSignatures.size} unmapped importer(s).`
      );
    } else {
      const reason = result.status === "unsupported" ? result.reason : "lockfile content was unavailable";
      this.setLockfileFallbackSignature(lockfileName, rawContent, reason);
    }
  }

  private setLockfileFallbackSignature(lockfileName: string, rawContent: string, reason: string): void {
    this.lockfilePackageSignatures = undefined;
    this.lockfileGlobalSignature = undefined;
    this.lockfileFallbackSignature = hashStrings([`lockfile:${lockfileName}`, rawContent]);
    this.lockfileRootSignature = this.lockfileFallbackSignature;
    this.logger?.warn(
      `Experimental lockfile invalidation could not precisely analyze ${lockfileName} (${reason}); hashing the complete lockfile into every target.`
    );
  }

  /**
   * Refreshes experimental lockfile signatures if the configured lockfile changed. This is used by
   * the long-lived worker service; normal one-shot Lage runs never pay this stat check.
   */
  public refreshLockfileSignatures(): void {
    const { experimentalLockfileInvalidation, root } = this.options;
    if (!experimentalLockfileInvalidation) {
      return;
    }

    const lockfilePath = path.join(root, getLockfileName(experimentalLockfileInvalidation));
    let stateKey: string;
    try {
      const stat = fs.statSync(lockfilePath);
      stateKey = `${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`;
    } catch (e) {
      const errorCode = e instanceof Error && "code" in e ? String(e.code) : undefined;
      stateKey = errorCode === "ENOENT" ? "missing" : `unreadable:${this.unreadableLockfileNonce}`;
    }

    if (stateKey !== this.lockfileStateKey) {
      this.initializeLockfileSignatures();
    }
  }

  public async hash(target: Target): Promise<string> {
    this.ensureInitialized();

    const { root } = this.options;

    if (target.cwd === root && target.cache) {
      if (!target.inputs) {
        throw new Error(`No "inputs" specified for target "${target.id}"; cannot cache.`);
      }

      const files = await globAsyncCached(target.inputs, { cwd: root });
      const fileFashes = hash(files, { cwd: root }) ?? {};

      const hashes = Object.values(fileFashes) as string[];
      if (this.lockfileRootSignature !== undefined) {
        hashes.push(`lockfile-root:${this.lockfileRootSignature}`);
      }

      return hashStrings(hashes);
    }

    // 1. add hash of target's inputs
    // 2. add hash of target packages' internal and external deps
    const { dependencies, devDependencies } = this.packageInfos[target.packageName!];

    const allDependencies: Record<string, string> = {
      ...dependencies,
      ...devDependencies,
    };

    const internalDeps = Object.keys(allDependencies).filter((dep) => this.packageInfos[dep]);

    // When the experimental lockfile invalidation feature is enabled and produced a signature for
    // this package, use the precise closure signature instead of the resolved dependency list. This
    // captures the package's entire transitive external closure (including peer-resolved deps) in a
    // single stable hash, so only packages whose closure actually changed get a new hash.
    const lockfileSignature = this.lockfilePackageSignatures?.get(target.packageName!);
    const lockfileGlobalDeps = this.lockfileGlobalSignature !== undefined ? [`lockfile-global:${this.lockfileGlobalSignature}`] : [];
    let externalDeps: string[];
    if (this.options.experimentalLockfileInvalidation) {
      externalDeps =
        this.lockfileFallbackSignature !== undefined
          ? [`lockfile-fallback:${this.lockfileFallbackSignature}`]
          : [`lockfile:${lockfileSignature!}`, ...lockfileGlobalDeps];
    } else {
      externalDeps = resolveExternalDependencies(allDependencies, this.packageInfos, this.lockInfo!);
    }
    const resolvedDependencies = [...internalDeps, ...externalDeps].sort();

    const files = getInputFiles(target, this.dependencyMap, this.packageTree!);
    const fileHashes = this.fileHasher.hash(files) ?? {}; // this list is sorted by file name

    // get target hashes
    const targetDepHashes = target.dependencies?.sort().map((targetDep) => this.targetHashes[targetDep]);

    const globalFileHashes = await this.getEnvironmentGlobHashes(root, target);

    const combinedHashes = [
      // Environmental hashes
      ...Object.values(globalFileHashes),
      `${target.id}|${JSON.stringify(this.options.cliArgs)}`,
      this.options.cacheKey || "",

      // File content hashes based on target.inputs
      ...Object.values(fileHashes),

      // Dependency hashes
      ...resolvedDependencies,
      ...targetDepHashes,
    ].filter(Boolean);

    const hashString = hashStrings(combinedHashes);

    this.targetHashes[target.id] = hashString;

    return hashString;
  }

  private async getEnvironmentGlobHashes(root: string, target: Target): Promise<Record<string, string>> {
    const globalFileHashes = target.environmentGlob
      ? this.fileHasher.hash(this.excludeManagedLockfile(await globAsyncCached(target.environmentGlob, { cwd: root })))
      : (this.globalInputsHash ?? {});

    return globalFileHashes;
  }

  private excludeManagedLockfile(files: string[]): string[] {
    const { experimentalLockfileInvalidation, root } = this.options;
    if (!experimentalLockfileInvalidation) {
      return files;
    }

    const lockfileName = getLockfileName(experimentalLockfileInvalidation);
    return files.filter((file) => {
      const relativePath = (path.isAbsolute(file) ? path.relative(root, file) : file).replace(/\\/g, "/").replace(/^\.\//, "");
      return relativePath !== lockfileName;
    });
  }

  public cleanup(): void {
    this.fileHasher.writeManifest();
  }
}
