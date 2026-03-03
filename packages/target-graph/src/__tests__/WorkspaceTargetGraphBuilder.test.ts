import type { PackageInfos } from "workspace-tools";
import { WorkspaceTargetGraphBuilder } from "../WorkspaceTargetGraphBuilder.js";
import type { TargetGraph } from "../types/TargetGraph.js";

function createPackageInfo(packages: { [id: string]: string[] }) {
  const packageInfos: PackageInfos = {};
  Object.keys(packages).forEach((id) => {
    packageInfos[id] = {
      packageJsonPath: `/path/to/${id}/package.json`,
      name: id,
      version: "1.0.0",
      dependencies: packages[id].reduce((acc, dep) => {
        return { ...acc, [dep]: "*" };
      }, {}),
    };
  });

  return packageInfos;
}

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
    const root = "/repos/a";

    const packageInfos = createPackageInfo({
      a: ["b"],
      b: [],
    });

    const builder = new WorkspaceTargetGraphBuilder(root, packageInfos, false);
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

    expect(getGraphFromTargets(targetGraph)).toMatchInlineSnapshot(`
      [
        [
          "__start",
          "a#build",
        ],
        [
          "b#build",
          "a#build",
        ],
        [
          "__start",
          "b#build",
        ],
      ]
    `);
  });

  it("should generate target graphs for tasks that do not depend on each other", async () => {
    const root = "/repos/a";
    const packageInfos = createPackageInfo({
      a: ["b"],
      b: [],
    });

    const builder = new WorkspaceTargetGraphBuilder(root, packageInfos, false);
    await builder.addTargetConfig("test");
    await builder.addTargetConfig("lint");

    const targetGraph = await builder.build(["test", "lint"]);

    // includes the pseudo-target for the "start" target
    expect(targetGraph.targets.size).toBe(5);
    expect(getGraphFromTargets(targetGraph)).toMatchInlineSnapshot(`
      [
        [
          "__start",
          "a#test",
        ],
        [
          "__start",
          "b#test",
        ],
        [
          "__start",
          "a#lint",
        ],
        [
          "__start",
          "b#lint",
        ],
      ]
    `);
  });

  it("should generate targetGraph with some specific package task target dependencies, running against all packages", async () => {
    const root = "/repos/a";

    const packageInfos = createPackageInfo({
      a: ["b"],
      b: [],
      c: ["b"],
    });

    const builder = new WorkspaceTargetGraphBuilder(root, packageInfos, false);

    await builder.addTargetConfig("build", {
      dependsOn: ["^build"],
    });

    await builder.addTargetConfig("a#build", {
      dependsOn: [],
    });

    const targetGraph = await builder.build(["build"]);
    expect(getGraphFromTargets(targetGraph)).toMatchInlineSnapshot(`
      [
        [
          "__start",
          "a#build",
        ],
        [
          "__start",
          "b#build",
        ],
        [
          "__start",
          "c#build",
        ],
        [
          "b#build",
          "c#build",
        ],
      ]
    `);
  });

  it("should generate targetGraph with some specific package task target dependencies, running against a specific package", async () => {
    const root = "/repos/a";

    const packageInfos = createPackageInfo({
      a: ["b"],
      b: [],
      c: ["b"],
    });

    const builder = new WorkspaceTargetGraphBuilder(root, packageInfos, false);

    await builder.addTargetConfig("build", {
      dependsOn: ["^build"],
    });

    await builder.addTargetConfig("a#build", {
      dependsOn: [],
    });

    const targetGraph = await builder.build(["build"], ["a", "b"]);
    expect(getGraphFromTargets(targetGraph)).toMatchInlineSnapshot(`
      [
        [
          "__start",
          "a#build",
        ],
        [
          "__start",
          "b#build",
        ],
      ]
    `);
  });

  it("should generate targetGraph with transitive dependencies", async () => {
    const root = "/repos/a";

    const packageInfos = createPackageInfo({
      a: ["b"],
      b: ["c"],
      c: [],
    });

    const builder = new WorkspaceTargetGraphBuilder(root, packageInfos, false);

    await builder.addTargetConfig("bundle", {
      dependsOn: ["^^transpile"],
    });

    await builder.addTargetConfig("transpile");

    const targetGraph = await builder.build(["bundle"], ["a"]);
    expect(getGraphFromTargets(targetGraph)).toMatchInlineSnapshot(`
      [
        [
          "__start",
          "a#bundle",
        ],
        [
          "b#transpile",
          "a#bundle",
        ],
        [
          "c#transpile",
          "a#bundle",
        ],
        [
          "__start",
          "b#transpile",
        ],
        [
          "__start",
          "c#transpile",
        ],
      ]
    `);
  });

  it("should generate target graph for a general task on a specific target", async () => {
    const root = "/repos/a";

    const packageInfos = createPackageInfo({
      a: [],
      b: [],
      c: [],
      common: [],
    });

    const builder = new WorkspaceTargetGraphBuilder(root, packageInfos, false);

    await builder.addTargetConfig("build", {
      dependsOn: ["common#copy", "^build"],
    });

    await builder.addTargetConfig("common#copy");
    await builder.addTargetConfig("common#build");

    const targetGraph = await builder.build(["build"]);
    expect(getGraphFromTargets(targetGraph)).toMatchInlineSnapshot(`
      [
        [
          "__start",
          "a#build",
        ],
        [
          "common#copy",
          "a#build",
        ],
        [
          "__start",
          "b#build",
        ],
        [
          "common#copy",
          "b#build",
        ],
        [
          "__start",
          "c#build",
        ],
        [
          "common#copy",
          "c#build",
        ],
        [
          "__start",
          "common#build",
        ],
        [
          "__start",
          "common#copy",
        ],
      ]
    `);
  });

  it("should build a target graph with global task as a dependency", async () => {
    const root = "/repos/a";

    const packageInfos = createPackageInfo({
      a: ["b"],
      b: [],
    });

    const builder = new WorkspaceTargetGraphBuilder(root, packageInfos, false);
    await builder.addTargetConfig("build", {
      dependsOn: ["^build", "#global:task"],
    });

    await builder.addTargetConfig("#global:task", {
      dependsOn: [],
    });

    const targetGraph = await builder.build(["build"]);

    expect(getGraphFromTargets(targetGraph)).toMatchInlineSnapshot(`
      [
        [
          "__start",
          "a#build",
        ],
        [
          "b#build",
          "a#build",
        ],
        [
          "#global:task",
          "a#build",
        ],
        [
          "__start",
          "b#build",
        ],
        [
          "#global:task",
          "b#build",
        ],
        [
          "__start",
          "#global:task",
        ],
      ]
    `);
  });

  it("should build a target graph with global task on its own", async () => {
    const root = "/repos/a";

    const packageInfos = createPackageInfo({
      a: ["b"],
      b: [],
    });

    const builder = new WorkspaceTargetGraphBuilder(root, packageInfos, false);
    await builder.addTargetConfig("build", {
      dependsOn: ["^build", "#global:task"],
    });

    await builder.addTargetConfig("#global:task", {
      dependsOn: [],
    });

    const targetGraph = await builder.build(["global:task"]);

    expect(getGraphFromTargets(targetGraph)).toMatchInlineSnapshot(`
      [
        [
          "__start",
          "#global:task",
        ],
      ]
    `);
  });

  it("should build a target graph without including global task", async () => {
    const root = "/repos/a";

    const packageInfos = createPackageInfo({
      a: ["b"],
      b: [],
    });

    const builder = new WorkspaceTargetGraphBuilder(root, packageInfos, false);
    await builder.addTargetConfig("build", {
      dependsOn: ["^build"],
    });

    await builder.addTargetConfig("#global:task", {
      dependsOn: [],
    });

    const targetGraph = await builder.build(["build"]);

    expect(getGraphFromTargets(targetGraph)).toMatchInlineSnapshot(`
      [
        [
          "__start",
          "a#build",
        ],
        [
          "b#build",
          "a#build",
        ],
        [
          "__start",
          "b#build",
        ],
      ]
    `);
  });

  describe("^^transitive dependency only includes packages that have the task", () => {
    /**
     * These tests model the office-bohemia isolated declarations pipeline:
     *
     * - `typecheck` depends on `['^^emitDeclarations', 'transpile', '^^transpile']`
     * - `emitDeclarations` depends on `['typecheck']` (same-package)
     * - Only non-isolated packages define `emitDeclarations`
     * - Isolated packages emit d.ts during `transpile` (via OXC), so they have no `emitDeclarations`
     *
     * The key behavior: `^^emitDeclarations` should only create edges to transitive deps
     * that actually have the `emitDeclarations` task registered. Packages without it are skipped,
     * meaning `typecheck` does NOT transitively block on `typecheck` of isolated dependencies.
     */

    it("should NOT create ^^emitDeclarations edges when no transitive deps have emitDeclarations", async () => {
      // Setup: iso-app -> iso-libA (isolated) -> iso-libB (isolated)
      // All packages are "isolated" (no emitDeclarations task).
      // iso-app#typecheck should only depend on transpile tasks, not on any emitDeclarations.
      //
      // NOTE: Package names must be unique across all tests in this file because
      // expandDepSpecs.ts caches transitive dependencies in a module-level Map keyed by package name.
      const root = "/repos/isolated";

      const packageInfos = createPackageInfo({
        "iso-app": ["iso-libA"],
        "iso-libA": ["iso-libB"],
        "iso-libB": [],
      });

      const builder = new WorkspaceTargetGraphBuilder(root, packageInfos, false);

      // transpile is defined for all packages
      await builder.addTargetConfig("transpile");

      // typecheck depends on ^^emitDeclarations + transpile + ^^transpile
      await builder.addTargetConfig("typecheck", {
        dependsOn: ["^^emitDeclarations", "transpile", "^^transpile"],
      });

      // emitDeclarations is NOT added for any package (all are isolated)

      const targetGraph = await builder.build(["typecheck"], ["iso-app"]);
      const graph = getGraphFromTargets(targetGraph);

      // Verify: NO emitDeclarations edges exist at all
      const emitEdges = graph.filter(([from]) => from.includes("emitDeclarations"));
      expect(emitEdges).toEqual([]);

      // Verify: iso-app#typecheck depends on transpile of transitive deps
      // and its own transpile (same-package)
      expect(graph).toContainEqual(["iso-libA#transpile", "iso-app#typecheck"]);
      expect(graph).toContainEqual(["iso-libB#transpile", "iso-app#typecheck"]);
      expect(graph).toContainEqual(["iso-app#transpile", "iso-app#typecheck"]);
    });

    it("should create ^^emitDeclarations edges ONLY for transitive deps that have emitDeclarations", async () => {
      // Setup: mix-app -> mix-libA (isolated) -> mix-libB (non-isolated, has emitDeclarations)
      //        mix-app -> mix-libC (non-isolated, has emitDeclarations)
      //
      // mix-app#typecheck should depend on:
      //   - mix-libB#emitDeclarations (transitive dep with emitDeclarations)
      //   - mix-libC#emitDeclarations (direct dep with emitDeclarations)
      //   - transpile tasks of all deps
      // But NOT on mix-libA#emitDeclarations (mix-libA is isolated, has no emitDeclarations)
      //   or mix-libA#typecheck (mix-libA is isolated, so no typecheck->typecheck chain should form).
      const root = "/repos/mixed";

      const packageInfos = createPackageInfo({
        "mix-app": ["mix-libA", "mix-libC"],
        "mix-libA": ["mix-libB"],
        "mix-libB": [],
        "mix-libC": [],
      });

      const builder = new WorkspaceTargetGraphBuilder(root, packageInfos, false);

      // transpile for all packages
      await builder.addTargetConfig("transpile");

      // typecheck for all packages
      await builder.addTargetConfig("typecheck", {
        dependsOn: ["^^emitDeclarations", "transpile", "^^transpile"],
      });

      // emitDeclarations ONLY for mix-libB and mix-libC (non-isolated packages)
      await builder.addTargetConfig("mix-libB#emitDeclarations", {
        dependsOn: ["typecheck"],
      });
      await builder.addTargetConfig("mix-libC#emitDeclarations", {
        dependsOn: ["typecheck"],
      });

      const targetGraph = await builder.build(["typecheck"], ["mix-app"]);
      const graph = getGraphFromTargets(targetGraph);

      // mix-app#typecheck SHOULD depend on emitDeclarations of mix-libB and mix-libC
      expect(graph).toContainEqual(["mix-libB#emitDeclarations", "mix-app#typecheck"]);
      expect(graph).toContainEqual(["mix-libC#emitDeclarations", "mix-app#typecheck"]);

      // There should be NO edge from mix-libA#emitDeclarations (it doesn't exist)
      const libAEmitEdges = graph.filter(([from]) => from === "mix-libA#emitDeclarations");
      expect(libAEmitEdges).toEqual([]);

      // mix-app#typecheck should also depend on transpile of all deps
      expect(graph).toContainEqual(["mix-libA#transpile", "mix-app#typecheck"]);
      expect(graph).toContainEqual(["mix-libB#transpile", "mix-app#typecheck"]);
      expect(graph).toContainEqual(["mix-libC#transpile", "mix-app#typecheck"]);
      expect(graph).toContainEqual(["mix-app#transpile", "mix-app#typecheck"]);
    });

    it("should not create cross-package typecheck dependencies for isolated packages", async () => {
      // This is the key performance test: when all deps are isolated,
      // typecheck tasks should be fully parallelizable (no cross-package typecheck->typecheck chain).
      //
      // Setup: par-app -> par-libA (isolated) -> par-libB (isolated)
      // All are isolated, so no emitDeclarations task exists.
      //
      // Expected: par-app#typecheck depends on ^^transpile (par-libA, par-libB transpile) + own transpile.
      //           par-libA#typecheck depends on ^^transpile (par-libB transpile) + own transpile.
      //           There should be NO edge from par-libA#typecheck -> par-app#typecheck.
      const root = "/repos/parallel";

      const packageInfos = createPackageInfo({
        "par-app": ["par-libA"],
        "par-libA": ["par-libB"],
        "par-libB": [],
      });

      const builder = new WorkspaceTargetGraphBuilder(root, packageInfos, false);

      await builder.addTargetConfig("transpile");
      await builder.addTargetConfig("typecheck", {
        dependsOn: ["^^emitDeclarations", "transpile", "^^transpile"],
      });

      // No emitDeclarations for any package (all isolated)

      const targetGraph = await builder.build(["typecheck"]);
      const graph = getGraphFromTargets(targetGraph);

      // There should be NO edge from par-libA#typecheck to par-app#typecheck
      // (that would mean sequential typechecking, defeating the purpose)
      expect(graph).not.toContainEqual(["par-libA#typecheck", "par-app#typecheck"]);
      expect(graph).not.toContainEqual(["par-libB#typecheck", "par-app#typecheck"]);
      expect(graph).not.toContainEqual(["par-libB#typecheck", "par-libA#typecheck"]);

      // But transpile dependencies should exist
      expect(graph).toContainEqual(["par-libA#transpile", "par-app#typecheck"]);
      expect(graph).toContainEqual(["par-libB#transpile", "par-app#typecheck"]);
      expect(graph).toContainEqual(["par-libB#transpile", "par-libA#typecheck"]);
    });

    it("should create typecheck chains through non-isolated packages via emitDeclarations", async () => {
      // When a dep is non-isolated, its emitDeclarations depends on its typecheck,
      // so the downstream typecheck transitively waits for that dep's typecheck.
      //
      // Setup: chain-app -> chain-libA (non-isolated, has emitDeclarations) -> chain-libB (isolated)
      //
      // Expected chain: chain-libB#transpile -> chain-libA#typecheck -> chain-libA#emitDeclarations -> chain-app#typecheck
      // But NOT: chain-libB#typecheck -> chain-app#typecheck (no direct typecheck chain)
      const root = "/repos/chain";

      const packageInfos = createPackageInfo({
        "chain-app": ["chain-libA"],
        "chain-libA": ["chain-libB"],
        "chain-libB": [],
      });

      const builder = new WorkspaceTargetGraphBuilder(root, packageInfos, false);

      await builder.addTargetConfig("transpile");
      await builder.addTargetConfig("typecheck", {
        dependsOn: ["^^emitDeclarations", "transpile", "^^transpile"],
      });

      // Only chain-libA has emitDeclarations (non-isolated)
      await builder.addTargetConfig("chain-libA#emitDeclarations", {
        dependsOn: ["typecheck"],
      });

      const targetGraph = await builder.build(["typecheck"]);
      const graph = getGraphFromTargets(targetGraph);

      // chain-app#typecheck should depend on chain-libA#emitDeclarations (transitive dep with the task)
      expect(graph).toContainEqual(["chain-libA#emitDeclarations", "chain-app#typecheck"]);

      // chain-libA#emitDeclarations depends on chain-libA#typecheck (same-package dep)
      expect(graph).toContainEqual(["chain-libA#typecheck", "chain-libA#emitDeclarations"]);

      // This creates the chain: chain-libA#typecheck -> chain-libA#emitDeclarations -> chain-app#typecheck
      // So chain-app#typecheck transitively waits for chain-libA#typecheck. Correct!

      // chain-libA#typecheck should depend on chain-libB#transpile (transitive dep)
      expect(graph).toContainEqual(["chain-libB#transpile", "chain-libA#typecheck"]);

      // There should be NO chain-libB#emitDeclarations at all (chain-libB is isolated)
      const libBEmitTargets = [...targetGraph.targets.keys()].filter((id) => id.includes("chain-libB#emitDeclarations"));
      expect(libBEmitTargets).toEqual([]);
    });

    it("should not block typecheck on the typecheck of dependencies without emitDeclarations", async () => {
      // This is the critical correctness assertion: when a dependency does NOT have
      // emitDeclarations (i.e. it's isolated), there must be NO path from that dep's
      // typecheck to the consumer's typecheck. The consumer only waits for transpile
      // (which produces d.ts via OXC for isolated packages).
      //
      // Setup: nb-app -> nb-libIsolated (no emitDeclarations) -> nb-libNonIsolated (has emitDeclarations)
      //
      // Expected:
      //   - nb-app#typecheck does NOT depend on nb-libIsolated#typecheck (no emitDeclarations = no chain)
      //   - nb-app#typecheck DOES depend on nb-libNonIsolated#emitDeclarations
      //     (which depends on nb-libNonIsolated#typecheck, so there IS a transitive chain there)
      //   - nb-app#typecheck depends on nb-libIsolated#transpile (for the OXC-generated d.ts)
      const root = "/repos/no-typecheck-block";

      const packageInfos = createPackageInfo({
        "nb-app": ["nb-libIsolated"],
        "nb-libIsolated": ["nb-libNonIsolated"],
        "nb-libNonIsolated": [],
      });

      const builder = new WorkspaceTargetGraphBuilder(root, packageInfos, false);

      await builder.addTargetConfig("transpile");
      await builder.addTargetConfig("typecheck", {
        dependsOn: ["^^emitDeclarations", "transpile", "^^transpile"],
      });

      // Only nb-libNonIsolated has emitDeclarations
      await builder.addTargetConfig("nb-libNonIsolated#emitDeclarations", {
        dependsOn: ["typecheck"],
      });

      const targetGraph = await builder.build(["typecheck"]);
      const graph = getGraphFromTargets(targetGraph);

      // CRITICAL: nb-app#typecheck must NOT depend on nb-libIsolated#typecheck.
      // nb-libIsolated has no emitDeclarations, so ^^emitDeclarations skips it entirely.
      // The only way typecheck -> typecheck chains form is through emitDeclarations.
      expect(graph).not.toContainEqual(["nb-libIsolated#typecheck", "nb-app#typecheck"]);

      // nb-app#typecheck DOES depend on nb-libNonIsolated#emitDeclarations
      // (because nb-libNonIsolated is a transitive dep of nb-app that has emitDeclarations)
      expect(graph).toContainEqual(["nb-libNonIsolated#emitDeclarations", "nb-app#typecheck"]);

      // nb-libNonIsolated#emitDeclarations depends on nb-libNonIsolated#typecheck (same-package)
      expect(graph).toContainEqual(["nb-libNonIsolated#typecheck", "nb-libNonIsolated#emitDeclarations"]);

      // So nb-app#typecheck transitively waits for nb-libNonIsolated#typecheck via emitDeclarations. Correct.
      // But it does NOT wait for nb-libIsolated#typecheck at all. That's the key.

      // nb-app#typecheck should still depend on transpile of both deps (for .js and d.ts files)
      expect(graph).toContainEqual(["nb-libIsolated#transpile", "nb-app#typecheck"]);
      expect(graph).toContainEqual(["nb-libNonIsolated#transpile", "nb-app#typecheck"]);

      // Verify nb-libIsolated#typecheck is completely independent of nb-app#typecheck.
      // Collect all direct dependencies of nb-app#typecheck.
      const appTypecheckDeps = graph
        .filter(([, to]) => to === "nb-app#typecheck")
        .map(([from]) => from);

      // None of them should be nb-libIsolated#typecheck
      expect(appTypecheckDeps).not.toContain("nb-libIsolated#typecheck");

      // And there should be no indirect path either: nb-libIsolated#typecheck
      // should not appear as a dependency of any of nb-app#typecheck's deps
      // (except via __start which is just a scheduling root).
      // Specifically, nb-libIsolated#emitDeclarations should not exist at all.
      const libIsolatedEmitTargets = [...targetGraph.targets.keys()].filter(
        (id) => id === "nb-libIsolated#emitDeclarations"
      );
      expect(libIsolatedEmitTargets).toEqual([]);
    });

    it("iso-lib3#typecheck depends on iso-lib2#transpile but NOT iso-lib2#typecheck", async () => {
      // Matches the e2e test topology:
      //   dep-app → [dep-iso-lib, dep-iso-lib3, dep-non-iso-lib]
      //   dep-iso-lib → [dep-non-iso-lib]
      //   dep-iso-lib3 → [dep-iso-lib2]
      //   dep-iso-lib2 → [] (leaf, isolated)
      //
      // Only dep-non-iso-lib has emitDeclarations. All iso-lib* are isolated.
      // Key assertion: dep-iso-lib3#typecheck has a direct edge from dep-iso-lib2#transpile
      //                but NO edge (direct or indirect) from dep-iso-lib2#typecheck.
      const root = "/repos/dep-graph";

      const packageInfos = createPackageInfo({
        "dep-app": ["dep-iso-lib", "dep-iso-lib3", "dep-non-iso-lib"],
        "dep-iso-lib": ["dep-non-iso-lib"],
        "dep-iso-lib3": ["dep-iso-lib2"],
        "dep-iso-lib2": [],
        "dep-non-iso-lib": [],
      });

      const builder = new WorkspaceTargetGraphBuilder(root, packageInfos, false);

      await builder.addTargetConfig("transpile");
      await builder.addTargetConfig("typecheck", {
        dependsOn: ["^^emitDeclarations", "transpile", "^^transpile"],
      });

      // Only dep-non-iso-lib has emitDeclarations
      await builder.addTargetConfig("dep-non-iso-lib#emitDeclarations", {
        dependsOn: ["typecheck"],
      });

      const targetGraph = await builder.build(["typecheck"]);
      const graph = getGraphFromTargets(targetGraph);

      // dep-iso-lib3#typecheck DOES depend on dep-iso-lib2#transpile (via ^^transpile)
      expect(graph).toContainEqual(["dep-iso-lib2#transpile", "dep-iso-lib3#typecheck"]);

      // dep-iso-lib3#typecheck does NOT depend on dep-iso-lib2#typecheck
      expect(graph).not.toContainEqual(["dep-iso-lib2#typecheck", "dep-iso-lib3#typecheck"]);

      // dep-iso-lib2#emitDeclarations should not exist at all (iso-lib2 is isolated)
      expect([...targetGraph.targets.keys()]).not.toContain("dep-iso-lib2#emitDeclarations");

      // Verify the full set of direct deps for dep-iso-lib3#typecheck:
      // should be exactly: own transpile + dep-iso-lib2#transpile (and __start scheduling root).
      // Notably: NO dep-iso-lib2#typecheck and NO dep-non-iso-lib#emitDeclarations
      // (dep-non-iso-lib is not in iso-lib3's dependency tree).
      const isoLib3TypecheckDeps = graph
        .filter(([, to]) => to === "dep-iso-lib3#typecheck")
        .map(([from]) => from)
        .filter((from) => from !== "__start")
        .sort();

      expect(isoLib3TypecheckDeps).toEqual([
        "dep-iso-lib2#transpile",            // ^^transpile (transitive dep)
        "dep-iso-lib3#transpile",            // transpile (same-package)
      ].sort());

      // Also verify dep-app#typecheck depends on emitDeclarations from non-iso-lib
      // but NOT on typecheck of any isolated package
      const appTypecheckDeps = graph
        .filter(([, to]) => to === "dep-app#typecheck")
        .map(([from]) => from);

      expect(appTypecheckDeps).toContain("dep-non-iso-lib#emitDeclarations");
      expect(appTypecheckDeps).not.toContain("dep-iso-lib#typecheck");
      expect(appTypecheckDeps).not.toContain("dep-iso-lib2#typecheck");
      expect(appTypecheckDeps).not.toContain("dep-iso-lib3#typecheck");
    });

    it("with real scripts: skips emitDeclarations targets for packages without the script", async () => {
      // This test uses packageInfos WITH scripts defined, which exercises the
      // skipPackagesWithoutScript logic in WorkspaceTargetGraphBuilder.addTargetConfig.
      // Unlike the other tests that use createPackageInfo (no scripts), this verifies
      // that phantom emitDeclarations targets are NOT created for isolated packages,
      // preventing unwanted dependency chains after optimizeTargetGraph's removeNodes.
      //
      // Topology: rs-app → [rs-iso-lib, rs-non-iso-lib]
      //   rs-non-iso-lib has: transpile, typecheck, emitDeclarations
      //   rs-iso-lib has: transpile, typecheck (no emitDeclarations)
      //   rs-app has: transpile, typecheck (no emitDeclarations)
      const root = "/repos/real-scripts";

      const packageInfos: PackageInfos = {
        "rs-app": {
          packageJsonPath: "/path/to/rs-app/package.json",
          name: "rs-app",
          version: "1.0.0",
          dependencies: { "rs-iso-lib": "*", "rs-non-iso-lib": "*" },
          scripts: { transpile: "echo transpile", typecheck: "echo typecheck" },
        },
        "rs-iso-lib": {
          packageJsonPath: "/path/to/rs-iso-lib/package.json",
          name: "rs-iso-lib",
          version: "1.0.0",
          dependencies: { "rs-non-iso-lib": "*" },
          scripts: { transpile: "echo transpile", typecheck: "echo typecheck" },
        },
        "rs-non-iso-lib": {
          packageJsonPath: "/path/to/rs-non-iso-lib/package.json",
          name: "rs-non-iso-lib",
          version: "1.0.0",
          dependencies: {},
          scripts: { transpile: "echo transpile", typecheck: "echo typecheck", emitDeclarations: "echo emitDeclarations" },
        },
      };

      const builder = new WorkspaceTargetGraphBuilder(root, packageInfos, false);

      // Global pipeline tasks — emitDeclarations should only create targets where the script exists
      await builder.addTargetConfig("transpile");
      await builder.addTargetConfig("emitDeclarations", { dependsOn: ["typecheck"] });
      await builder.addTargetConfig("typecheck", {
        dependsOn: ["^^emitDeclarations", "transpile", "^^transpile"],
      });

      const targetGraph = await builder.build(["typecheck"]);
      const graph = getGraphFromTargets(targetGraph);

      // emitDeclarations target should ONLY exist for rs-non-iso-lib
      expect(targetGraph.targets.has("rs-non-iso-lib#emitDeclarations")).toBe(true);
      expect(targetGraph.targets.has("rs-iso-lib#emitDeclarations")).toBe(false);
      expect(targetGraph.targets.has("rs-app#emitDeclarations")).toBe(false);

      // rs-app#typecheck should depend on rs-non-iso-lib#emitDeclarations
      expect(graph).toContainEqual(["rs-non-iso-lib#emitDeclarations", "rs-app#typecheck"]);

      // rs-app#typecheck should NOT depend on rs-iso-lib#typecheck
      // (no phantom emitDeclarations → no reconnected typecheck chain)
      expect(graph).not.toContainEqual(["rs-iso-lib#typecheck", "rs-app#typecheck"]);

      // rs-iso-lib#typecheck should depend on rs-non-iso-lib#emitDeclarations
      expect(graph).toContainEqual(["rs-non-iso-lib#emitDeclarations", "rs-iso-lib#typecheck"]);

      // Transpile edges still work correctly
      expect(graph).toContainEqual(["rs-iso-lib#transpile", "rs-app#typecheck"]);
      expect(graph).toContainEqual(["rs-non-iso-lib#transpile", "rs-app#typecheck"]);
      expect(graph).toContainEqual(["rs-app#transpile", "rs-app#typecheck"]);
      expect(graph).toContainEqual(["rs-non-iso-lib#transpile", "rs-iso-lib#typecheck"]);
    });
  });
});
