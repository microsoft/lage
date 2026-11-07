// NOTE: never place the import of lockfile implementation here, as it slows down the library as a whole
import fs from "fs";
import path from "path";
import { type ParsedLock, type PnpmLockFile, type NpmLockFile, type BerryLockFile } from "./types.js";
import { searchUp } from "../paths.js";
import { parsePnpmLock } from "./parsePnpmLock.js";
import { parseNpmLock } from "./parseNpmLock.js";
import { readYaml, readYamlDocuments } from "./readYaml.js";
import { parseBerryLock } from "./parseBerryLock.js";

const memoization: { [path: string]: ParsedLock } = {};

// eslint-disable-next-line @typescript-eslint/require-await -- was async due to async imports, and will be again in future
export async function parseLockFile(packageRoot: string): Promise<ParsedLock> {
  const yarnLockPath = searchUp(["yarn.lock", "common/config/rush/yarn.lock"], packageRoot);

  // First, test out whether this works for yarn
  if (yarnLockPath) {
    if (memoization[yarnLockPath]) {
      return memoization[yarnLockPath];
    }

    const yarnLock = fs.readFileSync(yarnLockPath, "utf-8");

    const isBerry =
      yarnLock.includes("__metadata") || fs.existsSync(path.resolve(yarnLock.replace("yarn.lock", ".yarnrc.yml")));

    let parsed: {
      type: "success" | "merge" | "conflict";
      object: any;
    } = {
      type: "success",
      object: {},
    };

    if (isBerry) {
      const yaml = readYaml<BerryLockFile>(yarnLockPath);
      parsed = parseBerryLock(yaml);
    } else {
      // TODO: this should be an async import in the future (currently causes issues with jest setup)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const parseYarnLock = require("@yarnpkg/lockfile").parse;
      parsed = parseYarnLock(yarnLock);
    }

    memoization[yarnLockPath] = parsed;

    return parsed;
  }

  // Second, test out whether this works for pnpm
  const pnpmLockPath = searchUp(["pnpm-lock.yaml", "common/config/rush/pnpm-lock.yaml"], packageRoot);

  if (pnpmLockPath) {
    if (memoization[pnpmLockPath]) {
      return memoization[pnpmLockPath];
    }

    // pnpm v11+ can write `pnpm-lock.yaml` as two `---`-separated YAML documents when
    // `configDependencies` and/or `packageManagerDependencies` are recorded: an "env" document
    // (holding only those fields) followed by the regular lockfile document (see
    // https://github.com/pnpm/pnpm/pull/10964). This only happens for lockfileVersion 9.0+ (the
    // pnpm 6/9 codepath in `parsePnpmLock`) — legacy (< 6.0) lockfiles are always a single
    // document, so `documents[documents.length - 1]` is a no-op for them. Using only the last
    // document means the env document's `configDependencies`/`packageManagerDependencies` entries
    // are intentionally discarded and never leak into the parsed dependency graph.
    const documents = readYamlDocuments<PnpmLockFile>(pnpmLockPath);
    const yaml = documents[documents.length - 1];
    const parsed = parsePnpmLock(yaml);
    memoization[pnpmLockPath] = parsed;

    return memoization[pnpmLockPath];
  }

  // Third, try for npm workspaces
  const npmLockPath = searchUp("package-lock.json", packageRoot);

  if (npmLockPath) {
    if (memoization[npmLockPath]) {
      return memoization[npmLockPath];
    }

    let npmLockJson;
    try {
      npmLockJson = fs.readFileSync(npmLockPath, "utf-8");
    } catch {
      throw new Error("Couldn't read package-lock.json");
    }

    const npmLock: NpmLockFile = JSON.parse(npmLockJson.toString());

    if (!npmLock?.lockfileVersion || npmLock.lockfileVersion < 2) {
      throw new Error(
        `Your package-lock.json version is not supported: lockfileVersion is ${npmLock.lockfileVersion}. You need npm version 7 or above and package-lock version 2 or above. Please, upgrade npm or choose a different package manager.`
      );
    }

    memoization[npmLockPath] = parseNpmLock(npmLock);
    return memoization[npmLockPath];
  }

  throw new Error(
    "You do not have yarn.lock, pnpm-lock.yaml or package-lock.json. Please use one of these package managers."
  );
}
