import type { Target } from "@lage-run/target-graph";
import { hash } from "glob-hasher";
import { globAsync } from "@lage-run/globby";

import fs from "fs";
import path from "path";
import {
  type ParsedLock,
  type WorkspaceInfos,
  type PackageInfos,
  getWorkspaceInfosAsync,
  parseLockFile,
  createDependencyMap,
} from "workspace-tools";
import type { DependencyMap } from "workspace-tools/lib/graph/createDependencyMap.js";
import { infoFromPackageJson } from "workspace-tools/lib/infoFromPackageJson.js";

import { hashStrings } from "./hashStrings.js";
import { resolveInternalDependencies } from "./resolveInternalDependencies.js";
import { resolveExternalDependencies } from "./resolveExternalDependencies.js";
import { FileHasher } from "./FileHasher.js";
import type { Logger } from "@lage-run/logger";
import { PackageTree } from "./PackageTree.js";
import { getInputFiles } from "./getInputFiles.js";

export interface TargetHasherOptions {
  root: string;
  environmentGlob: string[];
  cacheKey?: string;
  cliArgs?: string[];
  logger?: Logger;
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
 *
 * Currently, it encapsulates the use of `backfill-hasher` to generate a hash.
 */
export class TargetHasher {
  targetHashesLog: Record<string, { fileHashes: Record<string, string>; globalFileHashes: Record<string, string> }> = {};
  targetHashesDirectory: string;

  logger: Logger | undefined;
  fileHasher: FileHasher;
  packageTree: PackageTree | undefined;

  initializedPromise: Promise<unknown> | undefined;

  packageInfos: PackageInfos = {};
  workspaceInfo: WorkspaceInfos | undefined;
  globalInputsHash: Record<string, string> | undefined;
  lockInfo: ParsedLock | undefined;
  targetHashes: Record<string, string> = {};

  dependencyMap: DependencyMap = {
    dependencies: new Map(),
    dependents: new Map(),
  };

  getPackageInfos(workspacePackages: WorkspaceInfos) {
    const { root } = this.options;
    const packageInfos: PackageInfos = {};

    if (workspacePackages.length) {
      for (const pkg of workspacePackages) {
        packageInfos[pkg.name] = pkg.packageJson;
      }
    } else {
      const packageJsonPath = path.join(root, "package.json");
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
          const rootInfo = infoFromPackageJson(packageJson, packageJsonPath);
          if (rootInfo) {
            packageInfos[rootInfo.name] = rootInfo;
          }
        } catch (e) {
          throw new Error(`Invalid package.json file detected ${packageJsonPath}: ${(e as Error)?.message || e}`);
        }
      }
    }

    return packageInfos;
  }

  constructor(private options: TargetHasherOptions) {
    const { root, logger } = options;
    this.logger = logger;

    this.fileHasher = new FileHasher({
      root,
    });

    this.targetHashesDirectory = path.join(root, "node_modules", ".cache", "lage", "hashes");

    if (!fs.existsSync(this.targetHashesDirectory)) {
      fs.mkdirSync(this.targetHashesDirectory, { recursive: true });
    }
  }

  ensureInitialized() {
    if (!this.initializedPromise) {
      throw new Error("TargetHasher is not initialized");
    }
  }

  async initialize() {
    const { environmentGlob, root } = this.options;

    if (this.initializedPromise) {
      await this.initializedPromise;
      return;
    }

    this.initializedPromise = Promise.all([
      this.fileHasher
        .readManifest()
        .then(() => globAsync(environmentGlob, { cwd: root }))
        .then((files) => this.fileHasher.hash(files))
        .then((hash) => (this.globalInputsHash = hash)),

      getWorkspaceInfosAsync(root)
        .then((workspaceInfo) => (this.workspaceInfo = workspaceInfo))
        .then(() => {
          this.packageInfos = this.getPackageInfos(this.workspaceInfo!);

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

  async hash(target: Target): Promise<string> {
    this.ensureInitialized();

    const { root } = this.options;

    if (target.cwd === root && target.cache) {
      if (!target.inputs) {
        throw new Error(`No "inputs" specified for target "${target.id}"; cannot cache.`);
      }

      const files = await globAsync(target.inputs, { cwd: root });
      const fileFashes = hash(files, { cwd: root }) ?? {};

      const hashes = Object.values(fileFashes) as string[];

      return hashStrings(hashes);
    }

    // 1. add hash of target's inputs
    // 2. add hash of target packages' internal and external deps
    const { dependencies, devDependencies } = this.packageInfos[target.packageName!];

    const workspaceInfo = this.workspaceInfo!;
    const parsedLock = this.lockInfo!;

    const allDependencies: Record<string, string> = {
      ...dependencies,
      ...devDependencies,
    };

    const internalDeps = resolveInternalDependencies(allDependencies, workspaceInfo);
    const externalDeps = resolveExternalDependencies(allDependencies, workspaceInfo, parsedLock);
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

    this.targetHashesLog[target.id] = { fileHashes, globalFileHashes };

    return hashString;
  }

  writeTargetHashesManifest() {
    for (const [id, { fileHashes, globalFileHashes }] of Object.entries(this.targetHashesLog)) {
      const targetHashesManifestPath = path.join(this.targetHashesDirectory, `${id}.json`);
      if (!fs.existsSync(path.dirname(targetHashesManifestPath))) {
        fs.mkdirSync(path.dirname(targetHashesManifestPath), { recursive: true });
      }
      fs.writeFileSync(targetHashesManifestPath, JSON.stringify({ fileHashes, globalFileHashes }), "utf-8");
    }
  }

  async getEnvironmentGlobHashes(root: string, target: Target) {
    const globalFileHashes = target.environmentGlob
      ? this.fileHasher.hash(await globAsync(target.environmentGlob ?? [], { cwd: root }))
      : (this.globalInputsHash ?? {});

    return globalFileHashes;
  }

  async cleanup() {
    this.writeTargetHashesManifest();
    await this.fileHasher.writeManifest();
  }
}
