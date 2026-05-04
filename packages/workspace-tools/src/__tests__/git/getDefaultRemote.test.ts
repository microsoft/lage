import { afterAll, afterEach, beforeAll, describe, expect, it, jest } from "@jest/globals";
import fs from "fs";
import path from "path";
import { cleanupFixtures, setupFixture, setupPackageJson } from "../setupFixture.js";
import { addGitObserver, clearGitObservers, gitFailFast, type GitObserver } from "../../git/git.js";
import { _matchRepositoryUrlToRemote, getDefaultRemote } from "../../git/getDefaultRemote.js";

/** some sample remote URLs */
const remoteUrls = {
  microsoft: "https://github.com/microsoft/lage.git",
  microsoftNoGit: "https://github.com/microsoft/lage",
  microsoftSsh: "git@github.com:microsoft/lage.git",
  microsoftShorthand: "github:microsoft/lage",
  kenotron: "https://github.com/kenotron/lage.git",
  kenotronSsh: "git@github.com:kenotron/lage.git",
  ecraig12345: "https://github.com/ecraig12345/lage.git",
  // VSO/ADO URLs all referring to org=foo, project=bar, repo=some-repo
  vsoHttps: "https://foo.visualstudio.com/bar/_git/some-repo",
  vsoHttpsDefaultCollection: "https://foo.visualstudio.com/DefaultCollection/bar/_git/some-repo",
  vsoHttpsOptimized: "https://foo.visualstudio.com/DefaultCollection/bar/_git/_optimized/some-repo",
  vsoHttpsUserToken: "https://user:fakePAT@foo.visualstudio.com/bar/_git/some-repo",
  vsoSsh: "foo@vs-ssh.visualstudio.com:v3/foo/bar/some-repo",
  adoHttps: "https://dev.azure.com/foo/bar/_git/some-repo",
  adoHttpsOptimized: "https://dev.azure.com/foo/bar/_git/_optimized/some-repo",
  adoHttpsUser: "https://foo@dev.azure.com/foo/bar/_git/some-repo",
  adoSsh: "git@ssh.dev.azure.com:v3/foo/bar/some-repo",
  // Non-matching remotes (different org)
  vsoOtherOrg: "https://baz.visualstudio.com/bar/_git/some-repo",
  adoOtherOrg: "https://dev.azure.com/baz/bar/_git/some-repo",
} as const;

describe("_matchRepositoryUrlToRemote", () => {
  // These simulate the logOrThrow callback with strict: true vs false/unset.
  const permissiveLog = jest.fn();
  const strictLog = (msg: string) => {
    throw new Error(msg);
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns undefined if no remotes (permissive)", () => {
    const result = _matchRepositoryUrlToRemote(remoteUrls.microsoft, {}, permissiveLog);
    expect(result).toBeUndefined();
    expect(permissiveLog).toHaveBeenCalledWith('Could not find remote pointing to repository "microsoft/lage"');
  });

  it("throws if no remotes (strict)", () => {
    expect(() => _matchRepositoryUrlToRemote(remoteUrls.microsoft, {}, strictLog)).toThrow(
      'Could not find remote pointing to repository "microsoft/lage"'
    );
  });

  it("finds remote matching repository URL", () => {
    const result = _matchRepositoryUrlToRemote(
      remoteUrls.microsoft,
      { first: remoteUrls.kenotron, second: remoteUrls.microsoft },
      strictLog
    );
    expect(result).toBe("second");
  });

  it("works with repository URL missing .git suffix", () => {
    const result = _matchRepositoryUrlToRemote(
      remoteUrls.microsoftNoGit,
      { first: remoteUrls.kenotron, second: remoteUrls.microsoft },
      strictLog
    );
    expect(result).toBe("second");
  });

  it("works with SSH remote format", () => {
    const result = _matchRepositoryUrlToRemote(
      remoteUrls.microsoft,
      { first: remoteUrls.kenotronSsh, second: remoteUrls.microsoftSsh },
      strictLog
    );
    expect(result).toBe("second");
  });

  it("works with shorthand repository format", () => {
    const result = _matchRepositoryUrlToRemote(
      remoteUrls.microsoftShorthand,
      { first: remoteUrls.kenotron, second: remoteUrls.microsoft },
      strictLog
    );
    expect(result).toBe("second");
  });

  it.each([
    ["VSO HTTPS", remoteUrls.vsoHttps],
    ["VSO HTTPS DefaultCollection", remoteUrls.vsoHttpsDefaultCollection],
    ["VSO HTTPS _optimized", remoteUrls.vsoHttpsOptimized],
    ["VSO SSH", remoteUrls.vsoSsh],
    ["ADO HTTPS", remoteUrls.adoHttps],
    ["ADO HTTPS _optimized", remoteUrls.adoHttpsOptimized],
    ["ADO HTTPS user", remoteUrls.adoHttpsUser],
    ["ADO SSH", remoteUrls.adoSsh],
  ])("works with VSO HTTPS repository and %s remote", (_label, remoteUrl) => {
    const result = _matchRepositoryUrlToRemote(
      remoteUrls.vsoHttps,
      // The multi-remote scenario is less common with VSO/ADO, but cover it just in case
      { first: remoteUrls.vsoOtherOrg, second: remoteUrl },
      strictLog
    );
    expect(result).toBe("second");
  });

  it.each([
    ["ADO HTTPS", remoteUrls.adoHttps],
    ["ADO HTTPS _optimized", remoteUrls.adoHttpsOptimized],
    ["ADO HTTPS user", remoteUrls.adoHttpsUser],
    ["ADO SSH", remoteUrls.adoSsh],
    ["VSO HTTPS", remoteUrls.vsoHttps],
    ["VSO HTTPS DefaultCollection", remoteUrls.vsoHttpsDefaultCollection],
    ["VSO HTTPS _optimized", remoteUrls.vsoHttpsOptimized],
    ["VSO HTTPS user and token", remoteUrls.vsoHttpsUserToken],
    ["VSO SSH", remoteUrls.vsoSsh],
  ])("works with ADO HTTPS repository and %s remote", (_label, remoteUrl) => {
    const result = _matchRepositoryUrlToRemote(
      remoteUrls.adoHttps,
      { first: remoteUrls.adoOtherOrg, second: remoteUrl },
      strictLog
    );
    expect(result).toBe("second");
  });
});

describe("getDefaultRemote", () => {
  let cwd: string;
  /** cwd for an empty git repo that should not be modified */
  let emptyRepoCwd: string;
  let consoleMock: jest.SpiedFunction<typeof console.log>;
  const gitObserver = jest.fn<GitObserver>();

  // git commands issued by getDefaultRemote
  const gitGetRemotesConfig = "config --local --get-regexp remote\\..*\\.url";
  const gitGetRoot = "rev-parse --show-toplevel";

  const logMissingRepositoryKey = (dir: string) =>
    expect.stringContaining(`Valid "repository" key not found in package.json at ${path.join(dir, "package.json")}`);
  const logMissingRemotes = (dir: string) => `No remotes defined in git repo at ${dir}`;

  function gitRemote(...args: string[]) {
    gitFailFast(["remote", ...args], { cwd, noExitCode: true });
  }

  function getLogs() {
    return consoleMock.mock.calls.map((call) => call.join(" "));
  }

  function getGitCalls() {
    return gitObserver.mock.calls.map(([args]) => args.join(" "));
  }

  beforeAll(() => {
    consoleMock = jest.spyOn(console, "log").mockImplementation(() => undefined);
    addGitObserver(gitObserver);
    emptyRepoCwd = setupFixture(undefined, { git: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
    cleanupFixtures();
    clearGitObservers();
  });

  it("throws if not in a git repo (permissive)", () => {
    cwd = setupFixture();
    // sanity check: if this fails, there's a git repo in the OS temp dir
    expect(() => getDefaultRemote({ cwd })).toThrow(`Directory "${cwd}" is not in a git repository`);

    gitObserver.mockClear();
    expect(() => getDefaultRemote({ cwd })).toThrow(`Directory "${cwd}" is not in a git repository`);
    // getting remotes doesn't throw, but findGitRoot does
    expect(getGitCalls()).toEqual([gitGetRemotesConfig, gitGetRoot]);
  });

  it("throws if not in a git repo (strict)", () => {
    cwd = setupFixture();
    // sanity check: if this fails, there's a git repo in the OS temp dir
    expect(() => getDefaultRemote({ cwd, strict: true })).toThrow(`${cwd} is not in a git repository`);

    gitObserver.mockClear();
    expect(() => getDefaultRemote({ cwd, strict: true })).toThrow(`${cwd} is not in a git repository`);
    // getting remotes will throw in strict mode
    expect(getGitCalls()).toEqual([gitGetRemotesConfig]);
  });

  it("returns 'origin' if no remotes found (permissive)", () => {
    expect(getDefaultRemote({ cwd: emptyRepoCwd, verbose: true })).toBe("origin");

    expect(getLogs()).toEqual([logMissingRemotes(emptyRepoCwd), 'Assuming default remote "origin"']);
    // No remotes configured → config command runs but finds nothing.
    // findGitRoot called to verify it's a git repo.
    expect(getGitCalls()).toEqual([gitGetRemotesConfig, gitGetRoot]);
  });

  it("throws if no remotes found (strict)", () => {
    cwd = emptyRepoCwd;
    gitObserver.mockClear();

    expect(() => getDefaultRemote({ cwd, strict: true })).toThrow(logMissingRemotes(cwd));
    expect(getGitCalls()).toEqual([gitGetRemotesConfig]);
  });

  it("throws if no package.json (strict)", () => {
    cwd = setupFixture(undefined, { git: true });
    gitRemote("add", "origin", remoteUrls.microsoft);
    gitObserver.mockClear();

    expect(() => getDefaultRemote({ cwd, strict: true })).toThrow(`Could not find package.json under ${cwd}`);
    expect(getGitCalls()).toEqual([gitGetRemotesConfig, gitGetRoot]);

    // variant message for subfolder
    const subfolder = path.join(cwd, "subfolder");
    fs.mkdirSync(subfolder);
    expect(() => getDefaultRemote({ cwd: subfolder, strict: true })).toThrow(
      `Could not find package.json under ${subfolder} or git root ${cwd}`
    );
  });

  it("uses provided remotes instead of getting from repo", () => {
    // no git here to verify it's not used
    cwd = setupFixture();
    setupPackageJson(cwd, { repository: remoteUrls.microsoft });
    gitObserver.mockClear();

    const remotes = { origin: remoteUrls.ecraig12345, default: remoteUrls.microsoft, another: remoteUrls.kenotron };
    expect(getDefaultRemote({ cwd, remotes })).toBe("default");
    expect(getDefaultRemote({ cwd, remotes, strict: true })).toBe("default");
    expect(gitObserver).not.toHaveBeenCalled();
  });

  it("defaults to existing upstream remote without repository field", () => {
    cwd = setupFixture(undefined, { git: true });
    setupPackageJson(cwd);
    gitRemote("add", "first", remoteUrls.kenotron);
    gitRemote("add", "origin", remoteUrls.ecraig12345);
    gitRemote("add", "upstream", remoteUrls.microsoft);
    gitObserver.mockClear();

    // permissive/strict have same behavior
    expect(getDefaultRemote({ cwd, strict: true, verbose: true })).toBe("upstream");
    expect(getGitCalls()).toEqual([gitGetRemotesConfig, gitGetRoot]);
    expect(getLogs()).toEqual([logMissingRepositoryKey(cwd), 'Default to remote "upstream"']);
  });

  it("defaults to existing origin remote without repository field or upstream remote", () => {
    cwd = setupFixture(undefined, { git: true });
    setupPackageJson(cwd);
    gitRemote("add", "first", remoteUrls.kenotron);
    gitRemote("add", "origin", remoteUrls.microsoft);
    gitObserver.mockClear();

    // permissive/strict have same behavior
    expect(getDefaultRemote({ cwd, strict: true, verbose: true })).toBe("origin");
    expect(getGitCalls()).toEqual([gitGetRemotesConfig, gitGetRoot]);
    expect(getLogs()).toEqual([logMissingRepositoryKey(cwd), 'Default to remote "origin"']);
  });

  it("defaults to first remote without repository field, origin, or upstream", () => {
    cwd = setupFixture(undefined, { git: true });
    setupPackageJson(cwd);
    gitRemote("add", "first", remoteUrls.kenotron);
    gitRemote("add", "second", remoteUrls.microsoft);
    gitObserver.mockClear();

    // permissive/strict have same behavior
    expect(getDefaultRemote({ cwd, strict: true, verbose: true })).toBe("first");
    expect(getGitCalls()).toEqual([gitGetRemotesConfig, gitGetRoot]);
    expect(getLogs()).toEqual([logMissingRepositoryKey(cwd), 'Default to remote "first"']);
  });

  // package.json parsing is not covered by _matchRepositoryUrlToRemote
  it("finds remote matching repository string", () => {
    cwd = setupFixture(undefined, { git: true });
    setupPackageJson(cwd, { repository: remoteUrls.microsoft });
    gitRemote("add", "first", remoteUrls.kenotron);
    gitRemote("add", "second", remoteUrls.microsoft);
    gitObserver.mockClear();

    expect(getDefaultRemote({ cwd, strict: true })).toBe("second");
    expect(getGitCalls()).toEqual([gitGetRemotesConfig]);
  });

  it("finds remote matching repository object", () => {
    cwd = setupFixture(undefined, { git: true });
    setupPackageJson(cwd, { repository: { url: remoteUrls.microsoft, type: "git" } });
    gitRemote("add", "first", remoteUrls.kenotron);
    gitRemote("add", "second", remoteUrls.microsoft);
    gitObserver.mockClear();

    expect(getDefaultRemote({ cwd, strict: true })).toBe("second");
    expect(getGitCalls()).toEqual([gitGetRemotesConfig]);
  });

  it("returns first remote if none match repository (permissive)", () => {
    cwd = setupFixture(undefined, { git: true });
    setupPackageJson(cwd, { repository: { url: remoteUrls.ecraig12345, type: "git" } });
    gitRemote("add", "first", remoteUrls.kenotron);
    gitRemote("add", "second", remoteUrls.microsoft);
    gitObserver.mockClear();

    expect(getDefaultRemote({ cwd, verbose: true })).toBe("first");
    expect(getGitCalls()).toEqual([gitGetRemotesConfig]);
    expect(getLogs()).toEqual([
      'Could not find remote pointing to repository "ecraig12345/lage"',
      'Default to remote "first"',
    ]);
  });

  it("throws if no remotes match repository (strict)", () => {
    cwd = setupFixture(undefined, { git: true });
    setupPackageJson(cwd, { repository: { url: remoteUrls.ecraig12345, type: "git" } });
    gitRemote("add", "first", remoteUrls.kenotron);
    gitRemote("add", "second", remoteUrls.microsoft);
    gitObserver.mockClear();

    expect(() => getDefaultRemote({ cwd, strict: true })).toThrow("Could not find remote pointing to repository");
    expect(getGitCalls()).toEqual([gitGetRemotesConfig]);
  });

  it("respects repository field in non-git-root cwd package.json", () => {
    cwd = setupFixture(undefined, { git: true });
    const subfolder = path.join(cwd, "sub/folder");
    fs.mkdirSync(subfolder, { recursive: true });
    setupPackageJson(subfolder, { repository: remoteUrls.microsoft });
    gitRemote("add", "first", remoteUrls.kenotron);
    gitRemote("add", "second", remoteUrls.microsoft);
    gitObserver.mockClear();

    expect(getDefaultRemote({ cwd: subfolder, strict: true })).toBe("second");
    expect(getGitCalls()).toEqual([gitGetRemotesConfig]);
  });
});
