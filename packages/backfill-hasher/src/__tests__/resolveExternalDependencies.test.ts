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

  it("keeps distinct ranges and insertion order across batches", () => {
    const done = new Set<DependencySpec>(["visited@^1"]);
    const queue: DependencyQueue = [["@scope/shared", "^1"]];

    _addToQueue(
      { "@scope/shared": "^1", visited: "^1", other: "^2" },
      done,
      queue
    );
    _addToQueue({ "@scope/shared": "~1", other: "^2" }, done, queue);
    _addToQueue(undefined, done, queue);

    expect(queue).toEqual([
      ["@scope/shared", "^1"],
      ["other", "^2"],
      ["@scope/shared", "~1"],
    ]);
  });

  it("reuses membership across batches and retains visited requests", () => {
    const done = new Set<DependencySpec>();
    const queue: DependencyQueue = [["root", "^1"]];
    const queued = new Set<DependencySpec>(["root@^1"]);

    _addToQueue({ root: "^1", child: "^1" }, done, queue, queued);
    _addToQueue({ child: "^1", other: "^2" }, done, queue, queued);

    expect(queue).toEqual([
      ["root", "^1"],
      ["child", "^1"],
      ["other", "^2"],
    ]);
    expect([...queued]).toEqual(["root@^1", "child@^1", "other@^2"]);

    queue.shift();
    done.add("root@^1");
    _addToQueue({ root: "^1" }, done, queue, queued);

    expect(queue).toEqual([
      ["child", "^1"],
      ["other", "^2"],
    ]);
  });
});

describe("resolveExternalDependencies", () => {
  let root = "";

  afterEach(() => {
    root && removeTempDir(root);
    root = "";
  });

  it("preserves FIFO order, cycles, shared requests and resolved-version deduplication", () => {
    const lockInfo: ParsedLock = {
      type: "success",
      object: {
        "left@^1": {
          version: "1.2.0",
          dependencies: { "@scope/shared": "^1", right: "^2" },
        },
        "right@^2": {
          version: "2.3.0",
          dependencies: { "@scope/shared": "^1", left: "~1", missing: "^3" },
        },
        "@scope/shared@^1": {
          version: "1.4.0",
          dependencies: { left: "^1" },
        },
        "left@~1": {
          version: "1.2.0",
          dependencies: { extra: "^4" },
        },
      },
    };

    expect(
      resolveExternalDependencies({ left: "^1", right: "^2" }, {}, lockInfo)
    ).toEqual([
      "left@1.2.0",
      "right@2.3.0",
      "@scope/shared@1.4.0",
      "missing@^3",
      "extra@^4",
    ]);
  });

  it("does not share queued requests between resolutions", () => {
    const lockInfo: ParsedLock = {
      type: "success",
      object: {
        "root@^1": { version: "1.0.0", dependencies: { child: "^1" } },
        "child@^1": { version: "1.1.0" },
      },
    };

    expect(resolveExternalDependencies({ root: "^1" }, {}, lockInfo)).toEqual([
      "root@1.0.0",
      "child@1.1.0",
    ]);
    expect(resolveExternalDependencies({}, {}, lockInfo)).toEqual([]);
  });

  it("visits a wide queue and newly appended dependencies in breadth-first order", () => {
    const names = Array.from(
      { length: 64 },
      (_, index) => `dependency-${index}`
    );
    const roots = Object.fromEntries(names.map((name) => [name, "^1"]));
    const children = Object.fromEntries(
      names.map((name) => [`${name}-child`, "^2"])
    );
    const lockInfo: ParsedLock = {
      type: "success",
      object: Object.fromEntries([
        ...names.map((name) => [
          `${name}@^1`,
          { version: "1.0.0", dependencies: children },
        ]),
        ...names.map((name) => [
          `${name}-child@^2`,
          { version: "2.0.0", dependencies: { ...roots, leaf: "^3" } },
        ]),
      ]),
    };

    expect(resolveExternalDependencies(roots, {}, lockInfo)).toEqual([
      ...names.map((name) => `${name}@1.0.0`),
      ...names.map((name) => `${name}-child@2.0.0`),
      "leaf@^3",
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
