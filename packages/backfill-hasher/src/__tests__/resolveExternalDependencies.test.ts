import { afterEach, describe, expect, it } from "@jest/globals";
import {
  setupFixture,
  removeTempDir,
  type FixtureName,
} from "@lage-run/test-utilities";
import {
  parseLockFile,
  getPackageInfos,
  type ParsedLock,
} from "workspace-tools";
import {
  resolveExternalDependencies,
  _addToQueue,
  type DependencySpec,
  type DependencyQueue,
} from "../resolveExternalDependencies.js";

describe("_addToQueue", () => {
  it("adds external dependencies to queue", () => {
    const externalDependencies = { foo: "1.0.0" };
    const done = new Set<DependencySpec>();
    const queue: DependencyQueue = [];

    _addToQueue(externalDependencies, done, queue);

    expect(queue).toEqual([["foo", "1.0.0"]]);
  });

  it("doesn't add to the queue if the dependency has been visited", () => {
    const externalDependencies = { foo: "1.0.0" };
    const done = new Set<DependencySpec>(["foo@1.0.0"]);
    const queue: DependencyQueue = [];

    _addToQueue(externalDependencies, done, queue);

    expect(queue).toEqual([]);
  });

  it("doesn't add to queue if the dependency is already in the queue", () => {
    const externalDependencies = { foo: "1.0.0" };
    const done: Set<DependencySpec> = new Set();
    const queue: DependencyQueue = [["foo", "1.0.0"]];

    _addToQueue(externalDependencies, done, queue);

    expect(queue).toEqual([["foo", "1.0.0"]]);
  });
});

describe("resolveExternalDependencies", () => {
  let root = "";

  afterEach(() => {
    root && removeTempDir(root);
    root = "";
  });

  it("preserves breadth-first order with cycles, shared dependencies and multiple ranges", () => {
    const parsedLock: ParsedLock = {
      type: "success",
      object: {
        "first@^1": {
          version: "1.1.0",
          dependencies: { "@scope/shared": "^1", first: "^1", missing: "^3" },
        },
        "second@^2": {
          version: "2.1.0",
          dependencies: { "@scope/shared": "^1", first: "~1" },
        },
        "@scope/shared@^1": {
          version: "1.0.0",
          dependencies: { second: "^2" },
        },
        "first@~1": {
          version: "1.1.0",
          dependencies: { extra: "^1" },
        },
      },
    };

    expect(
      resolveExternalDependencies({ first: "^1", second: "^2" }, {}, parsedLock)
    ).toEqual([
      "first@1.1.0",
      "second@2.1.0",
      "@scope/shared@1.0.0",
      "missing@^3",
      "extra@^1",
    ]);
  });

  it.each<{
    manager: "yarn" | "pnpm" | "rush";
    name: string;
    fixture: FixtureName;
    // only specified if different than the most common case
    allDependencies?: Record<string, string>;
    expected?: DependencySpec[];
  }>([
    {
      manager: "yarn",
      name: "yarn",
      fixture: "monorepo",
      allDependencies: { "package-a": "1.0.0", foo: "1.0.0" },
      expected: ["foo@1.0.0", "bar@^1.0.0"],
    },
    { manager: "pnpm", name: "pnpm", fixture: "monorepo-pnpm" },
    { manager: "rush", name: "rush+pnpm", fixture: "monorepo-rush-pnpm" },
    { manager: "rush", name: "rush+yarn", fixture: "monorepo-rush-yarn" },
  ])("transitively adds all external dependencies ($name)", async (params) => {
    const {
      fixture,
      // These are used in most of the test cases
      allDependencies = { "package-a": "1.0.0", once: "1.4.0" },
      expected = ["once@1.4.0", "wrappy@1.0.2"],
    } = params;

    root = setupFixture(fixture);

    const parsedLockFile = await parseLockFile(root);
    const packageInfos = getPackageInfos(root, params.manager);

    const resolvedDependencies = resolveExternalDependencies(
      allDependencies,
      packageInfos,
      parsedLockFile
    );

    expect(resolvedDependencies).toEqual(expected);
  });
});
