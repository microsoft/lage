import type { Target } from "@lage-run/target-graph";
import { hash } from "glob-hasher";
import fg from "fast-glob";

import fs from "fs";
import path from "path";
import {
  type ParsedLock,
  type WorkspaceInfo,
  type PackageInfos,
  getWorkspacesAsync,
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
  logger: Logger | undefined;
  fileHasher: FileHasher;
  packageTree: PackageTree | undefined;

  initializedPromise: Promise<unknown> | undefined;

  packageInfos: PackageInfos = {};
  workspaceInfo: WorkspaceInfo | undefined;
  globalInputsHash: Record<string, string> | undefined;
  lockInfo: ParsedLock | undefined;
  targetHashes: Record<string, string> = {};

  dependencyMap: DependencyMap = {
    dependencies: new Map(),
    dependents: new Map(),
  };

  memoizedEnvGlobResults = new Map<string, string[]>();

  async getMemorizedEnvGlobResults(envGlob: string[]) {
    const key = envGlob.join("\0ENV_GLOB\0");
    const { root } = this.options;

    if (!this.memoizedEnvGlobResults.has(key)) {
      const files = await fg(envGlob, { cwd: root });
      this.memoizedEnvGlobResults.set(key, files);
    }

    return this.memoizedEnvGlobResults.get(key) ?? [];
  }

  getPackageInfos(workspacePackages: WorkspaceInfo) {
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

  expandInputPatterns(patterns: string[], target: Target) {
    const expandedPatterns: Record<string, string[]> = {};

    for (const pattern of patterns) {
      if (pattern.startsWith("^") || pattern.startsWith("!^")) {
        const matchPattern = pattern.replace("^", "");

        // get all the packages that are transitive deps and add them to the list
        const queue = [target.packageName];

        const visited = new Set<string>();

        while (queue.length > 0) {
          const pkg = queue.pop()!;
          if (visited.has(pkg)) {
            continue;
          }
          visited.add(pkg);

          if (pkg !== target.packageName) {
            expandedPatterns[pkg] = expandedPatterns[pkg] ?? [];
            expandedPatterns[pkg].push(matchPattern);
          }

          if (this.dependencyMap.dependencies.has(pkg)) {
            const deps = this.dependencyMap.dependencies.get(pkg);
            if (deps) {
              for (const dep of deps) {
                queue.push(dep);
              }
            }
          }
        }
      } else {
        const pkg = target.packageName!;
        expandedPatterns[pkg] = expandedPatterns[pkg] ?? [];
        expandedPatterns[pkg].push(pattern);
      }
    }

    return expandedPatterns;
  }

  constructor(private options: TargetHasherOptions) {
    const { root, logger } = options;
    this.logger = logger;

    this.fileHasher = new FileHasher({
      root,
    });
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
        .then(() => this.getMemorizedEnvGlobResults(environmentGlob))
        .then((files) => this.fileHasher.hash(files))
        .then((hash) => (this.globalInputsHash = hash)),

      getWorkspacesAsync(root)
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
      // Log global input hashs to log file
      const globalInputsHashJson = JSON.stringify(this.globalInputsHash, null, 2);
      this.logger.silly(globalInputsHashJson);
    }
  }

  async hash(target: Target): Promise<string> {
    this.ensureInitialized();

    const { root } = this.options;

    if (target.cwd === root && target.cache) {
      if (!target.inputs) {
        throw new Error("Root-level targets must have `inputs` defined if it has cache enabled.");
      }

      const files = await fg(target.inputs, { cwd: root });
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

    const inputs = target.inputs ?? ["**/*"];

    const packagePatterns = this.expandInputPatterns(inputs, target);
    const files: string[] = [];
    for (const [pkg, patterns] of Object.entries(packagePatterns)) {
      const packageFiles = this.packageTree!.getPackageFiles(pkg, patterns);
      files.push(...packageFiles);
    }
    const fileHashes = this.fileHasher.hash(files) ?? {}; // this list is sorted by file name

    // get target hashes
    const targetDepHashes = target.dependencies?.sort().map((targetDep) => this.targetHashes[targetDep]);

    const envGlobFiles = target.environmentGlob
      ? await this.getMemorizedEnvGlobResults(target.environmentGlob)
      : Object.values(this.globalInputsHash ?? {});

    const combinedHashes = [
      // Environmental hashes
      ...envGlobFiles,
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

  async cleanup() {
    await this.fileHasher.writeManifest();
  }
}
