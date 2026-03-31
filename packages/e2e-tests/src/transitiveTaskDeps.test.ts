import { afterEach, describe, expect, it } from "@jest/globals";
import { Monorepo } from "./mock/monorepo.js";
import { getTargetId } from "@lage-run/target-graph";
import { getStatusIndices, parseNdJson } from "./parseNdJson.js";
import type { InfoResult } from "@lage-run/cli/lib/internal.js";

describe("transitive task deps test", () => {
  let repo: Monorepo | undefined;

  afterEach(async () => {
    await repo?.cleanup();
    repo = undefined;
  });

  // This test follows the model as documented here:
  // https://microsoft.github.io/lage/guide/levels.html
  it("produces a build graph even when some scripts are missing in package.json", async () => {
    repo = new Monorepo("transitiveDeps");

    await repo.init({
      lageConfig: {
        pipeline: {
          build: [],
          bundle: ["build"],
          test: ["bundle"],
        },
      },
      packages: {
        a: { scripts: { build: "echo a:build", test: "echo a:test" } },
        b: { scripts: { build: "echo b:build" } },
      },
    });
    repo.install();

    const results = await repo.run("test");

    const jsonOutput = parseNdJson(results.stdout, results.stderr);
    const indices = getStatusIndices({
      entries: jsonOutput,
      packages: ["a", "b"],
      tasks: ["build", "bundle", "test"],
      status: "success",
    });

    expect(indices[getTargetId("a", "build")]).toBeLessThan(indices[getTargetId("a", "test")]);

    expect(indices[getTargetId("b", "build")]).toBeLessThan(indices[getTargetId("a", "test")]);
  });

  it("only runs package local dependencies for no-prefix dependencies", async () => {
    repo = new Monorepo("transitiveDeps-no-prefix");

    await repo.init({
      lageConfig: {
        pipeline: {
          bundle: ["transpile"],
          transpile: [],
        },
      },
      packages: {
        a: { internalDeps: ["b"], scripts: { bundle: "echo a:bundle", transpile: "echo a:transpile" } },
        b: { internalDeps: ["c"], scripts: { transpile: "echo b:transpile" } },
        c: { scripts: { transpile: "echo c:transpile" } },
      },
    });
    repo.install();

    const results = await repo.run("bundle", ["--scope", "a"]);

    const jsonOutput = parseNdJson(results.stdout, results.stderr);
    const indices = getStatusIndices({
      entries: jsonOutput,
      packages: ["a", "b", "c"],
      tasks: ["transpile", "bundle"],
      status: "success",
    });

    // own package transpilation should be run
    expect(indices[getTargetId("a", "transpile")]).toBeLessThan(indices[getTargetId("a", "bundle")]);
    // b & c#transpile should not be queued, since we only take a local dependency
    expect(indices[getTargetId("b", "transpile")]).toBeUndefined();
    expect(indices[getTargetId("c", "transpile")]).toBeUndefined();
  });

  it("only runs direct dependencies for ^ prefix dependencies -- ", async () => {
    repo = new Monorepo("transitiveDeps-carat-prefix");

    await repo.init({
      lageConfig: {
        pipeline: {
          bundle: ["^transpile"],
          transpile: [],
        },
      },
      packages: {
        a: { internalDeps: ["b"], scripts: { bundle: "echo a:bundle", transpile: "echo a:transpile" } },
        b: { internalDeps: ["c"], scripts: { transpile: "echo b:transpile" } },
        c: { scripts: { transpile: "echo c:transpile" } },
      },
    });
    repo.install();

    const results = await repo.run("bundle", ["--scope", "a"]);

    const jsonOutput = parseNdJson(results.stdout, results.stderr);
    const indices = getStatusIndices({
      entries: jsonOutput,
      packages: ["a", "b", "c"],
      tasks: ["transpile", "bundle"],
      status: "running",
    });

    expect(indices[getTargetId("b", "transpile")]).toBeLessThan(indices[getTargetId("a", "bundle")]);
    // own package transpilation should not be run, since we only want to to consider dependencies
    // with a ^ dependency.
    expect(indices[getTargetId("a", "transpile")]).toBeUndefined();
    // c#transpile should not be queued, since transpile only takes a direct topological dependency,
    // and transpile has no dependency on itself
    expect(indices[getTargetId("c", "transpile")]).toBeUndefined();
  });

  it("Runs transitive dependencies for ^^ prefix dependencies", async () => {
    repo = new Monorepo("transitiveDeps-indirect");

    await repo.init({
      lageConfig: {
        pipeline: {
          bundle: ["^^transpile"],
          transpile: [],
        },
        priorities: [
          {
            package: "b",
            task: "transpile",
            priority: 100,
          },
          {
            package: "c",
            task: "transpile",
            priority: 1,
          },
        ],
      },
      packages: {
        a: { internalDeps: ["b"], scripts: { bundle: "echo a:bundle", transpile: "echo a:transpile" } },
        b: { internalDeps: ["c"], scripts: { transpile: "echo b:transpile" } },
        c: { scripts: { transpile: "echo c:transpile" } },
      },
    });
    repo.install();

    const results = await repo.run("bundle", ["--scope", "a"]);

    const jsonOutput = parseNdJson(results.stdout, results.stderr);
    const indices = getStatusIndices({
      entries: jsonOutput,
      packages: ["a", "b", "c"],
      tasks: ["transpile", "bundle"],
      status: "running",
    });

    // Dependency transpilation should run before bundling
    expect(indices[getTargetId("c", "transpile")]).toBeLessThan(indices[getTargetId("a", "bundle")]);
    expect(indices[getTargetId("b", "transpile")]).toBeLessThan(indices[getTargetId("a", "bundle")]);
    // own package transpilation should not be run, since we only want to to consider transitive
    // dependencies with a ^^ dependency.
    expect(indices[getTargetId("a", "transpile")]).toBeUndefined();
  });

  it("does not include phantom npm scripts when enablePhantomTargetOptimization is true", async () => {
    // Simulates a bug from an internal repo that implemented isolated declarations for some packages
    repo = new Monorepo("transitiveDeps-isolated-declarations-info");

    // This repo has some packages that have isolated declarations configured and some that do not.
    // For the packages that do not have isolatedDeclarations enabled, we have a dummy emitDeclarations task
    // defined for them whose sole purpose is to make sure we block on those package's typecheck step for d.ts emission.
    // For packages that do have isolatedDeclarations enabled, we emit the d.ts during transpile so we omit the
    // emitDeclarations task.
    await repo.init({
      lageConfig: {
        pipeline: {
          transpile: [],
          emitDeclarations: ["typecheck"],
          typecheck: ["^^emitDeclarations", "transpile", "^^transpile"],
        },
        enablePhantomTargetOptimization: true,
      },
      packages: {
        dep: {
          scripts: { transpile: "echo dep:transpile", typecheck: "echo dep:typecheck" },
        },
        app: {
          internalDeps: ["dep"],
          scripts: { transpile: "echo app:transpile", typecheck: "echo app:typecheck", emitDeclarations: "echo app:emitDeclarations" },
        },
      },
    });

    repo.install();

    const results = await repo.run("writeInfo", ["typecheck", "--scope", "app"]);

    const output = results.stdout + "\n" + results.stderr;
    const infoJsonOutput = parseNdJson(output)[0];
    const { packageTasks } = infoJsonOutput.data as InfoResult;

    const appTypecheckTask = packageTasks.find(({ id }: { id: string }) => id === "app#typecheck");
    expect(appTypecheckTask).toBeTruthy();

    expect(appTypecheckTask!.dependencies).toContain("app#transpile");

    // This was the bug, we'd end up with app depending on the typecheck step of the dependency which does not have an emitDeclarations step
    expect(appTypecheckTask!.dependencies).not.toContain("dep#typecheck");
  });
});
