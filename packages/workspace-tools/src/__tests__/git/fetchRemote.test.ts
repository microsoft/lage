import { afterAll, describe, expect, it } from "@jest/globals";
import { cleanupFixtures, setupFixture, setupLocalRemote } from "../setupFixture.js";
import fs from "fs";
import path from "path";
import { git as _git, type GitOptions } from "../../git/git.js";
import { fetchRemote } from "../../git/gitUtilities.js";

/** Call git helper but throw on error by default */
const git = (args: string[], opts: GitOptions) => _git(args, { throwOnError: true, ...opts });

describe("fetchRemote", () => {
  afterAll(() => {
    cleanupFixtures();
  });

  it("fetches from a specific remote", () => {
    const remoteName = "foo";
    const branchName = "feature";
    const filename = "file.txt";
    const cwd = setupFixture(undefined, { git: true });

    // Create a remote repo
    const remoteCwd = setupLocalRemote({ cwd, remoteName });
    // Create a file in a branch and commit
    git(["checkout", "-b", branchName], { cwd: remoteCwd });
    fs.writeFileSync(path.join(remoteCwd, filename), "content");
    git(["add", filename], { cwd: remoteCwd });
    git(["commit", "-m", "file"], { cwd: remoteCwd });

    // Fetch the remote and verify the new branch and file are available locally
    fetchRemote({ remote: remoteName, cwd });
    git(["checkout", branchName], { cwd });
    expect(fs.existsSync(path.join(cwd, filename))).toBe(true);
  });

  it("fetches from a specific branch from the remote", () => {
    const branch1 = "feature1";
    const branch2 = "feature2";
    const filename = "file.txt";
    const cwd = setupFixture(undefined, { git: true });

    // Create a remote repo with a branch
    const remoteCwd = setupLocalRemote({ cwd, remoteName: "origin" });
    git(["checkout", "-b", branch1], { cwd: remoteCwd });
    fs.writeFileSync(path.join(remoteCwd, filename), "content");
    git(["add", filename], { cwd: remoteCwd });
    git(["commit", "-m", "file"], { cwd: remoteCwd });
    // Make a second branch (at the same point for simplicity)
    git(["checkout", "-b", branch2], { cwd: remoteCwd });

    // Fetch feature2 branch
    fetchRemote({ remote: "origin", remoteBranch: branch2, cwd });
    git(["checkout", branch2], { cwd });
    expect(fs.existsSync(path.join(cwd, filename))).toBe(true);

    // feature1 branch should not be present
    // (the message is localized but should include the branch name)
    expect(() => git(["checkout", branch1], { cwd })).toThrow(branch1);

    // Throws if the specified branch doesn't exist
    // (this should ideally be a separate test, but the setup is expensive)
    expect(() => fetchRemote({ remote: "origin", remoteBranch: "nope", cwd })).toThrow(
      'Fetching branch "nope" from remote "origin" failed'
    );
  });

  it("throws error when remoteBranch is specified without remote", () => {
    const cwd = setupFixture(undefined, { git: true });

    expect(() => fetchRemote({ remoteBranch: "main", cwd })).toThrow(
      'Must provide "remote" when using "remoteBranch" option'
    );
  });

  it("throws error if remote doesn't exist", () => {
    const cwd = setupFixture(undefined, { git: true });
    expect(() => fetchRemote({ remote: "nope", cwd })).toThrow('Fetching remote "nope" failed');
  });
});
