import { getPnpmWorkspaces, getRushWorkspaces, getYarnWorkspaces } from "workspace-tools";

import { filterInternalDependencies, resolveInternalDependencies } from "../resolveInternalDependencies";
import {
  filterDependenciesInYarnFixture,
  filterDependenciesInPnpmFixture,
  filterDependenciesInRushFixture,
} from "./resolveDependenciesHelper";
import path from "path";
import { Monorepo } from "@lage-run/monorepo-fixture";
const fixturesPath = path.join(__dirname, "..", "__fixtures__");

describe("filterInternalDependencies() for yarn", () => {
  it("only lists internal dependencies", async () => {
    const results = await filterDependenciesInYarnFixture("monorepo", filterInternalDependencies);

    expect(results).toEqual(["package-a"]);
  });

  it("lists no internal packages if there are no workspaces", async () => {
    const results = await filterDependenciesInYarnFixture("basic", filterInternalDependencies);

    expect(results).toEqual([]);
  });
});

describe("resolveInternalDependencies() for yarn", () => {
  it("adds internal dependency names to the processedPackages list", async () => {
    const monorepo = new Monorepo("monorepo");
    await monorepo.init(path.join(fixturesPath, "monorepo"));
    const packageRoot = monorepo.root;
    const workspaces = getYarnWorkspaces(packageRoot);

    const dependencies = { "package-a": "1.0.0", foo: "1.0.0" };

    const resolvedDependencies = resolveInternalDependencies(dependencies, workspaces);

    expect(resolvedDependencies).toEqual(["package-a"]);
    await monorepo.cleanup();
  });
});

describe("filterInternalDependencies() for pnpm", () => {
  it("only lists internal dependencies", async () => {
    const results = await filterDependenciesInPnpmFixture("monorepo-pnpm", filterInternalDependencies);

    expect(results).toEqual(["package-a"]);
  });

  it("lists no internal packages if there are no workspaces", async () => {
    const results = await filterDependenciesInPnpmFixture("basic", filterInternalDependencies);

    expect(results).toEqual([]);
  });
});

describe("resolveInternalDependencies() for pnpm", () => {
  it("adds internal dependency names to the processedPackages list", async () => {
    const monorepo = new Monorepo("monorepo");
    await monorepo.init(path.join(fixturesPath, "monorepo-pnpm"));
    const packageRoot = monorepo.root;
    const workspaces = getPnpmWorkspaces(packageRoot);

    const dependencies = { "package-a": "1.0.0", foo: "1.0.0" };

    const resolvedDependencies = resolveInternalDependencies(dependencies, workspaces);

    expect(resolvedDependencies).toEqual(["package-a"]);
    await monorepo.cleanup();
  });
});

describe("filterInternalDependencies() for rush+pnpm", () => {
  it("only lists internal dependencies", async () => {
    const results = await filterDependenciesInRushFixture("monorepo-rush-pnpm", filterInternalDependencies);

    expect(results).toEqual(["package-a"]);
  });

  it("lists no internal packages if there are no workspaces", async () => {
    const results = await filterDependenciesInRushFixture("basic", filterInternalDependencies);

    expect(results).toEqual([]);
  });
});

describe("resolveInternalDependencies() for rush+pnpm", () => {
  it("adds internal dependency names to the processedPackages list", async () => {
    const monorepo = new Monorepo("monorepo");
    await monorepo.init(path.join(fixturesPath, "monorepo-rush-pnpm"));
    const packageRoot = monorepo.root;

    const workspaces = getRushWorkspaces(packageRoot);

    const dependencies = { "package-a": "1.0.0", foo: "1.0.0" };

    const resolvedDependencies = resolveInternalDependencies(dependencies, workspaces);

    expect(resolvedDependencies).toEqual(["package-a"]);
    await monorepo.cleanup();
  });
});

describe("filterInternalDependencies() for rush+yarn", () => {
  it("only lists internal dependencies", async () => {
    const results = await filterDependenciesInRushFixture("monorepo-rush-yarn", filterInternalDependencies);

    expect(results).toEqual(["package-a"]);
  });

  it("lists no internal packages if there are no workspaces", async () => {
    const results = await filterDependenciesInRushFixture("basic", filterInternalDependencies);

    expect(results).toEqual([]);
  });
});

describe("resolveInternalDependencies() for rush+yarn", () => {
  it("adds internal dependency names to the processedPackages list", async () => {
    const monorepo = new Monorepo("monorepo");
    await monorepo.init(path.join(fixturesPath, "monorepo-rush-yarn"));
    const packageRoot = monorepo.root;
    const workspaces = getRushWorkspaces(packageRoot);

    const dependencies = { "package-a": "1.0.0", foo: "1.0.0" };

    const resolvedDependencies = resolveInternalDependencies(dependencies, workspaces);

    expect(resolvedDependencies).toEqual(["package-a"]);
    await monorepo.cleanup();
  });
});
