import path from "path";
import { Monorepo } from "./mock/monorepo.js";
import { parseNdJson } from "./parseNdJson.js";
import fs from "fs";
import { killDetachedProcess } from "./killDetachedProcess.js";
import type { Target } from "@lage-run/target-graph";

describe("lageserver", () => {
  let repo: Monorepo | undefined;

  afterEach(async () => {
    await repo?.cleanup();
    repo = undefined;
  });

  it("connects to a running server", async () => {
    repo = new Monorepo("basics");

    repo.init();
    repo.addPackage("a", ["b"]);
    repo.addPackage("b");

    repo.install();

    const serverProcess = repo.runServer(["build"]);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const results = repo.run("lage", ["exec", "--server", "--tasks", "build", "--", "b", "build"]);
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    repo.run("lage", ["exec", "--server", "--tasks", "build", "--", "a", "build"]);

    serverProcess.kill();

    expect(jsonOutput.find((entry) => entry.msg === "Task b build exited with code 0")).toBeTruthy();
  }, 15000);

  // Windows cannot reliably kill the server process, since it's detached. These tests are skipped on Windows.
  it("launches a background server", async () => {
    repo = new Monorepo("basics");

    repo.init();
    repo.addPackage("a", ["b"]);
    repo.addPackage("b");

    repo.install();

    const results = repo.run("lage", ["exec", "--server", "localhost:5112", "--tasks", "build", "--", "b", "build"]);
    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);
    const started = jsonOutput.find((entry) => entry.data?.pid && entry.msg === "Server started");
    expect(started?.data.pid).not.toBeUndefined();

    await new Promise((resolve) => setTimeout(resolve, 2000));
    killDetachedProcess(parseInt(started?.data.pid));
  }, 15000);

  it("reports inputs for targets and their transitive dependencies' files", async () => {
    repo = new Monorepo("basics");

    repo.init();

    repo.addPackage("a", ["b"]);
    repo.addPackage("b", ["c"]);
    repo.addPackage("c");

    repo.install();

    repo.commitFiles({
      "packages/a/src/index.ts": "console.log('a');",
      "packages/a/alt/extra.ts": "console.log('a');",
      "packages/b/alt/index.ts": "console.log('b');",
      "packages/b/src/extra.ts": "console.log('b');",
      "packages/c/src/index.ts": "console.log('c');",
      "packages/c/alt/extra.ts": "console.log('c');",
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
            "c#build": {
              inputs: ["src/**"],
              dependsOn: ["^build"],
            },
          },
        };`
    );

    const results = repo.run("lage", [
      "exec",
      "c",
      "build",
      "--tasks",
      "build",
      "--server",
      "localhost:5111",
      "--timeout",
      "60",
      "--reporter",
      "json",
    ]);

    const output = results.stdout + results.stderr;

    const jsonOutput = parseNdJson(output);
    const started = jsonOutput.find((entry) => entry.data?.pid && entry.msg === "Server started");
    expect(started?.data.pid).not.toBeUndefined();

    repo.run("lage", ["exec", "b", "build", "--tasks", "build", "--server", "localhost:5111", "--timeout", "60", "--reporter", "json"]);
    repo.run("lage", ["exec", "a", "build", "--tasks", "build", "--server", "localhost:5111", "--timeout", "60", "--reporter", "json"]);

    killDetachedProcess(parseInt(started?.data.pid));

    const serverLogs = fs.readFileSync(path.join(repo.root, "node_modules/.cache/lage/server.log"), "utf-8");

    const lines = serverLogs.split("\n");
    let aResults: Target;
    let bResults: Target;

    lines.forEach((line, index) => {
      if (line.includes("a#build results:")) {
        // scan the next few lines until we see a "}", and then parse the JSON
        const endTokenLine = lines.findIndex((line, i) => i > index && line.startsWith("}"));
        aResults = JSON.parse(lines.slice(index + 1, endTokenLine + 1).join("\n"));
      }

      if (line.includes("b#build results:")) {
        const endTokenLine = lines.findIndex((line, i) => i > index && line.startsWith("}"));
        bResults = JSON.parse(lines.slice(index + 1, endTokenLine + 1).join("\n"));
      }
    });

    expect(aResults!).toBeTruthy();
    expect(aResults!.inputs).toContain("packages/a/src/index.ts");
    expect(aResults!.inputs).toContain("packages/b/node_modules/.lage/hash_build");
    expect(aResults!.inputs).not.toContain("packages/c/node_modules/.lage/hash_build");
    expect(aResults!.inputs).not.toContain("packages/a/alt/extra.ts");

    expect(aResults!.outputs).toContain("packages/a/node_modules/.lage/hash_build");

    expect(bResults!).toBeTruthy();
    expect(bResults!.inputs).not.toContain("packages/b/src/extra.ts");
    expect(bResults!.inputs).toContain("packages/b/alt/index.ts");
    expect(bResults!.inputs).toContain("packages/c/node_modules/.lage/hash_build");

    expect(bResults!.outputs).toContain("packages/b/node_modules/.lage/hash_build");
  }, 400000);
});
