// import { getRepoInfo, Hasher as LageHasher, type RepoInfo } from "@lage-run/hasher";
// import { salt } from "./salt.js";
// import type { Target } from "@lage-run/target-graph";
// import { hash } from "glob-hasher";
// import fg from "fast-glob";
// import { hashStrings } from "./hashStrings.js";

// export interface TargetHasherOptions {
//   root: string;
//   environmentGlob: string[];
//   cacheKey?: string;
//   cliArgs?: string[];
// }

// /**
//  * TargetHasher is a class that can be used to generate a hash of a target.
//  *
//  * Currently, it encapsulates the use of `backfill-hasher` to generate a hash.
//  */
// export class TargetHasher {
//   private repoInfo?: RepoInfo;

//   constructor(private options: TargetHasherOptions) {}

//   async hash(target: Target): Promise<string> {
//     const { root } = this.options;

//     const hashKey = await salt(
//       target.environmentGlob ?? this.options.environmentGlob ?? ["lage.config.js"],
//       `${target.id}|${JSON.stringify(this.options.cliArgs)}`,
//       this.options.root,
//       this.options.cacheKey || ""
//     );

//     if (target.cwd === root && target.cache) {
//       if (!target.inputs) {
//         throw new Error("Root-level targets must have `inputs` defined if it has cache enabled.");
//       }

//       const files = await fg(target.inputs, { cwd: root });
//       const fileFashes = hash(files, { cwd: root }) ?? {};

//       const hashes = Object.values(fileFashes);
//       hashes.push(hashKey);

//       return hashStrings(hashes);
//     }

//     if (!this.repoInfo) {
//       this.repoInfo = await getRepoInfo(root);
//     }

//     const hasher = new LageHasher(target.cwd, this.repoInfo);
//     const hashString = hasher.createPackageHash(hashKey);

//     return hashString;
//   }
// }

export { TargetHasher } from "@lage-run/hasher";
