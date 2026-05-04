import type { Logger } from "@lage-run/logger";
import type { Target } from "@lage-run/target-graph";
import { resolveExternalDependencies } from "backfill-hasher";
import { hash } from "glob-hasher";
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

      parseLockFile(root).then((lockInfo) => (this.lockInfo = lockInfo)),
    ]);

    await this.initializedPromise;

    if (this.logger !== undefined) {
      const globalInputsHash = hashStrings(Object.values(this.globalInputsHash ?? {}));
      this.logger.verbose(`Global inputs hash: ${globalInputsHash}`);
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

      return hashStrings(hashes);
    }

    // 1. add hash of target's inputs
    // 2. add hash of target packages' internal and external deps
    const { dependencies, devDependencies } = this.packageInfos[target.packageName!];

    const parsedLock = this.lockInfo!;

    const allDependencies: Record<string, string> = {
      ...dependencies,
      ...devDependencies,
    };

    const internalDeps = Object.keys(allDependencies).filter((dep) => this.packageInfos[dep]);
    const externalDeps = resolveExternalDependencies(allDependencies, this.packageInfos, parsedLock);
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
      ? this.fileHasher.hash(await globAsyncCached(target.environmentGlob, { cwd: root }))
      : (this.globalInputsHash ?? {});

    return globalFileHashes;
  }

  public cleanup(): void {
    this.fileHasher.writeManifest();
  }
}
