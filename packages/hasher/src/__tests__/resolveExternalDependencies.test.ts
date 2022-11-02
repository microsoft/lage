import { getPnpmWorkspaces, getRushWorkspaces, getYarnWorkspaces, parseLockFile } from "workspace-tools";

import { filterExternalDependencies, resolveExternalDependencies, addToQueue } from "../resolveExternalDependencies";
import { filterDependenciesInYarnFixture } from "./resolveDependenciesHelper";
import path from "path";
import { Monorepo } from "@lage-run/monorepo-fixture";
const fixturesPath = path.join(__dirname, "..", "__fixtures__");

describe("filterExternalDependencies()", () => {
  it("only lists external dependencies", async () => {
    const results = await filterDependenciesInYarnFixture("monorepo", filterExternalDependencies);
    expect(results).toEqual({ foo: "1.0.0" });
  });

  it("identifies all dependencies as external packages if there are no workspaces", async () => {
    const results = await filterDependenciesInYarnFixture("basic", filterExternalDependencies);
    expect(results).toEqual({ foo: "1.0.0", "package-a": "1.0.0" });
  });
});

describe("addToQueue()", () => {
  it("adds external dependencies to queue", () => {
    const externalDependencies = { foo: "1.0.0" };
    const done: string[] = [];
    const queue: [string, string][] = [];

    addToQueue(externalDependencies, done, queue);

    const expectedQueue = [["foo", "1.0.0"]];
    expect(queue).toEqual(expectedQueue);
  });

  it("doesn't add to the queue if the dependency has been visited", () => {
    const externalDependencies = { foo: "1.0.0" };
    const done: string[] = ["foo@1.0.0"];
    const queue: [string, string][] = [];

    addToQueue(externalDependencies, done, queue);

    expect(queue).toEqual([]);
  });

  it("doesn't add to queue if the dependency is already in the queue", () => {
    const externalDependencies = { foo: "1.0.0" };
    const done: string[] = [];
    const queue: [string, string][] = [["foo", "1.0.0"]];

    addToQueue(externalDependencies, done, queue);

    const expectedQueue = [["foo", "1.0.0"]];
    expect(queue).toEqual(expectedQueue);
  });
});

describe("resolveExternalDependencies() - yarn", () => {
  it("given a list of external dependencies and a parsed Lock file, add all dependencies, transitively", async () => {
    const monorepo = new Monorepo("monorepo");
    await monorepo.init(path.join(fixturesPath, "monorepo"));
    const packageRoot = monorepo.root;

    const workspaces = getYarnWorkspaces(packageRoot);

    const allDependencies = { "package-a": "1.0.0", foo: "1.0.0" };
    const parsedLockFile = await parseLockFile(packageRoot);

    const resolvedDependencies = resolveExternalDependencies(allDependencies, workspaces, parsedLockFile);

    expect(resolvedDependencies).toEqual(["foo@1.0.0", "bar@^1.0.0"]);
    await monorepo.cleanup();
  });
});

describe("resolveExternalDependencies() - pnpm", () => {
  it("given a list of external dependencies and a parsed Lock file, add all dependencies, transitively", async () => {
    const monorepo = new Monorepo("monorepo");
    await monorepo.init(path.join(fixturesPath, "monorepo-pnpm"));
    const packageRoot = monorepo.root;
    const workspaces = getPnpmWorkspaces(packageRoot);

    const allDependencies = {
      "package-a": "1.0.0",
      once: "1.4.0",
    };
    const parsedLockFile = await parseLockFile(packageRoot);

    const resolvedDependencies = resolveExternalDependencies(allDependencies, workspaces, parsedLockFile);

    expect(resolvedDependencies).toEqual(["once@1.4.0", "wrappy@1.0.2"]);
    await monorepo.cleanup();
  });
});

describe("resolveExternalDependencies() - rush+pnpm", () => {
  it("given a list of external dependencies and a parsed Lock file, add all dependencies, transitively", async () => {
    const monorepo = new Monorepo("monorepo");
    await monorepo.init(path.join(fixturesPath, "monorepo-rush-pnpm"));
    const packageRoot = monorepo.root;
    const workspaces = getRushWorkspaces(packageRoot);

    const allDependencies = {
      "package-a": "1.0.0",
      once: "1.4.0",
    };
    const parsedLockFile = await parseLockFile(packageRoot);

    const resolvedDependencies = resolveExternalDependencies(allDependencies, workspaces, parsedLockFile);

    expect(resolvedDependencies).toEqual(["once@1.4.0", "wrappy@1.0.2"]);
    await monorepo.cleanup();
  });
});

describe("resolveExternalDependencies() - rush+yarn", () => {
  it("given a list of external dependencies and a parsed Lock file, add all dependencies, transitively", async () => {
    const monorepo = new Monorepo("monorepo");
    await monorepo.init(path.join(fixturesPath, "monorepo-rush-yarn"));
    const packageRoot = monorepo.root;
    const workspaces = getRushWorkspaces(packageRoot);

    const allDependencies = {
      "package-a": "1.0.0",
      once: "1.4.0",
    };
    const parsedLockFile = await parseLockFile(packageRoot);

    const resolvedDependencies = resolveExternalDependencies(allDependencies, workspaces, parsedLockFile);

    expect(resolvedDependencies).toEqual(["once@1.4.0", "wrappy@1.0.2"]);
    await monorepo.cleanup();
  });
});
