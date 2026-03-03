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

  it("isolated declarations: typecheck only blocks on ^^emitDeclarations from packages that have it", async () => {
    // Models the office-bohemia isolated declarations pipeline exactly:
    //   transpile: []
    //   emitDeclarations: ["typecheck"]                         – emitDeclarations depends on same-package typecheck
    //   typecheck: ["^^emitDeclarations", "transpile", "^^transpile"] – typecheck depends on transitive emitDeclarations + own & transitive transpile
    //
    // Topology:
    //   app → [iso-lib, iso-lib3, non-iso-lib]
    //   iso-lib → [non-iso-lib]
    //   iso-lib3 → [iso-lib2]
    //   iso-lib2 → [] (leaf, isolated)
    //
    // Only non-iso-lib defines emitDeclarations. All iso-lib* and app are "isolated" (no emitDeclarations script).
    // Key behaviors:
    //   - ^^emitDeclarations resolves ONLY to non-iso-lib#emitDeclarations for downstream packages
    //   - iso-lib* and app do NOT get an emitDeclarations task at all
    //   - There is no ^^typecheck dependency, so typecheck tasks don't block on each other across packages
    //   - iso-lib3#typecheck blocks on iso-lib2#transpile (via ^^transpile), NOT on iso-lib2#typecheck

    const repo = new Monorepo("transitiveDeps-isolatedDecl");

    await repo.init();
    await repo.setLageConfig(`module.exports = {
      pipeline: {
        transpile: [],
        emitDeclarations: ["typecheck"],
        typecheck: ["^^emitDeclarations", "transpile", "^^transpile"]
      },
    }`);

    // non-iso-lib: non-isolated, has emitDeclarations (d.ts generated via tsc)
    await repo.addPackage("non-iso-lib", [], {
      transpile: "echo non-iso-lib:transpile",
      typecheck: "echo non-iso-lib:typecheck",
      emitDeclarations: "echo non-iso-lib:emitDeclarations",
    });

    // iso-lib: isolated, NO emitDeclarations (d.ts generated during transpile via OXC)
    await repo.addPackage("iso-lib", ["non-iso-lib"], {
      transpile: "echo iso-lib:transpile",
      typecheck: "echo iso-lib:typecheck",
    });

    // iso-lib2: isolated leaf package, NO emitDeclarations
    // Uses a slow typecheck (3s) so we can verify iso-lib3#typecheck starts before iso-lib2#typecheck finishes
    await repo.addPackage("iso-lib2", [], {
      transpile: "echo iso-lib2:transpile",
      typecheck: "node slow-typecheck.js",
    });

    // Write a slow script file to avoid shell escaping issues on Windows
    await repo.commitFiles({
      "packages/iso-lib2/slow-typecheck.js": "setTimeout(() => { console.log('iso-lib2:typecheck done'); process.exit(0); }, 3000);",
    });

    // iso-lib3: isolated, depends on iso-lib2, NO emitDeclarations
    await repo.addPackage("iso-lib3", ["iso-lib2"], {
      transpile: "echo iso-lib3:transpile",
      typecheck: "echo iso-lib3:typecheck",
    });

    // app: isolated, NO emitDeclarations
    await repo.addPackage("app", ["iso-lib", "iso-lib3", "non-iso-lib"], {
      transpile: "echo app:transpile",
      typecheck: "echo app:typecheck",
    });

    await repo.install();

    // Use --concurrency 4 to ensure enough worker slots for parallel task execution
    const results = await repo.run("lage", ["typecheck", "--reporter", "json", "--log-level", "silly", "--concurrency", "4"]);

    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    const successIndices: { [taskId: string]: number } = {};
    const runningIndices: { [taskId: string]: number } = {};

    for (const pkg of ["app", "iso-lib", "iso-lib2", "iso-lib3", "non-iso-lib"]) {
      for (const task of ["transpile", "typecheck", "emitDeclarations"]) {
        const successIndex = jsonOutput.findIndex((e) => filterEntry(e.data, pkg, task, "success"));
        if (successIndex > -1) {
          successIndices[getTargetId(pkg, task)] = successIndex;
        }
        const runningIndex = jsonOutput.findIndex((e) => filterEntry(e.data, pkg, task, "running"));
        if (runningIndex > -1) {
          runningIndices[getTargetId(pkg, task)] = runningIndex;
        }
      }
    }

    // --- Existence assertions ---

    // 1. transpile runs for ALL packages
    expect(successIndices[getTargetId("app", "transpile")]).toBeDefined();
    expect(successIndices[getTargetId("iso-lib", "transpile")]).toBeDefined();
    expect(successIndices[getTargetId("iso-lib2", "transpile")]).toBeDefined();
    expect(successIndices[getTargetId("iso-lib3", "transpile")]).toBeDefined();
    expect(successIndices[getTargetId("non-iso-lib", "transpile")]).toBeDefined();

    // 2. emitDeclarations runs ONLY for non-iso-lib
    expect(successIndices[getTargetId("non-iso-lib", "emitDeclarations")]).toBeDefined();
    expect(successIndices[getTargetId("iso-lib", "emitDeclarations")]).toBeUndefined();
    expect(successIndices[getTargetId("iso-lib2", "emitDeclarations")]).toBeUndefined();
    expect(successIndices[getTargetId("iso-lib3", "emitDeclarations")]).toBeUndefined();
    expect(successIndices[getTargetId("app", "emitDeclarations")]).toBeUndefined();

    // 3. typecheck runs for ALL packages
    expect(successIndices[getTargetId("app", "typecheck")]).toBeDefined();
    expect(successIndices[getTargetId("iso-lib", "typecheck")]).toBeDefined();
    expect(successIndices[getTargetId("iso-lib2", "typecheck")]).toBeDefined();
    expect(successIndices[getTargetId("iso-lib3", "typecheck")]).toBeDefined();
    expect(successIndices[getTargetId("non-iso-lib", "typecheck")]).toBeDefined();

    // --- Ordering assertions (using success/completion indices) ---

    // 4. non-iso-lib#typecheck before non-iso-lib#emitDeclarations (emitDeclarations depends on same-package typecheck)
    expect(successIndices[getTargetId("non-iso-lib", "typecheck")]).toBeLessThan(successIndices[getTargetId("non-iso-lib", "emitDeclarations")]);

    // 5. non-iso-lib#emitDeclarations before app#typecheck (app → ^^emitDeclarations → non-iso-lib#emitDeclarations)
    expect(successIndices[getTargetId("non-iso-lib", "emitDeclarations")]).toBeLessThan(successIndices[getTargetId("app", "typecheck")]);

    // 6. non-iso-lib#emitDeclarations before iso-lib#typecheck (iso-lib → ^^emitDeclarations → non-iso-lib#emitDeclarations)
    expect(successIndices[getTargetId("non-iso-lib", "emitDeclarations")]).toBeLessThan(successIndices[getTargetId("iso-lib", "typecheck")]);

    // 7. Transitive transpile deps complete before downstream typecheck (^^transpile)
    expect(successIndices[getTargetId("non-iso-lib", "transpile")]).toBeLessThan(successIndices[getTargetId("app", "typecheck")]);
    expect(successIndices[getTargetId("iso-lib", "transpile")]).toBeLessThan(successIndices[getTargetId("app", "typecheck")]);
    expect(successIndices[getTargetId("iso-lib3", "transpile")]).toBeLessThan(successIndices[getTargetId("app", "typecheck")]);
    expect(successIndices[getTargetId("iso-lib2", "transpile")]).toBeLessThan(successIndices[getTargetId("app", "typecheck")]);
    expect(successIndices[getTargetId("non-iso-lib", "transpile")]).toBeLessThan(successIndices[getTargetId("iso-lib", "typecheck")]);

    // 8. Own transpile before own typecheck (typecheck depends on "transpile" same-package)
    expect(successIndices[getTargetId("app", "transpile")]).toBeLessThan(successIndices[getTargetId("app", "typecheck")]);
    expect(successIndices[getTargetId("iso-lib", "transpile")]).toBeLessThan(successIndices[getTargetId("iso-lib", "typecheck")]);
    expect(successIndices[getTargetId("iso-lib2", "transpile")]).toBeLessThan(successIndices[getTargetId("iso-lib2", "typecheck")]);
    expect(successIndices[getTargetId("iso-lib3", "transpile")]).toBeLessThan(successIndices[getTargetId("iso-lib3", "typecheck")]);
    expect(successIndices[getTargetId("non-iso-lib", "transpile")]).toBeLessThan(successIndices[getTargetId("non-iso-lib", "typecheck")]);

    // --- Key assertion: isolated packages don't block typecheck on each other's typecheck ---

    // 9. iso-lib3#typecheck blocks on iso-lib2#transpile (via ^^transpile), NOT on iso-lib2#typecheck.
    //    Since there is no ^^typecheck in the pipeline, iso-lib2#typecheck is NOT a prerequisite
    //    for iso-lib3#typecheck. Only iso-lib2#transpile is (via ^^transpile).
    expect(successIndices[getTargetId("iso-lib2", "transpile")]).toBeLessThan(successIndices[getTargetId("iso-lib3", "typecheck")]);

    // 10. Verify non-blocking via "running" indices: iso-lib3#typecheck STARTS before
    //     iso-lib2#typecheck FINISHES. If iso-lib3 were blocked on iso-lib2's typecheck,
    //     iso-lib3 couldn't start running until iso-lib2's typecheck completed (success).
    //     By checking that iso-lib3#typecheck enters "running" before iso-lib2#typecheck
    //     enters "success", we prove there is no dependency between the two typecheck tasks.
    expect(runningIndices[getTargetId("iso-lib3", "typecheck")]).toBeLessThan(successIndices[getTargetId("iso-lib2", "typecheck")]);

    await repo.cleanup();
  });
});
