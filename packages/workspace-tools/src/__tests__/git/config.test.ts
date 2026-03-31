import { afterAll, describe, expect, it } from "@jest/globals";
import { cleanupFixtures, setupFixture } from "../setupFixture.js";
import { getUserEmail, getDefaultBranch } from "../../git/gitUtilities.js";
import { git as _git, type GitOptions } from "../../git/git.js";
import { getConfigValue } from "../../git/config.js";

/** Call git helper but throw on error by default */
const git = (args: string[], opts: GitOptions) => _git(args, { throwOnError: true, ...opts });

afterAll(() => {
  cleanupFixtures();
});

describe("getConfigValue", () => {
  it("returns config value when set", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Set a config value
    git(["config", "test.key", "test-value"], { cwd });

    const result = getConfigValue({ key: "test.key", cwd });
    expect(result).toBe("test-value");
  });

  it("returns null when config value is not set", () => {
    const cwd = setupFixture(undefined, { git: true });
    const result = getConfigValue({ key: "nonexistent.key", cwd });
    expect(result).toBeNull();
  });

  it("returns null when not a git repository", () => {
    const cwd = setupFixture();
    const result = getConfigValue({ key: "any.key", cwd });
    expect(result).toBeNull();
  });

  // could be changed if needed
  it("has no special handling of boolean config values", () => {
    const cwd = setupFixture(undefined, { git: true });

    git(["config", "bool.true", "true"], { cwd });
    git(["config", "bool.false", "false"], { cwd });

    const trueResult = getConfigValue({ key: "bool.true", cwd });
    const falseResult = getConfigValue({ key: "bool.false", cwd });

    expect(trueResult).toBe("true");
    expect(falseResult).toBe("false");
  });

  it("returns config value with special characters", () => {
    const cwd = setupFixture(undefined, { git: true });

    git(["config", "special.chars", "value-with_dots.and-dashes"], { cwd });

    const result = getConfigValue({ key: "special.chars", cwd });

    expect(result).toBe("value-with_dots.and-dashes");
  });
});

describe("getUserEmail", () => {
  it("returns user email when configured", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Set user email
    git(["config", "user.email", "test@example.com"], { cwd });

    const result = getUserEmail({ cwd });
    expect(result).toBe("test@example.com");
  });

  // Unfortunately we can't reliably test the case where the email is not configured without
  // mocking git, since it will usually be configured globally.

  it("returns null on any issues", () => {
    const result = getUserEmail({ cwd: "fake" });
    expect(result).toBeNull();
  });
});

describe("getDefaultBranch", () => {
  afterAll(() => {
    cleanupFixtures();
  });

  it("is main in the default test repo", () => {
    const cwd = setupFixture(undefined, { git: true });
    const branch = getDefaultBranch({ cwd });
    expect(branch).toBe("main");
  });

  it("is myMain when default branch is different", () => {
    const cwd = setupFixture(undefined, { git: true });
    git(["config", "init.defaultBranch", "myMain"], { cwd });

    const branch = getDefaultBranch({ cwd });
    expect(branch).toBe("myMain");
  });

  // Unfortunately it's not possible to reliably test the fallback case without mocking git,
  // since the setting will be present on most systems.
});
