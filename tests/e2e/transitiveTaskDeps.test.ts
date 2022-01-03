import { Monorepo } from "../mock/monorepo";
import { getTargetId } from "../../src/task/taskId";
import { parseNdJson } from "./parseNdJson";

describe("transitive task deps test", () => {
  // This test follows the model as documented here:
  // https://microsoft.github.io/lage/guide/levels.html
  it("produces a build graph even when some scripts are missing in package.json", () => {
    const repo = new Monorepo("transitiveDeps");

    repo.init();
    repo.setLageConfig(`module.exports = {
      "pipeline": {
        "build": [ ],
        "bundle":["build"],
        "test": ["bundle"]
      }
    }`);
    repo.install();

    repo.addPackage("a", [], {
      build: "echo a:build",
      test: "echo a:test",
    });
    repo.addPackage("b", [], {
      build: "echo b:build",
    });
    repo.linkPackages();

    const results = repo.run("test");

    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    const indices: { [taskId: string]: number } = {};

    for (const pkg of ["a", "b"]) {
      for (const task of ["build", "bundle", "test"]) {
        const index = jsonOutput.findIndex((e) => filterEntry(e.data, pkg, task, "completed"));
        if (index > -1) {
          indices[getTargetId(pkg, task)] = index;  
        }
      }
    }

    expect(indices[getTargetId("a", "build")]).toBeLessThan(indices[getTargetId("a", "test")]);

    expect(indices[getTargetId("b", "build")]).toBeLessThan(indices[getTargetId("a", "test")]);

    repo.cleanup();
  });

  it("only runs package local dependencies for no-prefix dependencies", () => {
    const repo = new Monorepo("transitiveDeps-no-prefix");

    repo.init();
    repo.setLageConfig(`module.exports = {
      pipeline: {
        bundle: ["transpile"],
        transpile: []
      },
    }`);
    repo.install();

    repo.addPackage("a", ["b"], {
      bundle: "echo a:bundle",
      transpile: "echo a:transpile",
    });
    repo.addPackage("b", ["c"], {
      transpile: "echo b:transpile",
    });
    repo.addPackage("c", [], {
      transpile: "echo c:transpile",
    });
    repo.linkPackages();

    const results = repo.run("bundle", ["--scope", "a"]);

    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    const indices: { [taskId: string]: number } = {};

    for (const pkg of ["a", "b", "c"]) {
      for (const task of ["transpile", "bundle"]) {
        const index = jsonOutput.findIndex((e) => filterEntry(e.data, pkg, task, "completed"));
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

    repo.cleanup();
  });
  
  it("only runs direct dependencies for ^ prefix dependencies -- ", () => {
    const repo = new Monorepo("transitiveDeps-carat-prefix");

    repo.init();
    repo.setLageConfig(`module.exports = {
      pipeline: {
        bundle: ["^transpile"],
        transpile: []
      },
    }`);
    repo.install();

    repo.addPackage("a", ["b"], {
      bundle: "echo a:bundle",
      transpile: "echo a:transpile",
    });
    repo.addPackage("b", ["c"], {
      transpile: "echo b:transpile",
    });
    repo.addPackage("c", [], {
      transpile: "echo c:transpile",
    });
    repo.linkPackages();

    const results = repo.run("bundle", ["--scope", "a"]);

    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    const indices: { [taskId: string]: number } = {};

    for (const pkg of ["a", "b", "c"]) {
      for (const task of ["transpile", "bundle"]) {
        const index = jsonOutput.findIndex((e) => filterEntry(e.data, pkg, task, "completed"));
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

    repo.cleanup();
  });

  it("Runs transitive dependencies for ^^ prefix dependencies", () => {
    const repo = new Monorepo("transitiveDeps-indirect");

    repo.init();
    repo.setLageConfig(`module.exports = {
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
    repo.install();

    repo.addPackage("a", ["b"], {
      bundle: "echo a:bundle",
      transpile: "echo a:transpile",
    });
    repo.addPackage("b", ["c"], {
      transpile: "echo b:transpile",
    });
    repo.addPackage("c", [], {
      transpile: "echo c:transpile",
    });
    repo.linkPackages();

    const results = repo.run("bundle", ["--scope", "a"]);

    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    const indices: { [taskId: string]: number } = {};


    for (const pkg of ["a", "b", "c"]) {
      for (const task of ["transpile", "bundle"]) {
        const index = jsonOutput.findIndex((e) => filterEntry(e.data, pkg, task, "completed"));
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
    // despite b depending on c as a package, there is no dependency between the b#transpile and c#transpile
    // tasks, so they should be runnable in either order.
    //
    // In this test we use priority to ensure that b#transpile will always run before
    // c#transpile if they do not have an explicit task dependency.
    expect(indices[getTargetId("b", "transpile")]).toBeLessThan(indices[getTargetId("c", "transpile")]);

    repo.cleanup();
  });
});

function filterEntry(taskData, pkg, task, status) {
  return taskData && taskData.package === pkg && taskData.task === task && taskData.status === status;
}
