import path from "path";
import type { PackageInfos } from "workspace-tools";
import { WorkspaceTargetGraphBuilder } from "../WorkspaceTargetGraphBuilder.js";
import type { TargetGraph } from "../types/TargetGraph.js";

const root = path.resolve("/fake/root");

function createPackageInfo(packages: { [id: string]: string[] }) {
  const packageInfos: PackageInfos = {};
  for (const [id, deps] of Object.entries(packages)) {
    packageInfos[id] = {
      packageJsonPath: path.join(root, `packages/${id}/package.json`),
      name: id,
      version: "1.0.0",
      dependencies: Object.fromEntries(deps.map((dep) => [dep, "*"])),
    };
  }
  return packageInfos;
}

function createPackageInfoWithScripts(packages: { [id: string]: { deps: string[]; scripts: string[] } }) {
  const packageInfos: PackageInfos = {};
  for (const [id, { deps, scripts }] of Object.entries(packages)) {
    packageInfos[id] = {
      packageJsonPath: path.join(root, `packages/${id}/package.json`),
      name: id,
      version: "1.0.0",
      dependencies: Object.fromEntries(deps.map((dep) => [dep, "*"])),
      devDependencies: {},
      scripts: Object.fromEntries(scripts.map((script) => [script, `echo ${script}`])),
    };
  }
  return packageInfos;
}

/**
 * Get the graph from the target dependencies (in the form of `[dependsOn, target]`
 * (for running order, think of it as `[first, second]`)
 */
function getGraphFromTargets(targetGraph: TargetGraph) {
  const graph: [string, string][] = [];
  for (const target of targetGraph.targets.values()) {
    for (const dep of target.dependencies) {
      graph.push([dep, target.id]);
    }
  }
  return graph;
}

describe("workspace target graph builder", () => {
  it("should build a target based on a simple package graph and task graph", async () => {
    const packageInfos = createPackageInfo({
      a: ["b"],
      b: [],
    });

    const builder = new WorkspaceTargetGraphBuilder({
      root,
      packageInfos,
      enableTargetConfigMerging: false,
      enablePhantomTargetOptimization: false,
    });
    await builder.addTargetConfig("build", {
      dependsOn: ["^build"],
    });

    const targetGraph = await builder.build(["build"], undefined, [{ package: "b", task: "build", priority: 100 }]);

    // size is 3, because we also need to account for the root target node (start target ID)
    expect(targetGraph.targets.size).toBe(3);

    // Ensure priorities were set from the global priority argument
    expect(Array.from(targetGraph.targets.values())).toEqual([
      expect.objectContaining({ id: "__start", priority: 100 }),
      expect.objectContaining({ id: "a#build", priority: 0 }),
      expect.objectContaining({ id: "b#build", priority: 100 }),
    ]);

    expect(getGraphFromTargets(targetGraph)).toEqual([
      ["__start", "a#build"],
      ["b#build", "a#build"],
      ["__start", "b#build"],
    ]);
  });

  it("should generate target graphs for tasks that do not depend on each other", async () => {
    const packageInfos = createPackageInfo({
      a: ["b"],
      b: [],
    });

    const builder = new WorkspaceTargetGraphBuilder({
      root,
      packageInfos,
      enableTargetConfigMerging: false,
      enablePhantomTargetOptimization: false,
    });
    await builder.addTargetConfig("test");
    await builder.addTargetConfig("lint");

    const targetGraph = await builder.build(["test", "lint"]);

    // includes the pseudo-target for the "start" target
    expect(targetGraph.targets.size).toBe(5);
    expect(getGraphFromTargets(targetGraph)).toEqual([
      ["__start", "a#test"],
      ["__start", "b#test"],
      ["__start", "a#lint"],
      ["__start", "b#lint"],
    ]);
  });

  it("should generate targetGraph with some specific package task target dependencies, running against all packages", async () => {
    const packageInfos = createPackageInfo({
      a: ["b"],
      b: [],
      c: ["b"],
    });

    const builder = new WorkspaceTargetGraphBuilder({
      root,
      packageInfos,
      enableTargetConfigMerging: false,
      enablePhantomTargetOptimization: false,
    });

    await builder.addTargetConfig("build", {
      dependsOn: ["^build"],
    });

    await builder.addTargetConfig("a#build", {
      dependsOn: [],
    });

    const targetGraph = await builder.build(["build"]);
    expect(getGraphFromTargets(targetGraph)).toEqual([
      ["__start", "a#build"],
      ["__start", "b#build"],
      ["__start", "c#build"],
      ["b#build", "c#build"],
    ]);
  });

  it("should generate targetGraph with some specific package task target dependencies, running against a specific package", async () => {
    const packageInfos = createPackageInfo({
      a: ["b"],
      b: [],
      c: ["b"],
    });

    const builder = new WorkspaceTargetGraphBuilder({
      root,
      packageInfos,
      enableTargetConfigMerging: false,
      enablePhantomTargetOptimization: false,
    });

    await builder.addTargetConfig("build", {
      dependsOn: ["^build"],
    });

    await builder.addTargetConfig("a#build", {
      dependsOn: [],
    });

    const targetGraph = await builder.build(["build"], ["a", "b"]);
    expect(getGraphFromTargets(targetGraph)).toEqual([
      ["__start", "a#build"],
      ["__start", "b#build"],
    ]);
  });

  it("should generate targetGraph with transitive dependencies", async () => {
    const packageInfos = createPackageInfo({
      a: ["b"],
      b: ["c"],
      c: [],
    });

    const builder = new WorkspaceTargetGraphBuilder({
      root,
      packageInfos,
      enableTargetConfigMerging: false,
      enablePhantomTargetOptimization: false,
    });

    await builder.addTargetConfig("bundle", {
      dependsOn: ["^^transpile"],
    });

    await builder.addTargetConfig("transpile");

    const targetGraph = await builder.build(["bundle"], ["a"]);
    expect(getGraphFromTargets(targetGraph)).toEqual([
      ["__start", "a#bundle"],
      ["b#transpile", "a#bundle"],
      ["c#transpile", "a#bundle"],
      ["__start", "b#transpile"],
      ["__start", "c#transpile"],
    ]);
  });

  it("should generate target graph for a general task on a specific target", async () => {
    const packageInfos = createPackageInfo({
      a: [],
      b: [],
      c: [],
      common: [],
    });

    const builder = new WorkspaceTargetGraphBuilder({
      root,
      packageInfos,
      enableTargetConfigMerging: false,
      enablePhantomTargetOptimization: false,
    });

    await builder.addTargetConfig("build", {
      dependsOn: ["common#copy", "^build"],
    });

    await builder.addTargetConfig("common#copy");
    await builder.addTargetConfig("common#build");

    const targetGraph = await builder.build(["build"]);
    expect(getGraphFromTargets(targetGraph)).toEqual([
      ["__start", "a#build"],
      ["common#copy", "a#build"],
      ["__start", "b#build"],
      ["common#copy", "b#build"],
      ["__start", "c#build"],
      ["common#copy", "c#build"],
      ["__start", "common#build"],
      ["__start", "common#copy"],
    ]);
  });

  it("should build a target graph with global task as a dependency", async () => {
    const packageInfos = createPackageInfo({
      a: ["b"],
      b: [],
    });

    const builder = new WorkspaceTargetGraphBuilder({
      root,
      packageInfos,
      enableTargetConfigMerging: false,
      enablePhantomTargetOptimization: false,
    });
    await builder.addTargetConfig("build", {
      dependsOn: ["^build", "#global:task"],
    });

    await builder.addTargetConfig("#global:task", {
      dependsOn: [],
    });

    const targetGraph = await builder.build(["build"]);

    expect(getGraphFromTargets(targetGraph)).toEqual([
      ["__start", "a#build"],
      ["b#build", "a#build"],
      ["#global:task", "a#build"],
      ["__start", "b#build"],
      ["#global:task", "b#build"],
      ["__start", "#global:task"],
    ]);
  });

  it("should build a target graph with global task on its own", async () => {
    const packageInfos = createPackageInfo({
      a: ["b"],
      b: [],
    });

    const builder = new WorkspaceTargetGraphBuilder({
      root,
      packageInfos,
      enableTargetConfigMerging: false,
      enablePhantomTargetOptimization: false,
    });
    await builder.addTargetConfig("build", {
      dependsOn: ["^build", "#global:task"],
    });

    await builder.addTargetConfig("#global:task", {
      dependsOn: [],
    });

    const targetGraph = await builder.build(["global:task"]);

    expect(getGraphFromTargets(targetGraph)).toEqual([["__start", "#global:task"]]);
  });

  it("should build a target graph without including global task", async () => {
    const packageInfos = createPackageInfo({
      a: ["b"],
      b: [],
    });

    const builder = new WorkspaceTargetGraphBuilder({
      root,
      packageInfos,
      enableTargetConfigMerging: false,
      enablePhantomTargetOptimization: false,
    });
    await builder.addTargetConfig("build", {
      dependsOn: ["^build"],
    });

    await builder.addTargetConfig("#global:task", {
      dependsOn: [],
    });

    const targetGraph = await builder.build(["build"]);

    expect(getGraphFromTargets(targetGraph)).toEqual([
      ["__start", "a#build"],
      ["b#build", "a#build"],
      ["__start", "b#build"],
    ]);
  });

  it("preserves graph edges even with missing package scripts by default (enablePhantomTargetOptimization: false)", async () => {
    // "app" has emitDeclarations in scripts, "dep" does not
    const packageInfos = createPackageInfoWithScripts({
      dep: { deps: [], scripts: ["transpile", "typecheck"] },
      app: { deps: ["dep"], scripts: ["transpile", "typecheck", "emitDeclarations"] },
    });

    const builder = new WorkspaceTargetGraphBuilder({
      root,
      packageInfos,
      enableTargetConfigMerging: false,
      enablePhantomTargetOptimization: false,
    });
    await builder.addTargetConfig("transpile");
    await builder.addTargetConfig("emitDeclarations", {
      dependsOn: ["typecheck"],
    });
    await builder.addTargetConfig("typecheck", {
      dependsOn: ["^^emitDeclarations", "transpile", "^^transpile"],
    });

    const targetGraph = await builder.build(["typecheck"], ["app"]);
    const graph = getGraphFromTargets(targetGraph);

    // Even though dep doesn't have an emitDeclarations script, the graph edge from dep#emitDeclarations to app#typecheck
    // is preserved by default (this appears to be the original intended behavior).
    expect(graph).toContainEqual(["dep#emitDeclarations", "app#typecheck"]);

    expect(graph).toEqual([
      ["__start", "app#typecheck"],
      ["dep#emitDeclarations", "app#typecheck"],
      ["app#transpile", "app#typecheck"],
      ["dep#transpile", "app#typecheck"],
      ["__start", "dep#emitDeclarations"],
      ["dep#typecheck", "dep#emitDeclarations"],
      ["__start", "app#transpile"],
      ["__start", "dep#transpile"],
      ["__start", "dep#typecheck"],
      ["dep#transpile", "dep#typecheck"],
    ]);
  });

  it("should not create phantom transitive deps for packages missing a target with enablePhantomTargetOptimization: true", async () => {
    // "app" has emitDeclarations in scripts, "dep" does not
    const packageInfos = createPackageInfoWithScripts({
      dep: { deps: [], scripts: ["transpile", "typecheck"] },
      app: { deps: ["dep"], scripts: ["transpile", "typecheck", "emitDeclarations"] },
    });

    const builder = new WorkspaceTargetGraphBuilder({
      root,
      packageInfos,
      enableTargetConfigMerging: false,
      enablePhantomTargetOptimization: true,
    });
    await builder.addTargetConfig("transpile");
    await builder.addTargetConfig("emitDeclarations", {
      dependsOn: ["typecheck"],
    });
    await builder.addTargetConfig("typecheck", {
      dependsOn: ["^^emitDeclarations", "transpile", "^^transpile"],
    });

    const targetGraph = await builder.build(["typecheck"], ["app"]);
    const graph = getGraphFromTargets(targetGraph);
    expect(graph).toEqual([
      ["__start", "app#typecheck"],
      // app#typecheck should depend on app#transpile (same-package dep)
      ["app#transpile", "app#typecheck"],
      // app#typecheck should depend on dep#transpile (via ^^transpile, dep has the script)
      ["dep#transpile", "app#typecheck"],
      ["__start", "app#transpile"],
      ["__start", "dep#transpile"],
    ]);

    // app#typecheck should NOT depend on dep#emitDeclarations — dep doesn't have emitDeclarations,
    // so the phantom dep#emitDeclarations should not create a transitive link
    expect(graph).not.toContainEqual(["dep#emitDeclarations", "app#typecheck"]);
  });

  it("preserves indirect links", async () => {
    const packageInfos = createPackageInfoWithScripts({
      a: { deps: ["b"], scripts: ["build"] },
      b: { deps: ["c"], scripts: [] },
      c: { deps: [], scripts: ["build"] },
    });

    const builder = new WorkspaceTargetGraphBuilder({
      root,
      packageInfos,
      enableTargetConfigMerging: false,
      enablePhantomTargetOptimization: false,
    });
    await builder.addTargetConfig("build", {
      dependsOn: ["^build"],
    });

    const targetGraph = await builder.build(["build"]);
    const graph = getGraphFromTargets(targetGraph);
    // This will be reduced by optimizeTargetGraph to have a#build depend on c#build
    // via b#build which turns into a no-op (shouldRun=>false because script isn't defined)
    expect(graph).toEqual([
      ["__start", "a#build"],
      ["b#build", "a#build"],
      ["__start", "b#build"],
      ["c#build", "b#build"],
      ["__start", "c#build"],
    ]);
  });

  it("should preserve ^^ deps for non-npmScript typed targets", async () => {
    // "dep" doesn't have "customTask" in scripts, but it's configured as a worker type
    const packageInfos = createPackageInfoWithScripts({
      app: { deps: ["dep"], scripts: ["build"] },
      dep: { deps: [], scripts: ["build"] },
    });

    const builder = new WorkspaceTargetGraphBuilder({
      root,
      packageInfos,
      enableTargetConfigMerging: false,
      enablePhantomTargetOptimization: false,
    });
    await builder.addTargetConfig("customTask", {
      type: "worker",
    });
    await builder.addTargetConfig("build", {
      dependsOn: ["^^customTask"],
    });

    const targetGraph = await builder.build(["build"], ["app"]);
    const graph = getGraphFromTargets(targetGraph);

    expect(graph).toEqual([
      ["__start", "app#build"],
      // app#build should depend on dep#customTask even though dep doesn't have it in scripts,
      // because the target has an explicit non-npmScript type ("worker")
      ["dep#customTask", "app#build"],
      ["__start", "dep#customTask"],
    ]);
  });
});
