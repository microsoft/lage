import { Monorepo } from "./mock/monorepo.js";
import { parseNdJson } from "./parseNdJson.js";
import type { Target } from "@lage-run/target-graph";

describe("info command", () => {
  it("basic info test case", async () => {
    const repo = new Monorepo("basics-info");

    repo.init();
    repo.addPackage("a", ["b"]);
    repo.addPackage("b");

    repo.install();

    const results = repo.run("writeInfo", ["test"]);
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    expect(jsonOutput).toMatchSnapshot();

    await repo.cleanup();
  });

  it("scoped info test case", async () => {
    const repo = new Monorepo("scoped-info");

    repo.init();
    repo.addPackage("a", ["b"]);
    repo.addPackage("b");

    repo.install();

    const results = repo.run("writeInfo", ["test", "--to", "b"]);
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);
    expect(jsonOutput).toMatchSnapshot();

    await repo.cleanup();
  });

  it("dependencies are resolved via noop tasks", async () => {
    const repo = new Monorepo("noop-task-info");
    repo.init();
    repo.addPackage("a", ["b"], { build: "echo 'building a'" });
    // This task does not have a `build` script.
    repo.addPackage("b", ["c"], {});
    repo.addPackage("c", [], { build: "echo 'building c'" });
    repo.install();

    const results = repo.run("writeInfo", ["build", "prepare"]);

    const output = results.stdout + results.stderr;
    const infoJsonOutput: any = parseNdJson(output)[0];
    const { packageTasks } = infoJsonOutput.data as { packageTasks: Target[] };

    // Check if task `a#build` depends on `c#build`, because package `b` doesn't
    // have a `build` task so dependencies are hoisted up.
    const task = packageTasks.find(({ id }) => id === "a#build");
    expect(task!.dependencies).toEqual(["c#build"]);

    // Make sure all dependencies points to an existing task.
    for (const task of packageTasks) {
      for (const dependency of task.dependencies) {
        expect(packageTasks.some(({ id }) => id === dependency)).toBeTruthy();
      }
    }

    await repo.cleanup();
  });

  it("lage info drops direct dependencies when transtive and keeps __start", async () => {
    const repo = new Monorepo("transitive-info-dropped");
    repo.init();
    repo.addPackage("a", ["b", "c"]);
    repo.addPackage("b", ["c", "d"]);
    repo.addPackage("c", []);
    repo.addPackage("d", [], { nobuild: "echo 'no build'" });
    repo.install();

    const results = repo.run("writeInfo", ["build"]);

    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);
    const packageTasks = jsonOutput[0].data.packageTasks as Target[];

    const taskA = packageTasks.find(({ id }) => id === "a#build");
    expect(taskA!.dependencies).toEqual(["b#build"]);

    const taskC = packageTasks.find(({ id }) => id === "c#build");
    expect(taskC!.dependencies).toEqual(["__start"]);

    expect(jsonOutput).toMatchSnapshot();

    await repo.cleanup();
  });

  it("lage info in back compat mode keeps direct dependencies and drops __start", async () => {
    const repo = new Monorepo("transitive-info-dropped");
    repo.init();
    repo.addPackage("a", ["b", "c"]);
    repo.addPackage("b", ["c", "d"]);
    repo.addPackage("c", []);
    repo.addPackage("d", [], { nobuild: "echo 'no build'" });
    repo.install();

    const backCompatEnvVars = { DOMINO: "1" };
    const results = repo.run("writeInfo", ["build"], false, { env: backCompatEnvVars });

    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);
    const packageTasks = jsonOutput[0].data.packageTasks as Target[];

    const task = packageTasks.find(({ id }) => id === "a#build");
    expect(task!.dependencies).toEqual(["b#build", "c#build"]);

    const taskC = packageTasks.find(({ id }) => id === "c#build");
    expect(taskC!.dependencies).toEqual([]);

    expect(jsonOutput).toMatchSnapshot();

    await repo.cleanup();
  });

  it("custom inputs, outputs and weight value", async () => {
    const repo = new Monorepo("scoped-info");

    repo.init();
    repo.setLageConfig(
      `module.exports = {
        pipeline: {
          build: {
            inputs: ["src/**", "*"],
            outputs: ["lib/**"],
            dependsOn: ["^build"],
          },
          outputs: ["log/**"],
          test: {
           inputs: ["src/**/*.test.ts", "*", "^lib/**"],
           dependsOn: ["build"],
           weight: 5
          }
        },
        cache: true,
      };`
    );

    repo.addPackage("a", ["b"]);
    repo.addPackage("b");
    repo.install();
    const results = repo.run("writeInfo", ["test", "build"]);
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);
    expect(jsonOutput).toMatchSnapshot();

    await repo.cleanup();
  });

  it("custom options", async () => {
    const repo = new Monorepo("scoped-info");

    repo.init();
    repo.setLageConfig(
      `module.exports = {
        pipeline: {
          build: ["^build"],
          test: {
           dependsOn: ["build"],
           options: {
              environment: {
                custom_env_var_number: 1,
                custom_env_var_string: "string",
                custom_env_var_bool: true,
                custom_env_var_array: [1, true, "string", {x:1}, []],
              }
           }
          }
        },
        cache: true,
      };`
    );

    repo.addPackage("a", ["b"]);
    repo.addPackage("b");

    repo.install();

    const results = repo.run("writeInfo", ["test", "build"]);
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);
    expect(jsonOutput).toMatchSnapshot();

    await repo.cleanup();
  });
});
