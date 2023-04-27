import { salt } from "./salt.js";
import type { Target } from "@lage-run/target-graph";
import { hash } from "glob-hasher";
import fg from "fast-glob";
import { hashStrings } from "./hashStrings.js";
import { resolveInternalDependencies } from "./resolveInternalDependencies.js";

import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { type ParsedLock, type WorkspaceInfo, getWorkspacesAsync, parseLockFile } from "workspace-tools";
import { resolveExternalDependencies } from "./resolveExternalDependencies.js";

import { FileHasher } from "./FileHasher.js";

export interface TargetHasherOptions {
  root: string;
  environmentGlob: string[];
  cacheKey?: string;
  cliArgs?: string[];
}

function globFiles(globs: string[], { cwd }: { cwd: string }) {
  return fg(globs, { cwd }).then((files) => hash(files, { cwd }) ?? {});
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

  static workspaceInfoPromise: Promise<WorkspaceInfo>;
  static globalInputsHashPromise: Promise<Record<string, string>>;
  static lockInfoPromise: Promise<ParsedLock>;

  constructor(private options: TargetHasherOptions) {
    const { environmentGlob, root } = options;
    TargetHasher.globalInputsHashPromise = globFiles(environmentGlob, { cwd: root });
    TargetHasher.workspaceInfoPromise = getWorkspacesAsync(root);
    TargetHasher.lockInfoPromise = parseLockFile(root);

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

  #targetManifest(target: Target) {
    const { root } = this.options;
    const cacheDirectory = path.join(root, "node_modules", ".cache", "lage");
    return path.join(cacheDirectory, "targets", `${target.id}.json`);
  }

  async #readManifest(target: Target) {
    const manifestFile = this.#targetManifest(target);
    if (fs.existsSync(manifestFile)) {
      const contents = await fsp.readFile(manifestFile, "utf-8");
      return JSON.parse(contents) as TargetManifest;
    }
  }

  async #writeManifest(target: Target) {
    // const manifestFile = this.#targetManifest(target);
    // if (fs.existsSync(manifestFile)) {
    //   const contents = await fsp.readFile(manifestFile, "utf-8");
    //   return JSON.parse(contents) as TargetManifest;
    // }
  }

  async hash(target: Target): Promise<string> {
    const { root } = this.options;

    const globalInputsHash = await TargetHasher.globalInputsHashPromise;

    const hashKey = await salt(
      target.environmentGlob ?? this.options.environmentGlob ?? ["lage.config.js"],
      `${target.id}|${JSON.stringify(this.options.cliArgs)}`,
      this.options.root,
      this.options.cacheKey || ""
    );

    if (target.cwd === root && target.cache) {
      if (!target.inputs) {
        throw new Error("Root-level targets must have `inputs` defined if it has cache enabled.");
      }

      const files = await fg(target.inputs, { cwd: root });
      const fileFashes = hash(files, { cwd: root }) ?? {};

      const hashes = Object.values(fileFashes);
      hashes.push(hashKey);

      return hashStrings(hashes);
    }

    // 1. add hash of target's inputs
    // 2. add hash of target packages' internal and external deps
    const { dependencies, devDependencies } = JSON.parse(fs.readFileSync(path.join(target.cwd, "package.json"), "utf-8"));
    const workspaceInfo = await TargetHasher.workspaceInfoPromise;
    const parsedLock = await TargetHasher.lockInfoPromise;

    const allDependencies: Record<string, string> = {
      ...dependencies,
      ...devDependencies,
    };

    const internalDeps = resolveInternalDependencies(allDependencies, workspaceInfo);
    const externalDeps = resolveExternalDependencies(allDependencies, workspaceInfo, parsedLock);
    const resolvedDependencies = [...internalDeps, ...externalDeps];

    const inputs = target.inputs ?? ["**/*"];

    const files = await fg(
      inputs.map((i) => path.relative(root, path.join(target.cwd, i)).replace(/\\/g, "/")),
      { cwd: root, ignore: this.#ignorePatterns }
    );

    console.time("hash files");
    const fileHashes = hash(files, { cwd: root }) ?? {};
    console.timeEnd("hash files");

    const hashString = hashStrings(Object.values(fileHashes).concat(resolvedDependencies).concat(hashKey));

    return hashString;
  }
}

if (require.main === module) {
  (async () => {
    const root = "/workspace/tmp1";
    const hasher = new TargetHasher({ root, environmentGlob: ["lage.config.js"] });

    const target: Target = {
      id: "s#build",
      cwd: root + "/packages/apps/apps-files",
      inputs: ["**/*"],
      dependencies: [],
      dependents: [],
      depSpecs: [],
      label: "s - build",
      task: "build",
      packageName: "s",
    };

    await hasher.fileHasher.readManifest();
    console.time("target hash");
    const hashes = await hasher.hash(target);
    console.timeEnd("target hash");
    await hasher.fileHasher.writeManifest();

    console.log(Object.keys(hashes).length);
  })();
}
