import { afterEach, describe, expect, it } from "@jest/globals";
import type { InfoResult } from "@lage-run/cli/lib/internal.js";
import { Monorepo } from "./mock/monorepo.js";
import { parseNdJson } from "./parseNdJson.js";

describe("info command", () => {
  let repo: Monorepo | undefined;

  afterEach(async () => {
    await repo?.cleanup();
    repo = undefined;
  });

  it("basic info test case", async () => {
    repo = new Monorepo("basics-info");

    await repo.init({
      packages: { a: { internalDeps: ["b"] }, b: {} },
    });

    repo.install();

    const results = await repo.run("writeInfo", ["test"]);
    const jsonOutput = parseNdJson(results.stdout, results.stderr);

    expect(jsonOutput).toMatchSnapshot();
  });

  it("scoped info test case", async () => {
    repo = new Monorepo("scoped-info");

    await repo.init({
      packages: { a: { internalDeps: ["b"] }, b: {} },
    });

    repo.install();

    const results = await repo.run("writeInfo", ["test", "--to", "b"]);
    const jsonOutput = parseNdJson(results.stdout, results.stderr);
    expect(jsonOutput).toMatchSnapshot();
  });

  it("dependencies are resolved via noop tasks", async () => {
    repo = new Monorepo("noop-task-info");
    await repo.init({
      packages: {
        a: { internalDeps: ["b"], scripts: { build: "echo 'building a'" } },
        // This package does not have a `build` script.
        b: { internalDeps: ["c"], scripts: {} },
        c: { scripts: { build: "echo 'building c'" } },
      },
    });
    repo.install();

    const results = await repo.run("writeInfo", ["build", "prepare"]);

    const infoJsonOutput = parseNdJson(results.stdout, results.stderr)[0];
    const { packageTasks } = infoJsonOutput.data as InfoResult;

    // Check if task `a#build` depends on `c#build`, because package `b` doesn't
    // have a `build` task so dependencies are hoisted up.
    const aBuildTask = packageTasks.find(({ id }) => id === "a#build");
    expect(aBuildTask!.dependencies).toEqual(["c#build"]);

    // Make sure all dependencies points to an existing task.
    for (const task of packageTasks) {
      for (const dependency of task.dependencies) {
        expect(packageTasks.some(({ id }) => id === dependency)).toBeTruthy();
      }
    }
  });

  it("lage info drops direct dependencies when transtive and keeps __start", async () => {
    repo = new Monorepo("transitive-info-dropped");
    await repo.init({
      packages: {
        a: { internalDeps: ["b", "c"] },
        b: { internalDeps: ["c", "d"] },
        c: {},
        d: { scripts: { nobuild: "echo 'no build'" } },
      },
    });
    repo.install();

    const results = await repo.run("writeInfo", ["build"]);

    const jsonOutput = parseNdJson(results.stdout, results.stderr);
    const { packageTasks } = jsonOutput[0].data as InfoResult;

    const taskA = packageTasks.find(({ id }) => id === "a#build");
    expect(taskA!.dependencies).toEqual(["b#build"]);

    const taskC = packageTasks.find(({ id }) => id === "c#build");
    expect(taskC!.dependencies).toEqual(["__start"]);

    expect(jsonOutput).toMatchSnapshot();
  });

  it("lage info in back compat mode keeps direct dependencies and drops __start", async () => {
    repo = new Monorepo("transitive-info-dropped");
    await repo.init({
      packages: {
        a: { internalDeps: ["b", "c"] },
        b: { internalDeps: ["c", "d"] },
        c: {},
        d: { scripts: { nobuild: "echo 'no build'" } },
      },
    });
    repo.install();

    const backCompatEnvVars = { DOMINO: "1" };
    const results = await repo.run("writeInfo", ["build"], false, { env: backCompatEnvVars });

    const jsonOutput = parseNdJson(results.stdout, results.stderr);
    const { packageTasks } = jsonOutput[0].data as InfoResult;

    const task = packageTasks.find(({ id }) => id === "a#build");
    expect(task!.dependencies).toEqual(["b#build", "c#build"]);

    const taskC = packageTasks.find(({ id }) => id === "c#build");
    expect(taskC!.dependencies).toEqual([]);

    expect(jsonOutput).toMatchSnapshot();
  });

  it("custom inputs, outputs and weight value", async () => {
    repo = new Monorepo("scoped-info");

    await repo.init({
      lageConfig: {
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
            weight: 5,
          },
        },
      },
      packages: {
        a: { internalDeps: ["b"] },
        b: {},
      },
    });
    repo.install();

    const results = await repo.run("writeInfo", ["test", "build"]);
    const jsonOutput = parseNdJson(results.stdout, results.stderr);
    expect(jsonOutput).toMatchSnapshot();
  });

  it("custom options", async () => {
    repo = new Monorepo("scoped-info");

    await repo.init({
      lageConfig: {
        pipeline: {
          build: ["^build"],
          test: {
            dependsOn: ["build"],
            options: {
              environment: {
                custom_env_var_number: 1,
                custom_env_var_string: "string",
                custom_env_var_bool: true,
                custom_env_var_array: [1, true, "string", { x: 1 }, []],
              },
            },
          },
        },
      },
      packages: {
        a: { internalDeps: ["b"] },
        b: {},
      },
    });
    repo.install();

    const results = await repo.run("writeInfo", ["test", "build"]);
    const jsonOutput = parseNdJson(results.stdout, results.stderr);
    expect(jsonOutput).toMatchSnapshot();
  });
});
