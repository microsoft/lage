import execa from "execa";
import { ensureGitMinimumVersion } from "./ensureGitMinimumVersion";
import { normalizeGitFileName } from "./normalizeGitFileName";

/**
 * Executes "git ls-tree" in a folder, results in a map of file name to git hashes
 */
export async function gitIndexHashes(path: string, gitPath?: string): Promise<Map<string, string>> {
  const result = await execa(gitPath || "git", ["ls-tree", `--format=%(objectname)%x00%(path)`, "-z", "HEAD", "-r"], {
    cwd: path,
  });

  if (result.exitCode !== 0) {
    ensureGitMinimumVersion(gitPath);

    throw new Error(`git ls-tree exited with status ${result.exitCode}: ${result.stderr}`);
  }

  const output = result.stdout;
  const changes: Map<string, string> = new Map<string, string>();

  if (output) {
    const pair: string[] = [];
    let toggle = 0;
    output.split("\0").forEach((line) => {
      if (toggle === 0) {
        pair[0] = line;
        toggle = 1;
      } else {
        pair[1] = line;
        toggle = 0;
        changes.set(normalizeGitFileName(pair[1]), pair[0]);
      }
    });
  }

  return changes;
}
