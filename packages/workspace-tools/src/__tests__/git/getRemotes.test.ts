import { afterAll, describe, expect, it } from "@jest/globals";
import { cleanupFixtures, setupFixture } from "../setupFixture.js";
import { gitFailFast } from "../../git/git.js";
import { getRemotes } from "../../git/getRemotes.js";
import { findGitRoot } from "../../paths.js";

describe("getRemotes", () => {
  function gitRemote(cwd: string, ...args: string[]) {
    gitFailFast(["remote", ...args], { cwd, noExitCode: true });
  }

  afterAll(() => {
    cleanupFixtures();
  });

  it("returns empty object by default when not in a git repo", () => {
    const cwd = setupFixture();
    // sanity check: if this fails, there's a git repo in the OS temp dir
    expect(() => findGitRoot(cwd)).toThrow();

    expect(getRemotes({ cwd })).toEqual({});
  });

  it("throws when not in a git repo with throwOnError: true", () => {
    const cwd = setupFixture();
    // sanity check: if this fails, there's a git repo in the OS temp dir
    expect(() => findGitRoot(cwd)).toThrow();

    expect(() => getRemotes({ cwd, throwOnError: true })).toThrow(`${cwd} is not in a git repository`);
  });

  it("returns empty object by default when no remotes are configured", () => {
    const cwd = setupFixture(undefined, { git: true });
    expect(getRemotes({ cwd })).toEqual({});
  });

  it("throws when no remotes are configured with throwOnError: true", () => {
    const cwd = setupFixture(undefined, { git: true });
    expect(() => getRemotes({ cwd, throwOnError: true })).toThrow(`No remotes defined in git repo at ${cwd}`);
  });

  it("returns a single remote", () => {
    const cwd = setupFixture(undefined, { git: true });
    gitRemote(cwd, "add", "origin", "https://github.com/microsoft/lage.git");

    expect(getRemotes({ cwd })).toEqual({ origin: "https://github.com/microsoft/lage.git" });
  });

  it("returns multiple remotes with correct names and URLs", () => {
    const cwd = setupFixture(undefined, { git: true });
    gitRemote(cwd, "add", "origin", "https://github.com/myuser/lage.git");
    gitRemote(cwd, "add", "upstream", "https://github.com/microsoft/lage.git");
    gitRemote(cwd, "add", "fork", "git@github.com:otherfork/lage.git");

    expect(getRemotes({ cwd })).toEqual({
      origin: "https://github.com/myuser/lage.git",
      upstream: "https://github.com/microsoft/lage.git",
      fork: "git@github.com:otherfork/lage.git",
    });
  });

  it("handles remote names containing dots", () => {
    const cwd = setupFixture(undefined, { git: true });
    gitRemote(cwd, "add", "my.remote", "https://github.com/microsoft/lage.git");

    expect(getRemotes({ cwd })).toEqual({ "my.remote": "https://github.com/microsoft/lage.git" });
  });
});
