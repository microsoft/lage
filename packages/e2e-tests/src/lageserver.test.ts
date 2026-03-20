import path from "path";
import { Monorepo } from "./mock/monorepo.js";
import { parseNdJson, type ParsedLogEntry } from "./parseNdJson.js";
import fs from "fs";
import { killDetachedProcess, killProcessesOnPort } from "./killDetachedProcess.js";
import type { Target } from "@lage-run/target-graph";
import type { TargetMessageData } from "@lage-run/reporters";
import type { LogEntry } from "@lage-run/logger";
import type execa from "execa";

describe("lageserver", () => {
  let repo: Monorepo | undefined;
  let serverProcess: execa.ExecaChildProcess | undefined;
  let serverPid: number | undefined;
  /** Port to start the server on for this test */
  let port = 5111;

  /**
   * Run `lage exec --server localhost:<port> <args...>` with the current test's port.
   */
  function execOnServer(...args: string[]) {
    return repo!.run("lage", ["exec", "--server", `localhost:${port}`, ...args]);
  }

  function findServerPid(jsonOutput: ParsedLogEntry[]) {
    const entry = jsonOutput.find((e) => (e.data as TargetMessageData)?.pid && e.msg === "Server started") as
      | LogEntry<TargetMessageData>
      | undefined;
    return entry?.data?.pid;
  }

  beforeEach(async () => {
    // Increment the port so every test gets a unique port.
    // NOTE: If multiple test files start using servers, it will need to be coordinated.
    port++;
    // In case any processes were left over (shouldn't happen with current cleanup), kill them
    if (await killProcessesOnPort(port)) {
      // Wait a bit for the processes to release the ports
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  });

  afterEach(async () => {
    await repo?.cleanup();
    repo = undefined;
    serverProcess?.kill();
    serverProcess = undefined;
    serverPid && killDetachedProcess(serverPid);
    serverPid = undefined;

    // Backup kill the server in case the above didn't work (ignores if the process is already dead).
    // Otherwise there can be weird results running tests locally.
    await killProcessesOnPort(port);
  });

  it("connects to a running server", async () => {
    repo = new Monorepo("basics");

    await repo.init({
      packages: { a: { internalDeps: ["b"] }, b: {} },
    });
    repo.install();

    serverProcess = repo.runServer(["build"], port);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const results = await execOnServer("--tasks", "build", "--", "b", "build");

    const jsonOutput = parseNdJson(results.stdout, results.stderr);

    await execOnServer("--tasks", "build", "--", "a", "build");

    serverProcess.kill();
    serverProcess = undefined;

    expect(jsonOutput.find((entry) => entry.msg === "Task b build exited with code 0")).toBeTruthy();
  });

  it("launches a background server", async () => {
    repo = new Monorepo("basics");

    await repo.init({
      packages: { a: { internalDeps: ["b"] }, b: {} },
    });
    repo.install();

    const results = await execOnServer("--tasks", "build", "--", "b", "build");

    const jsonOutput = parseNdJson(results.stdout, results.stderr);
    serverPid = findServerPid(jsonOutput);
  });

  it("reports inputs for targets and their transitive dependencies' files", async () => {
    repo = new Monorepo("basics");

    await repo.init({
      lageConfig: {
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
      },
      packages: {
        a: { internalDeps: ["b"], extraFiles: { "src/index.ts": "console.log('a');", "alt/extra.ts": "console.log('a');" } },
        b: { internalDeps: ["c"], extraFiles: { "alt/index.ts": "console.log('b');", "src/extra.ts": "console.log('b');" } },
        c: { extraFiles: { "src/index.ts": "console.log('c');", "alt/extra.ts": "console.log('c');" } },
      },
      extraFiles: {},
    });
    repo.install();

    const results = await execOnServer("c", "build", "--tasks", "build", "--timeout", "60", "--reporter", "json");

    const jsonOutput = parseNdJson(results.stdout, results.stderr);
    serverPid = findServerPid(jsonOutput);

    await execOnServer("b", "build", "--tasks", "build", "--timeout", "60", "--reporter", "json");
    await execOnServer("a", "build", "--tasks", "build", "--timeout", "60", "--reporter", "json");

    if (serverPid) {
      killDetachedProcess(serverPid);
    } else {
      await killProcessesOnPort(port);
    }

    const serverLogs = fs.readFileSync(path.join(repo.root, "node_modules/.cache/lage/server.log"), "utf-8");

    const lines = serverLogs.split("\n");
    let aResults: Target;
    let bResults: Target;

    lines.forEach((line, index) => {
      if (line.includes("a#build results:")) {
        // scan the next few lines until we see a "}", and then parse the JSON
        const endTokenLine = lines.findIndex((ln, i) => i > index && ln.startsWith("}"));
        aResults = JSON.parse(lines.slice(index + 1, endTokenLine + 1).join("\n"));
      }

      if (line.includes("b#build results:")) {
        const endTokenLine = lines.findIndex((ln, i) => i > index && ln.startsWith("}"));
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
