import { createTempDir, removeTempDir } from "@lage-run/test-utilities";
import path from "path";
import fs from "fs";
import { spawnSync, type SpawnSyncOptions } from "child_process";

/** Temp directories are created under tempRoot.name with incrementing numeric sub-directories */
let tempRoot: string | undefined;
let tempNumber = 0;

/** Full fixture folders under `__fixtures__` */
type RealFixtureName =
  | "basic-pnpm"
  | "basic-without-lock-file"
  | "basic-yarn-1"
  | "basic-yarn-berry"
  | "extra-yarn-1"
  | "extra-yarn-berry"
  | "monorepo-basic-npm"
  | "monorepo-basic-pnpm"
  | "monorepo-basic-yarn-1"
  | "monorepo-basic-yarn-berry"
  | "monorepo-nested"
  | "monorepo-npm-unsupported"
  | "monorepo-rush-pnpm"
  | "monorepo-rush-yarn";

/** Virtual fixtures that add a `lerna.json` to `monorepo-basic-*` */
type LernaFixtureName =
  | "monorepo-basic-lerna-npm"
  | "monorepo-basic-lerna-pnpm"
  | "monorepo-basic-lerna-yarn-1"
  | "monorepo-basic-lerna-yarn-berry";

export type TestFixtureName = RealFixtureName | LernaFixtureName;

export const fixturesRoot = path.resolve(__dirname, "../__fixtures__");

/**
 * Create a temp directory, optionally containing the fixture files from `fixtureName`,
 * and optionally initializing a git repository. (If using a git repo and there's no fixture,
 * it will have an empty initial commit.)
 *
 * Be sure to call `cleanupFixtures()` after all tests to clean up temp directories.
 */
export function setupFixture(
  fixtureName?: TestFixtureName,
  options?: {
    /** Whether to set up a git repo */
    git?: boolean;
  }
): string {
  const useGit = !!options?.git;

  let fixturePath: string | undefined;
  const realFixtureName = fixtureName?.replace("-lerna-", "-") as RealFixtureName | undefined;
  if (realFixtureName) {
    fixturePath = path.join(fixturesRoot, realFixtureName);
    if (!fs.existsSync(fixturePath)) {
      throw new Error(`Couldn't find fixture "${realFixtureName}" under "${fixturesRoot}"`);
    }
  }

  if (!tempRoot) {
    // Create a shared root temp directory for fixture files
    tempRoot = createTempDir({ prefix: "ws-tools-" });
  }

  // Make the directory
  const cwd = path.join(tempRoot, String(tempNumber++), fixturePath ? path.basename(fixturePath) : "");

  fs.mkdirSync(cwd, { recursive: true });

  if (useGit) {
    // git init if requested
    basicGit(["init"], { cwd });
    basicGit(["config", "user.name", "test user"], { cwd });
    basicGit(["config", "user.email", "test@test.email"], { cwd });
    // Ensure GPG signing doesn't interfere with tests
    basicGit(["config", "commit.gpgsign", "false"], { cwd });

    // Make the 'main' branch the default in the test repo
    // ensure that the configuration for this repo does not collide
    // with any global configuration the user had made, so we have
    // a 'fixed' value for our tests, regardless of user configuration
    basicGit(["symbolic-ref", "HEAD", "refs/heads/main"], { cwd });
    basicGit(["config", "init.defaultBranch", "main"], { cwd });
  }

  // Copy and commit the fixture if requested
  if (fixturePath) {
    fs.cpSync(fixturePath, cwd, {
      recursive: true,
      filter: (src) => !/[/\\](node_modules|temp|.rush)([/\\]|$)/.test(src),
    });

    const lernaManagerMatch = fixtureName?.match(/^monorepo-basic-lerna-(\w+)/);
    if (lernaManagerMatch) {
      // Make a lerna.json with the appropriate npmClient
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const lernaBase = require(path.join(fixturesRoot, "lerna.base.json"));
      fs.writeFileSync(path.join(cwd, "lerna.json"), JSON.stringify({ ...lernaBase, npmClient: lernaManagerMatch[1] }));
    }

    if (useGit) {
      basicGit(["add", "."], { cwd });
      basicGit(["commit", "-m", "test"], { cwd });
    }
  } else if (useGit) {
    // Otherwise make an initial empty commit
    basicGit(["commit", "--allow-empty", "-m", "initial"], { cwd });
  }

  return cwd;
}

/**
 * `tmp` is not always reliable about cleanup even with appropriate options, so it's recommended to
 * call this function in `afterAll`.
 */
export function cleanupFixtures(): void {
  tempRoot && removeTempDir(tempRoot);
  tempRoot = undefined;
}

export function setupPackageJson(cwd: string, packageJson: Record<string, any> = {}): void {
  const pkgJsonPath = path.join(cwd, "package.json");
  let oldPackageJson: Record<string, any> | undefined;
  if (fs.existsSync(pkgJsonPath)) {
    oldPackageJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
  }
  fs.writeFileSync(pkgJsonPath, JSON.stringify({ ...oldPackageJson, ...packageJson }, null, 2));
}

/**
 * Create a separate local git repo and configure it as a remote for `cwd`.
 * @returns The path to the remote repo directory.
 */
export function setupLocalRemote(params: { cwd: string; remoteName: string; fixtureName?: TestFixtureName }): string {
  const { cwd, remoteName, fixtureName } = params;

  // Create a separate repo and configure it as a remote
  const remoteCwd = setupFixture(fixtureName, { git: true });
  const remoteUrl = remoteCwd.replace(/\\/g, "/");
  basicGit(["remote", "add", remoteName, remoteUrl], { cwd });
  basicGit(["config", "pull.rebase", "false"], { cwd });
  basicGit(["pull", "-X", "ours", remoteName, "main", "--allow-unrelated-histories"], { cwd });

  // Configure url in package.json (make the same commit in local and remote so there's no diff;
  // note that we can't just commit locally and push since the remote isn't a bare repo)
  for (const dir of [cwd, remoteCwd]) {
    setupPackageJson(dir, { repository: { url: remoteUrl, type: "git" } });
    basicGit(["add", "package.json"], { cwd: dir });
    basicGit(["commit", "-m", "update repository url"], { cwd: dir });
  }

  // Ensure remote is available for comparison
  basicGit(["fetch", remoteName, "main"], { cwd });

  return remoteCwd;
}

/**
 * Very basic git wrapper that throws on error.
 * (Can't use the helper methods from `workspace-tools` to avoid a circular dependency.)
 */
function basicGit(args: string[], options: { cwd: string } & SpawnSyncOptions): void {
  const result = spawnSync("git", args, options);
  if (result.status !== 0) {
    const stdout = result.stdout?.toString().trim();
    const stderr = result.stderr?.toString().trim();
    throw new Error(
      [
        `Command failed with exit code ${result.status}: git ${args.join(" ")}`,
        stdout ? `STDOUT:\n${stdout}` : "",
        stderr ? `STDERR:\n${stderr}` : "",
      ]
        .filter(Boolean)
        .join("\n\n")
    );
  }
}
