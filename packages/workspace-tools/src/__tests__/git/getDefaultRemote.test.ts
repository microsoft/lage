import { afterAll, afterEach, beforeAll, describe, expect, it, jest } from "@jest/globals";
import os from "os";
import { cleanupFixtures, setupFixture, setupPackageJson } from "../setupFixture.js";
import { gitFailFast } from "../../git/git.js";
import { getDefaultRemote } from "../../git/getDefaultRemote.js";

describe("getDefaultRemote", () => {
  let cwd: string;
  let consoleMock: jest.SpiedFunction<typeof console.log>;

  function gitRemote(...args: string[]) {
    gitFailFast(["remote", ...args], { cwd, noExitCode: true });
  }

  function expectConsole(n: number, message: string | RegExp) {
    expect(consoleMock.mock.calls.length).toBeGreaterThanOrEqual(n);
    expect(consoleMock.mock.calls[n - 1].join(" ")).toMatch(message);
  }

  beforeAll(() => {
    consoleMock = jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleMock.mockReset();
  });

  afterAll(() => {
    consoleMock.mockRestore();
    cleanupFixtures();
  });

  it("throws if not in a git repo", () => {
    // hopefully os.tmpdir() is never under a git repo...?
    expect(() => getDefaultRemote({ cwd: os.tmpdir() })).toThrow("is not in a git repository");
    expect(() => getDefaultRemote({ cwd: os.tmpdir(), strict: true })).toThrow("is not in a git repository");
  });

  it("handles no package.json at git root", () => {
    cwd = setupFixture(undefined, { git: true });
    expect(getDefaultRemote({ cwd, verbose: true })).toBe("origin");
    expectConsole(1, /Could not read .*package\.json/);

    expect(() => getDefaultRemote({ cwd, strict: true })).toThrow(/Could not read .*package\.json/);
  });

  it("handles no repository field or remotes", () => {
    cwd = setupFixture(undefined, { git: true });
    setupPackageJson(cwd);

    // permissive: defaults to origin
    expect(getDefaultRemote({ cwd, verbose: true })).toBe("origin");
    expectConsole(1, 'Valid "repository" key not found');
    expectConsole(2, "Could not find any remotes in git repo");
    expectConsole(3, 'Assuming default remote "origin".');

    // strict: throws
    expect(() => getDefaultRemote({ cwd, strict: true })).toThrow("Could not find any remotes");
  });

  it("defaults to upstream remote without repository field", () => {
    cwd = setupFixture(undefined, { git: true });
    setupPackageJson(cwd);

    gitRemote("add", "first", "https://github.com/kenotron/lage.git");
    gitRemote("add", "origin", "https://github.com/ecraig12345/lage.git");
    gitRemote("add", "upstream", "https://github.com/microsoft/lage.git");

    // permissive
    expect(getDefaultRemote({ cwd, verbose: true })).toBe("upstream");
    expectConsole(1, 'Valid "repository" key not found');
    expectConsole(2, 'Default to remote "upstream"');

    // strict
    expect(getDefaultRemote({ cwd, strict: true, verbose: true })).toBe("upstream");
    expectConsole(3, 'Valid "repository" key not found');
    expectConsole(4, 'Default to remote "upstream"');
  });

  it("defaults to origin remote without repository field or upstream remote", () => {
    cwd = setupFixture(undefined, { git: true });
    setupPackageJson(cwd);

    gitRemote("add", "first", "https://github.com/kenotron/lage.git");
    gitRemote("add", "origin", "https://github.com/microsoft/lage.git");

    // permissive
    expect(getDefaultRemote({ cwd, verbose: true })).toBe("origin");
    expectConsole(1, 'Valid "repository" key not found');
    expectConsole(2, 'Default to remote "origin"');

    // strict
    expect(getDefaultRemote({ cwd, strict: true, verbose: true })).toBe("origin");
    expectConsole(3, 'Valid "repository" key not found');
    expectConsole(4, 'Default to remote "origin"');
  });

  it("defaults to first remote without repository field, origin, or upstream", () => {
    cwd = setupFixture(undefined, { git: true });
    setupPackageJson(cwd);

    gitRemote("add", "first", "https://github.com/kenotron/lage.git");
    gitRemote("add", "second", "https://github.com/microsoft/lage.git");

    // permissive
    expect(getDefaultRemote({ cwd, verbose: true })).toBe("first");
    expectConsole(1, 'Valid "repository" key not found');
    expectConsole(2, 'Default to remote "first"');

    // strict
    expect(getDefaultRemote({ cwd, strict: true, verbose: true })).toBe("first");
    expectConsole(3, 'Valid "repository" key not found');
    expectConsole(4, 'Default to remote "first"');
  });

  it("finds remote matching repository string", () => {
    cwd = setupFixture(undefined, { git: true });
    setupPackageJson(cwd, { repository: "https://github.com/microsoft/lage.git" });
    gitRemote("add", "first", "https://github.com/kenotron/lage.git");
    gitRemote("add", "second", "https://github.com/microsoft/lage.git");

    expect(getDefaultRemote({ cwd })).toBe("second");
    expect(getDefaultRemote({ cwd, strict: true })).toBe("second");
  });

  it("finds remote matching repository object", () => {
    cwd = setupFixture(undefined, { git: true });
    setupPackageJson(cwd, { repository: { url: "https://github.com/microsoft/lage.git", type: "git" } });
    gitRemote("add", "first", "https://github.com/kenotron/lage.git");
    gitRemote("add", "second", "https://github.com/microsoft/lage.git");

    expect(getDefaultRemote({ cwd })).toBe("second");
    expect(getDefaultRemote({ cwd, strict: true })).toBe("second");
  });

  it("handles no remotes set and repository specified", () => {
    cwd = setupFixture(undefined, { git: true });
    setupPackageJson(cwd, { repository: { url: "https://github.com/baz/some-repo", type: "git" } });

    // permissive: default to origin
    expect(getDefaultRemote({ cwd, verbose: true })).toBe("origin");
    expectConsole(1, "Could not find remote pointing to");
    expectConsole(2, "Could not find any remotes in git repo");
    expectConsole(3, 'Assuming default remote "origin".');

    // strict: throws
    expect(() => getDefaultRemote({ cwd, strict: true })).toThrow("Could not find remote pointing to repository");
  });

  it("handles remotes set but none matching repository", () => {
    cwd = setupFixture(undefined, { git: true });
    setupPackageJson(cwd, { repository: { url: "https://github.com/ecraig12345/some-repo", type: "git" } });
    gitRemote("add", "first", "https://github.com/kenotron/lage.git");
    gitRemote("add", "second", "https://github.com/microsoft/lage.git");

    // permissive: defaults to first remote
    expect(getDefaultRemote({ cwd, verbose: true })).toBe("first");
    expectConsole(1, "Could not find remote pointing to repository");

    // strict: throws
    expect(() => getDefaultRemote({ cwd, strict: true })).toThrow("Could not find remote pointing to repository");
  });

  it("works with SSH remote format", () => {
    cwd = setupFixture(undefined, { git: true });
    setupPackageJson(cwd, { repository: { url: "https://github.com/microsoft/lage", type: "git" } });
    gitRemote("add", "first", "git@github.com:kenotron/lage.git");
    gitRemote("add", "second", "git@github.com:microsoft/lage.git");
    expect(getDefaultRemote({ cwd })).toBe("second");
    expect(getDefaultRemote({ cwd, strict: true })).toBe("second");
  });

  it("works with shorthand repository format", () => {
    cwd = setupFixture(undefined, { git: true });
    setupPackageJson(cwd, { repository: { url: "github:microsoft/lage", type: "git" } });

    // HTTPS
    gitRemote("add", "first", "https://github.com/kenotron/lage.git");
    gitRemote("add", "second", "https://github.com/microsoft/lage.git");
    expect(getDefaultRemote({ cwd })).toBe("second");
    expect(getDefaultRemote({ cwd, strict: true })).toBe("second");

    // SSH
    gitRemote("set-url", "second", "git@github.com:microsoft/lage.git");
    expect(getDefaultRemote({ cwd })).toBe("second");
    expect(getDefaultRemote({ cwd, strict: true })).toBe("second");
  });

  it("works with VSO repository and mismatched remote format", () => {
    cwd = setupFixture(undefined, { git: true });
    setupPackageJson(cwd, { repository: { url: "https://foo.visualstudio.com/bar/_git/some-repo", type: "git" } });
    // The multi-remote scenario is less common with VSO/ADO, but cover it just in case
    gitRemote("add", "first", "https://baz.visualstudio.com/bar/_git/some-repo");

    // VSO HTTPS
    gitRemote("add", "second", "https://foo.visualstudio.com/bar/_git/some-repo");
    expect(getDefaultRemote({ cwd })).toBe("second");
    expect(getDefaultRemote({ cwd, strict: true })).toBe("second");

    // VSO HTTPS with DefaultCollection
    gitRemote("set-url", "second", "https://foo.visualstudio.com/DefaultCollection/bar/_git/some-repo");
    expect(getDefaultRemote({ cwd })).toBe("second");
    expect(getDefaultRemote({ cwd, strict: true })).toBe("second");

    // VSO HTTPS with _optimized
    gitRemote("set-url", "second", "https://foo.visualstudio.com/DefaultCollection/bar/_git/_optimized/some-repo");
    expect(getDefaultRemote({ cwd })).toBe("second");
    expect(getDefaultRemote({ cwd, strict: true })).toBe("second");

    // VSO SSH
    gitRemote("set-url", "second", "foo@vs-ssh.visualstudio.com:v3/foo/bar/some-repo");
    expect(getDefaultRemote({ cwd })).toBe("second");
    expect(getDefaultRemote({ cwd, strict: true })).toBe("second");

    // ADO HTTPS
    gitRemote("set-url", "second", "https://dev.azure.com/foo/bar/_git/some-repo");
    expect(getDefaultRemote({ cwd })).toBe("second");
    expect(getDefaultRemote({ cwd, strict: true })).toBe("second");

    // ADO HTTPS with _optimized
    gitRemote("set-url", "second", "https://dev.azure.com/foo/bar/_git/_optimized/some-repo");
    expect(getDefaultRemote({ cwd })).toBe("second");
    expect(getDefaultRemote({ cwd, strict: true })).toBe("second");

    // ADO HTTPS with user
    gitRemote("set-url", "second", "https://foo@dev.azure.com/foo/bar/_git/some-repo");
    expect(getDefaultRemote({ cwd })).toBe("second");
    expect(getDefaultRemote({ cwd, strict: true })).toBe("second");

    // ADO SSH
    gitRemote("set-url", "second", "git@ssh.dev.azure.com:v3/foo/bar/some-repo");
    expect(getDefaultRemote({ cwd })).toBe("second");
    expect(getDefaultRemote({ cwd, strict: true })).toBe("second");
  });

  it("works with ADO repository and mismatched remote format", () => {
    cwd = setupFixture(undefined, { git: true });
    setupPackageJson(cwd, { repository: { url: "https://dev.azure.com/foo/bar/_git/some-repo", type: "git" } });
    // The multi-remote scenario is less common with VSO/ADO, but cover it just in case
    gitRemote("add", "first", "https://dev.azure.com/baz/bar/_git/some-repo");

    // ADO HTTPS
    gitRemote("add", "second", "https://dev.azure.com/foo/bar/_git/some-repo");
    expect(getDefaultRemote({ cwd })).toBe("second");
    expect(getDefaultRemote({ cwd, strict: true })).toBe("second");

    // ADO HTTPS with _optimized
    gitRemote("set-url", "second", "https://dev.azure.com/foo/bar/_git/_optimized/some-repo");
    expect(getDefaultRemote({ cwd })).toBe("second");
    expect(getDefaultRemote({ cwd, strict: true })).toBe("second");

    // ADO HTTPS with user
    gitRemote("set-url", "second", "https://foo@dev.azure.com/foo/bar/_git/some-repo");
    expect(getDefaultRemote({ cwd })).toBe("second");
    expect(getDefaultRemote({ cwd, strict: true })).toBe("second");

    // ADO SSH
    gitRemote("set-url", "second", "git@ssh.dev.azure.com:v3/foo/bar/some-repo");
    expect(getDefaultRemote({ cwd })).toBe("second");
    expect(getDefaultRemote({ cwd, strict: true })).toBe("second");

    // VSO HTTPS
    gitRemote("set-url", "second", "https://foo.visualstudio.com/bar/_git/some-repo");
    expect(getDefaultRemote({ cwd })).toBe("second");
    expect(getDefaultRemote({ cwd, strict: true })).toBe("second");

    // VSO HTTPS with DefaultCollection
    gitRemote("set-url", "second", "https://foo.visualstudio.com/DefaultCollection/bar/_git/some-repo");
    expect(getDefaultRemote({ cwd })).toBe("second");
    expect(getDefaultRemote({ cwd, strict: true })).toBe("second");

    // VSO HTTPS with _optimized
    gitRemote("set-url", "second", "https://foo.visualstudio.com/DefaultCollection/bar/_git/_optimized/some-repo");
    expect(getDefaultRemote({ cwd })).toBe("second");
    expect(getDefaultRemote({ cwd, strict: true })).toBe("second");

    // VSO HTTPS with user and token
    gitRemote("set-url", "second", "https://user:fakePAT@foo.visualstudio.com/bar/_git/some-repo");
    expect(getDefaultRemote({ cwd })).toBe("second");
    expect(getDefaultRemote({ cwd, strict: true })).toBe("second");

    // VSO SSH
    gitRemote("set-url", "second", "foo@vs-ssh.visualstudio.com:v3/foo/bar/some-repo");
    expect(getDefaultRemote({ cwd })).toBe("second");
    expect(getDefaultRemote({ cwd, strict: true })).toBe("second");
  });
});
