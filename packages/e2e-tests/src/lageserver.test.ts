import path from "path";
import { Monorepo } from "./mock/monorepo.js";
import { parseNdJson } from "./parseNdJson.js";
import fs from "fs";

describe("lageserver", () => {
  it("connects to a running server", async () => {
    const repo = new Monorepo("basics");

    repo.init();
    repo.addPackage("a", ["b"]);
    repo.addPackage("b");

    repo.install();

    const serverProcess = repo.runServer(["build"]);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const results = repo.run("lage", ["exec", "--server", "--tasks", "build", "--", "a", "build"]);
    const output = results.stdout + results.stderr;

    const jsonOutput = parseNdJson(output);

    serverProcess.kill();

    expect(jsonOutput.find((entry) => entry.msg === "Task a build exited with code 0")).toBeTruthy();
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
      "packages/a/alt/extra.ts": "console.log('a');",
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
      "b",
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

    repo.run("lage", ["exec", "a", "build", "--tasks", "build", "--server", "localhost:5111", "--timeout", "2", "--reporter", "json"]);

    try {
      process.kill(parseInt(started?.data.pid));
    } catch (e) {
      // ignore if cannot kill this
    }

    const serverLogs = fs.readFileSync(path.join(repo.root, "node_modules/.cache/lage/server.log"), "utf-8");

    const lines = serverLogs.split("\n");
    let aResults: any;
    let bResults: any;

    lines.forEach((line, index) => {
      if (line.includes("a#build results:")) {
        // scan the next few lines until we see a "}", and then parse the JSON
        const endToken = "}";
        const endTokenLine = lines.findIndex((line, i) => i > index && line.startsWith(endToken));
        aResults = JSON.parse(lines.slice(index + 1, endTokenLine + 1).join("\n"));
      }

      if (line.includes("b#build results:")) {
        const endToken = "}";
        const endTokenLine = lines.findIndex((line, i) => i > index && line.startsWith(endToken));
        bResults = JSON.parse(lines.slice(index + 1, endTokenLine + 1).join("\n"));
      }
    });

    expect(aResults.inputs.find((input) => input === "packages/a/src/index.ts")).toBeTruthy();
    expect(aResults.inputs.find((input) => input === "packages/a/alt/extra.ts")).toBeUndefined();
    expect(bResults.inputs.find((input) => input === "packages/b/src/extra.ts")).toBeUndefined();
    expect(bResults.inputs.find((input) => input === "packages/b/alt/index.ts")).toBeTruthy();

    await repo.cleanup();
  }, 20000);
});
