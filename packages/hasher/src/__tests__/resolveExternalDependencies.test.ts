import { parseLockFile, getPackageInfos } from "workspace-tools";
import {
  _filterExternalDependencies,
  resolveExternalDependencies,
  _addToQueue,
  type DependencySpec,
  type DependencyQueue,
} from "../resolveExternalDependencies.js";
import path from "path";
import { Monorepo } from "@lage-run/monorepo-fixture";

const fixturesPath = path.join(__dirname, "../__fixtures__");

describe("_filterExternalDependencies", () => {
  let monorepo: Monorepo | undefined;

  afterEach(async () => {
    await monorepo?.cleanup();
    monorepo = undefined;
  });

  it("only lists external dependencies", async () => {
    monorepo = new Monorepo("monorepo");
    await monorepo.init(path.join(fixturesPath, "monorepo"));

    const dependencies = { "package-a": "1.0.0", foo: "1.0.0" };
    const results = _filterExternalDependencies(dependencies, getPackageInfos(monorepo.root));

    expect(results).toEqual({ foo: "1.0.0" });
  });

  it("identifies all dependencies as external packages if there are no workspaces", async () => {
    monorepo = new Monorepo("monorepo");
    await monorepo.init(path.join(fixturesPath, "basic"));

    const dependencies = { "package-a": "1.0.0", foo: "1.0.0" };
    const results = _filterExternalDependencies(dependencies, getPackageInfos(monorepo.root));

    expect(results).toEqual(dependencies);
  });
});

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
  let monorepo: Monorepo | undefined;

  afterEach(async () => {
    await monorepo?.cleanup();
    monorepo = undefined;
  });

  it.each<{
    manager: "yarn" | "pnpm" | "rush";
    name: string;
    fixture: string;
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

    monorepo = new Monorepo("monorepo");
    await monorepo.init(path.join(fixturesPath, fixture));

    const parsedLockFile = await parseLockFile(monorepo.root);
    // TODO: use getPackageInfos(monorepo.root, manager) once available
    // to ensure it's testing with the expected manager
    const packageInfos = getPackageInfos(monorepo.root);

    const resolvedDependencies = resolveExternalDependencies(allDependencies, packageInfos, parsedLockFile);

    expect(resolvedDependencies).toEqual(expected);
  });
});
