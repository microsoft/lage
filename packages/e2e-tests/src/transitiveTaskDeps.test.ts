import { Monorepo } from "./mock/monorepo.js";
import { getTargetId } from "@lage-run/target-graph";
import { filterEntry, parseNdJson } from "./parseNdJson.js";

describe("transitive task deps test", () => {
  // This test follows the model as documented here:
  // https://microsoft.github.io/lage/guide/levels.html
  it("produces a build graph even when some scripts are missing in package.json", async () => {
    const repo = new Monorepo("transitiveDeps");

    await repo.init();
    await repo.setLageConfig(`module.exports = {
      "pipeline": {
        "build": [ ],
        "bundle":["build"],
        "test": ["bundle"]
      }
    }`);

    await repo.addPackage("a", [], {
      build: "echo a:build",
      test: "echo a:test",
    });
    await repo.addPackage("b", [], {
      build: "echo b:build",
    });
    await repo.install();

    const results = await repo.run("test");

    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    const indices: { [taskId: string]: number } = {};

    for (const pkg of ["a", "b"]) {
      for (const task of ["build", "bundle", "test"]) {
        const index = jsonOutput.findIndex((e) => filterEntry(e.data, pkg, task, "success"));
        if (index > -1) {
          indices[getTargetId(pkg, task)] = index;
        }
      }
    }

    expect(indices[getTargetId("a", "build")]).toBeLessThan(indices[getTargetId("a", "test")]);

    expect(indices[getTargetId("b", "build")]).toBeLessThan(indices[getTargetId("a", "test")]);

    await repo.cleanup();
  });

  it("only runs package local dependencies for no-prefix dependencies", async () => {
    const repo = new Monorepo("transitiveDeps-no-prefix");

    await repo.init();
    await repo.setLageConfig(`module.exports = {
      pipeline: {
        bundle: ["transpile"],
        transpile: []
      },
    }`);

    await repo.addPackage("a", ["b"], {
      bundle: "echo a:bundle",
      transpile: "echo a:transpile",
    });
    await repo.addPackage("b", ["c"], {
      transpile: "echo b:transpile",
    });
    await repo.addPackage("c", [], {
      transpile: "echo c:transpile",
    });
    await repo.install();

    const results = await repo.run("bundle", ["--scope", "a"]);

    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    const indices: { [taskId: string]: number } = {};

    for (const pkg of ["a", "b", "c"]) {
      for (const task of ["transpile", "bundle"]) {
        const index = jsonOutput.findIndex((e) => filterEntry(e.data, pkg, task, "success"));
        if (index > -1) {
          indices[getTargetId(pkg, task)] = index;
        }
      }
    }

    // own package transpilation should be run
    expect(indices[getTargetId("a", "transpile")]).toBeLessThan(indices[getTargetId("a", "bundle")]);
    // b & c#transpile should not be queued, since we only take a local dependency
    expect(indices[getTargetId("b", "transpile")]).toBeUndefined();
    expect(indices[getTargetId("c", "transpile")]).toBeUndefined();

    await repo.cleanup();
  });

  it("only runs direct dependencies for ^ prefix dependencies -- ", async () => {
    const repo = new Monorepo("transitiveDeps-carat-prefix");

    await repo.init();
    await repo.setLageConfig(`module.exports = {
      pipeline: {
        bundle: ["^transpile"],
        transpile: []
      },
    }`);

    await repo.addPackage("a", ["b"], {
      bundle: "echo a:bundle",
      transpile: "echo a:transpile",
    });
    await repo.addPackage("b", ["c"], {
      transpile: "echo b:transpile",
    });
    await repo.addPackage("c", [], {
      transpile: "echo c:transpile",
    });
    await repo.install();

    const results = await repo.run("bundle", ["--scope", "a"]);

    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    const indices: { [taskId: string]: number } = {};

    for (const pkg of ["a", "b", "c"]) {
      for (const task of ["transpile", "bundle"]) {
        const index = jsonOutput.findIndex((e) => filterEntry(e.data, pkg, task, "running"));
        if (index > -1) {
          indices[getTargetId(pkg, task)] = index;
        }
      }
    }

    expect(indices[getTargetId("b", "transpile")]).toBeLessThan(indices[getTargetId("a", "bundle")]);
    // own package transpilation should not be run, since we only want to to consider dependencies
    // with a ^ dependency.
    expect(indices[getTargetId("a", "transpile")]).toBeUndefined();
    // c#transpile should not be queued, since transpile only takes a direct topological dependency,
    // and transpile has no dependency on itself
    expect(indices[getTargetId("c", "transpile")]).toBeUndefined();

    await repo.cleanup();
  });

  it("Runs transitive dependencies for ^^ prefix dependencies", async () => {
    const repo = new Monorepo("transitiveDeps-indirect");

    await repo.init();
    await repo.setLageConfig(`module.exports = {
      pipeline: {
        bundle: ["^^transpile"],
        transpile: []
      },
      priorities: [
        {
          package: "b",
          task: "transpile",
          priority: 100
        },
        {
          package: "c",
          task: "transpile",
          priority: 1
        }
      ],
    }`);

    await repo.addPackage("a", ["b"], {
      bundle: "echo a:bundle",
      transpile: "echo a:transpile",
    });
    await repo.addPackage("b", ["c"], {
      transpile: "echo b:transpile",
    });
    await repo.addPackage("c", [], {
      transpile: "echo c:transpile",
    });
    await repo.install();

    const results = await repo.run("bundle", ["--scope", "a"]);

    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    const indices: { [taskId: string]: number } = {};

    for (const pkg of ["a", "b", "c"]) {
      for (const task of ["transpile", "bundle"]) {
        const index = jsonOutput.findIndex((e) => filterEntry(e.data, pkg, task, "running"));
        if (index > -1) {
          indices[getTargetId(pkg, task)] = index;
        }
      }
    }

    // Dependency transpilation should run before bundling
    expect(indices[getTargetId("c", "transpile")]).toBeLessThan(indices[getTargetId("a", "bundle")]);
    expect(indices[getTargetId("b", "transpile")]).toBeLessThan(indices[getTargetId("a", "bundle")]);
    // own package transpilation should not be run, since we only want to to consider transitive
    // dependencies with a ^^ dependency.
    expect(indices[getTargetId("a", "transpile")]).toBeUndefined();

    await repo.cleanup();
  });

  it("does not include phantom npm scripts when enablePhantomTargetOptimization is true", async () => {
    // Simulates a bug from an internal repo that implemented isolated declarations for some packages
    const repo = new Monorepo("transitiveDeps-isolated-declarations-info");

    await repo.init();

    // This repo has some packages that have isolated declarations configured and some that do not.
    // For the packages that do not have isolatedDeclarations enabled, we have a dummy emitDeclarations task defined for them whose sole purpose is to make sure we block on those package's typecheck step for d.ts emission
    // For packages that do have isolatedDeclarations enabled, we emit the d.ts during transpile so we omit the emitDeclarations task.
    await repo.setLageConfig(`module.exports = {
      pipeline: {
        transpile: [],
        emitDeclarations: ["typecheck"],
        typecheck: ["^^emitDeclarations", "transpile", "^^transpile"]
      },
      "enablePhantomTargetOptimization": "true"
    }`);

    await repo.addPackage("dep", [], {
      transpile: "echo dep:transpile",
      typecheck: "echo dep:typecheck",
    });

    await repo.addPackage("app", ["dep"], {
      transpile: "echo app:transpile",
      typecheck: "echo app:typecheck",
      emitDeclarations: "echo app:emitDeclarations",
    });

    await repo.install();

    const results = await repo.run("writeInfo", ["typecheck", "--scope", "app"]);

    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);
    const packageTasks = jsonOutput[0].data.packageTasks;

    const appTypecheckTask = packageTasks.find(({ id }: { id: string }) => id === "app#typecheck");
    expect(appTypecheckTask).toBeTruthy();

    expect(appTypecheckTask.dependencies).toContain("app#transpile");

    // This was the bug, we'd end up with app depending on the typecheck step of the dependency which does not have an emitDeclarations step
    expect(appTypecheckTask.dependencies).not.toContain("dep#typecheck");

    await repo.cleanup();
  });
});
