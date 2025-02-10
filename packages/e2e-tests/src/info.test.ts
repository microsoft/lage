import { Monorepo } from "./mock/monorepo.js";
import { parseNdJson } from "./parseNdJson.js";

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
    const { packageTasks } = infoJsonOutput.data;

    // Check if task `a#build` depends on `c#build`, because package `b` doesn't
    // have a `build` task so dependencies are hoisted up.
    const task = packageTasks.find(({ id }) => id === "a#build");
    expect(task.dependencies).toEqual(["c#build"]);

    // Make sure all dependencies points to an existing task.
    for (const task of packageTasks) {
      for (const dependency of task.dependencies) {
        expect(packageTasks.some(({ id }) => id === dependency)).toBeTruthy();
      }
    }

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
