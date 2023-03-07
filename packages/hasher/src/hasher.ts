import { hashGlobGit } from "glob-hasher";
import crypto from "crypto";
import { resolveInternalDependencies } from "./resolveInternalDependencies";
import { resolveExternalDependencies } from "./resolveExternalDependencies";

function hashStrings(strings: string | string[]): string {
  const hasher = crypto.createHash("sha1");
  const anArray = typeof strings === "string" ? [strings] : strings;
  const elements = [...anArray];
  elements.sort((a, b) => a.localeCompare(b));
  elements.forEach((element) => hasher.update(element));

  return hasher.digest("hex");
}

function sortObject<T>(unordered: Record<string, T>): Record<string, T> {
  return Object.keys(unordered)
    .sort((a, b) => a.localeCompare(b))
    .reduce((obj, key) => {
      obj[key] = unordered[key];
      return obj;
    }, {});
}

interface HashOptions {
  cwd: string;
  inputs: string[];
  gitignore: boolean;
  environmentGlobs?: string[];
  salt: string;
}

export class Hasher {
  constructor(private root: string) {}

  public async hashPackage(options: HashOptions): Promise<string> {
    const { workspaceInfo, parsedLock } = repoInfo;
    const { name, dependencies, devDependencies } = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf-8"));

    const allDependencies = {
      ...dependencies,
      ...devDependencies,
    };

    const internalDependencies = resolveInternalDependencies(allDependencies, workspaceInfo);
    const externalDeoendencies = resolveExternalDependencies(allDependencies, workspaceInfo, parsedLock);

    const resolvedDependencies = [...internalDependencies, ...externalDeoendencies];

    const filesHash = await generateHashOfFiles(packageRoot, repoInfo);
    const dependenciesHash = hashStrings(resolvedDependencies);
  }

  public async hashFiles(cwd: string, files: string[], options: HashOptions): Promise<string> {
    const hashes = hashGlobGit(files, { cwd, gitignore: options ? options.gitignore : true }) ?? {};

    const sortedHashMap = sortObject(hashes);
    const sortedHashes = Object.values(sortedHashMap);

    this.#addSalt(sortedHashes, options);

    return hashStrings(sortedHashes);
  }

  #addSalt(hashes: string[], options: HashOptions): string[] {
    if (options.environmentGlobs) {
      const envHashes = hashGlobGit(options.environmentGlobs, { cwd: this.root, gitignore: false });

      if (envHashes) {
        const sortedEnvHashMap = sortObject(envHashes);
        const sortedEnvHashes = Object.values(sortedEnvHashMap);
        for (const hash of sortedEnvHashes) {
          hashes.push(hash);
        }
      }
    }

    hashes.push(options.salt);

    return hashes;
  }
}
