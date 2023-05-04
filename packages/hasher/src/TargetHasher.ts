/* eslint-disable no-console */
import type { Target } from "@lage-run/target-graph";
import { hash } from "glob-hasher";
import fg from "fast-glob";
import { hashStringsNoSort, hashStrings } from "./hashStrings.js";
import { resolveInternalDependencies } from "./resolveInternalDependencies.js";

import fs from "fs";

import path from "path";
import {
  type ParsedLock,
  type WorkspaceInfo,
  getWorkspacesAsync,
  parseLockFile,
  createDependencyMap,
  type PackageInfos,
} from "workspace-tools";
import { infoFromPackageJson } from "workspace-tools/lib/infoFromPackageJson.js";
import { resolveExternalDependencies } from "./resolveExternalDependencies.js";

import { FileHasher } from "./FileHasher.js";
import type { DependencyMap } from "workspace-tools/lib/graph/createDependencyMap.js";
import { PackageTree } from "./PackageTree.js";

export interface TargetHasherOptions {
  root: string;
  environmentGlob: string[];
  cacheKey?: string;
  cliArgs?: string[];
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
  #ignorePatterns: string[] = [];
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
      if (pattern.startsWith("^")) {
        // get all the packages that are transitive deps and add them to the list
        const queue = [target.packageName];

        const visited = new Set<string>();

        while (queue.length > 0) {
          const pkg = queue.pop()!;
          if (visited.has(pkg)) {
            continue;
          }
          visited.add(pkg);

          if (this.dependencyMap.dependencies.has(pkg)) {
            if (pkg !== target.packageName) {
              expandedPatterns[pkg] = expandedPatterns[pkg] ?? [];
              expandedPatterns[pkg].push(pattern.slice(1));
            }

            const deps = this.dependencyMap.dependencies.get(pkg) ?? [];
            if (deps) {
              queue.push(...deps);
            }
          }
        }
      } else {
        const pkg = target.packageName!;
        expandedPatterns[pkg] = expandedPatterns[pkg] ?? [];
        expandedPatterns[pkg].push(pattern.slice(1));
      }
    }

    return expandedPatterns;
  }

  constructor(private options: TargetHasherOptions) {
    const { root } = options;

    const gitignoreFile = path.join(root, ".gitignore");
    if (fs.existsSync(gitignoreFile)) {
      this.#ignorePatterns = fs
        .readFileSync(gitignoreFile, "utf-8")
        .split("\n")
        .map((s) => s.trim())
        .filter((line) => line && !line.startsWith("#"));
    }

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
        .then(() => this.fileHasher.hash(environmentGlob))
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

      const hashes = Object.values(fileFashes);

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

    const inputs = target.inputs ?? ["**/*", "^**/*"];
    console.time("prelude");
    const packagePatterns = this.expandInputPatterns(inputs, target);
    console.timeEnd("prelude");
    console.time("getPackageFiles");

    const files: string[] = [];
    for (const [pkg, patterns] of Object.entries(packagePatterns)) {
      const packageFiles = this.packageTree!.getPackageFiles(pkg, patterns);
      files.push(...packageFiles);
    }

    console.timeEnd("getPackageFiles");

    console.time("hashing content");
    const fileHashes = (await this.fileHasher.hash(files)) ?? {}; // this list is sorted by file name

    console.timeEnd("hashing content");

    // get target hashes
    const targetDepHashes = target.dependencies?.sort().map((targetDep) => this.targetHashes[targetDep]);

    console.time("hashStrings");

    const combinedHashes = [
      // Environmental hashes
      ...Object.values(this.globalInputsHash ?? {}),
      `${target.id}|${JSON.stringify(this.options.cliArgs)}`,
      this.options.cacheKey || "",

      // File content hashes based on target.inputs
      ...Object.values(fileHashes),

      // Dependency hashes
      ...resolvedDependencies,
      ...targetDepHashes,
    ];
    const hashString = hashStringsNoSort(combinedHashes);

    this.targetHashes[target.id] = hashString;

    console.timeEnd("hashStrings");

    return hashString;
  }

  async cleanup() {
    await this.fileHasher.writeManifest();
  }
}

if (require.main === module) {
  (async () => {
    const root = "/workspace/tmp1";
    const target: Target = {
      id: "s#build",
      cwd: root + "/packages/apps/apps-files",
      inputs: ["**/*", "^**/*"],
      dependencies: [],
      dependents: [],
      depSpecs: [],
      label: "files - build",
      task: "build",
      packageName: "@msteams/apps-files",
    };

    const hasher = new TargetHasher({ root, environmentGlob: ["lage.config.js"] });

    console.log(`hashing ${target.packageName}`);

    console.time("init");

    await hasher.initialize();
    console.timeEnd("init");

    console.time("TargetHasher.hash()");
    const hashes = await hasher.hash(target);
    console.timeEnd("TargetHasher.hash()");

    console.time("TargetHasher.hash() 2");
    await hasher.hash(target);
    console.timeEnd("TargetHasher.hash() 2");

    console.time("TargetHasher.hash() 2");
    await hasher.hash(target);
    console.timeEnd("TargetHasher.hash() 2");

    console.time("TargetHasher.hash() 2");
    await hasher.hash(target);
    console.timeEnd("TargetHasher.hash() 2");

    console.time("TargetHasher.hash() 2");
    await hasher.hash(target);
    console.timeEnd("TargetHasher.hash() 2");

    await hasher.cleanup();

    console.log(hashes);
  })();
}
