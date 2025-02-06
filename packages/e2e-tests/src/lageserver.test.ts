import { Monorepo } from "./mock/monorepo.js";
import { parseNdJson } from "./parseNdJson.js";

describe("lageserver", () => {
  it("connects to a running server", async () => {
    const repo = new Monorepo("basics");

    repo.init();
    repo.addPackage("a", ["b"]);
    repo.addPackage("b");

    repo.install();

    const serverProcess = repo.runServer();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const results = repo.run("lage", ["exec", "--server", "--tasks", "build", "--", "a", "build"]);
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    serverProcess.kill();

    expect(jsonOutput.find((entry) => entry.data?.target?.id === "a#build" && entry.msg === "Finished")).toBeTruthy();
    await repo.cleanup();
  });

  it("launches a background server", async () => {
    const repo = new Monorepo("basics");

    repo.init();
    repo.addPackage("a", ["b"]);
    repo.addPackage("b");

    repo.install();

    const results = repo.run("lage", ["exec", "a", "build", "--tasks", "build", "--server", "localhost:5112", "--timeout", "2"]);
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);
    const started = jsonOutput.find((entry) => entry.data?.pid && entry.msg === "Server started");
    expect(started?.data.pid).not.toBeUndefined();

    try {
      process.kill(parseInt(started?.data.pid));
    } catch (e) {
      // ignore if cannot kill this
    }

    await repo.cleanup();
  });

  it("reports inputs for targets and their dependencies' files", async () => {
    const repo = new Monorepo("basics");

    repo.init();

    repo.addPackage("a", ["b"]);
    repo.addPackage("b");

    repo.install();

    repo.commitFiles({
      "packages/a/src/index.ts": "console.log('a');",
      "packages/a/extra.ts": "console.log('a');",
      "packages/b/alt/index.ts": "console.log('b');",
      "packages/b/src/extra.ts": "console.log('b');",
    });

    repo.setLageConfig(
      `module.exports = {
        pipeline: {
          "a#build": {
            inputs: ["src/**"],
            dependsOn: ["^build"],
          },

          "b#build": {
            inputs: ["alt/**"],
            dependsOn: ["^build"],
          },
        },
      };`
    );

    const results = repo.run("lage", [
      "exec",
      "a",
      "build",
      "--tasks",
      "build",
      "--server",
      "localhost:5111",
      "--timeout",
      "2",
      "--reporter",
      "json",
    ]);

    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);
    const started = jsonOutput.find((entry) => entry.data?.pid && entry.msg === "Server started");
    expect(started?.data.pid).not.toBeUndefined();

    try {
      process.kill(parseInt(started?.data.pid));
    } catch (e) {
      // ignore if cannot kill this
    }

    const inputs = jsonOutput.filter((entry) => entry.data?.inputs);
    expect(inputs).toHaveLength(2);
    expect(inputs.find((entry) => entry.data?.inputs.includes("src/index.ts"))).toBeGreaterThan(0);
    expect(inputs.find((entry) => entry.data?.inputs.includes("extra.ts"))).toBeLessThan(0);
    expect(inputs.find((entry) => entry.data?.inputs.includes("alt/index.ts"))).toBeGreaterThan(0);
    expect(inputs.find((entry) => entry.data?.inputs.includes("src/extra.ts"))).toBeLessThan(0);

    await repo.cleanup();
  });
});
