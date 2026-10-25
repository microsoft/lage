import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import fs from "fs";
import path from "path";
import { Monorepo } from "./mock/monorepo.js";
import { getStatusEntriesData, parseNdJson } from "./parseNdJson.js";

const packageNames = ["a", "b"];
const outputFiles = packageNames.flatMap((name) =>
  ["output.txt", path.join("nested", "output.txt")].map((file) => path.join("packages", name, "dist", file))
);
const nativeBinary = path.resolve(
  __dirname,
  "..",
  "..",
  "lage",
  "dist",
  "native",
  `cache-validator-${process.platform}-${process.arch}.node`
);
const primaryMode = fs.existsSync(nativeBinary) ? "1" : "0";
const modes: ("0" | "1")[] = primaryMode === "1" ? ["0", "1"] : ["0"];

const buildScript = `
import fs from "node:fs";
import path from "node:path";

const { name } = JSON.parse(fs.readFileSync("package.json", "utf8"));
const source = fs.readFileSync(path.join("src", "input.txt"), "utf8");
const dependency = name === "a" ? ":" + fs.readFileSync(path.join("..", "b", "dist", "output.txt"), "utf8") : "";
const output = source + dependency;
fs.mkdirSync(path.join("dist", "nested"), { recursive: true });
for (const file of [path.join("dist", "output.txt"), path.join("dist", "nested", "output.txt")]) {
  fs.writeFileSync(file, output);
  // A fixed subsecond mtime makes output rewrites observable without timing sleeps.
  const timestamp = new Date("2001-02-03T04:05:06.789Z");
  fs.utimesSync(file, timestamp, timestamp);
}
fs.appendFileSync("build-runs.txt", "build\\n");
`;

describe("materialized local cache outputs", () => {
  let repo: Monorepo;

  beforeEach(async () => {
    repo = new Monorepo("local-cache-outputs");
    await repo.init({
      lageConfig: {
        npmClient: "npm",
        pipeline: {
          build: {
            dependsOn: ["^build"],
            inputs: ["src/**", "build.mjs", "package.json"],
            outputs: ["dist/**"],
          },
          test: {
            dependsOn: ["build"],
            inputs: ["src/**", "test.mjs", "package.json"],
            cache: false,
          },
        },
        cacheOptions: {
          environmentGlob: ["lage.config.js", "package.json", "yarn.lock"],
        },
        repoWideChanges: ["lage.config.js", "package.json", "yarn.lock"],
      },
      extraFiles: {
        // Keep repo-local fixtures independent of the surrounding Yarn project.
        "yarn.lock": "",
        ".gitignore": ["node_modules", ".yarn", "dist", "build-runs.txt", "test-runs.txt"].join("\n"),
      },
      packages: Object.fromEntries(
        packageNames.map((name) => [
          name,
          {
            internalDeps: name === "a" ? ["b"] : [],
            scripts: { build: "node build.mjs", test: "node test.mjs" },
            extraFiles: {
              "build.mjs": buildScript,
              "test.mjs": `import fs from "node:fs"; fs.appendFileSync("test-runs.txt", "test\\n");`,
              [path.join("src", "input.txt")]: `${name}1`,
            },
          },
        ])
      ),
    });
    const rootPackage = JSON.parse(repo.readFiles(["package.json"])["package.json"]);
    repo.writeFiles({ "package.json": { ...rootPackage, engines: { node: process.versions.node } } });
    repo.install();
  });

  afterEach(async () => {
    await repo?.cleanup();
  });

  async function run(mode: "0" | "1", task = "build", args: string[] = []) {
    // CI normally defaults to --skip-local-cache; these cases explicitly exercise local caching.
    const result = await repo.run(task, ["--concurrency", "2", ...args], false, {
      env: { CI: "", TF_BUILD: "", BACKFILL_CACHE_NATIVE: mode },
    });
    expect(result.exitCode).toBe(0);
    return getStatusEntriesData(parseNdJson(result.stdout, result.stderr));
  }

  function expectStatus(entries: ReturnType<typeof getStatusEntriesData>, status: "success" | "skipped", task = "build") {
    for (const packageName of packageNames) {
      expect(entries).toContainEqual({ target: { packageName, task }, status });
    }
  }

  function runCounts(task = "build") {
    return packageNames.map(
      (name) => fs.readFileSync(path.join(repo.root, "packages", name, `${task}-runs.txt`), "utf8").split("\n").length - 1
    );
  }

  function expectOutputs(a: string, b: string) {
    expect(Object.values(repo.readFiles(outputFiles))).toEqual([a, a, b, b]);
  }

  function outputTimes() {
    return outputFiles.map((file) => {
      const { mtimeMs, ctimeMs } = fs.statSync(path.join(repo.root, file));
      return { mtimeMs, ctimeMs };
    });
  }

  it("reuses intact outputs, repairs cache damage and rebuilds affected dependents", async () => {
    expectStatus(await run(primaryMode), "success");
    expectOutputs("a1:b1", "b1");
    expect(runCounts()).toEqual([1, 1]);

    const builtTimes = outputTimes();
    for (const mode of modes) {
      expectStatus(await run(mode), "skipped");
    }
    expect(outputTimes()).toEqual(builtTimes);
    expect(runCounts()).toEqual([1, 1]);

    fs.unlinkSync(path.join(repo.root, outputFiles[0]));
    const damagedFile = path.join(repo.root, outputFiles[3]);
    const beforeDamage = fs.statSync(damagedFile);
    fs.writeFileSync(damagedFile, "x".repeat(beforeDamage.size));
    fs.utimesSync(damagedFile, beforeDamage.atime, beforeDamage.mtime);
    expect(fs.statSync(damagedFile).size).toBe(beforeDamage.size);
    expect(fs.statSync(damagedFile).mtimeMs).toBe(beforeDamage.mtimeMs);

    expectStatus(await run(primaryMode), "skipped");
    expectOutputs("a1:b1", "b1");
    expect(runCounts()).toEqual([1, 1]);
    const restoredTimes = outputTimes();

    expectStatus(await run(primaryMode), "skipped");
    expect(outputTimes()).toEqual(restoredTimes);
    expect(runCounts()).toEqual([1, 1]);

    repo.writeFiles({ [path.join("packages", "b", "src", "input.txt")]: "b2" });
    expectStatus(await run(primaryMode), "success");
    expectOutputs("a1:b2", "b2");
    expect(runCounts()).toEqual([2, 2]);
    const afterDependencyChangeTimes = outputTimes();

    repo.writeFiles({ [path.join("packages", "a", "src", "input.txt")]: "a2" });
    const changedDependent = await run(primaryMode);
    expect(changedDependent).toContainEqual({ target: { packageName: "a", task: "build" }, status: "success" });
    expect(changedDependent).toContainEqual({ target: { packageName: "b", task: "build" }, status: "skipped" });
    expectOutputs("a2:b2", "b2");
    expect(runCounts()).toEqual([3, 2]);
    expect(outputTimes().slice(2)).toEqual(afterDependencyChangeTimes.slice(2));

    const rebuiltTimes = outputTimes();
    expectStatus(await run(primaryMode), "skipped");
    expect(outputTimes()).toEqual(rebuiltTimes);
    expect(runCounts()).toEqual([3, 2]);
  }, 120_000);

  it("covers warm-cache flags in one fixture while preserving cache-disabled task behavior", async () => {
    expectStatus(await run(primaryMode), "success");
    expect(runCounts()).toEqual([1, 1]);

    const builtTimes = outputTimes();
    const repeated = await run(primaryMode, "test");
    expectStatus(repeated, "skipped");
    expectStatus(repeated, "success", "test");
    expect(runCounts()).toEqual([1, 1]);
    expect(runCounts("test")).toEqual([1, 1]);

    const repeatedTest = await run(primaryMode, "test");
    expectStatus(repeatedTest, "skipped");
    expectStatus(repeatedTest, "success", "test");
    expect(outputTimes()).toEqual(builtTimes);
    expect(runCounts()).toEqual([1, 1]);
    expect(runCounts("test")).toEqual([2, 2]);

    let builds = 1;
    for (const flag of ["--reset-cache", "--no-cache", "--skip-local-cache"]) {
      expectStatus(await run(primaryMode, "build", [flag]), "success");
      builds++;
      expect(runCounts()).toEqual([builds, builds]);
      expectOutputs("a1:b1", "b1");

      expectStatus(await run(primaryMode), "skipped");
      expect(runCounts()).toEqual([builds, builds]);
      expectOutputs("a1:b1", "b1");
    }
  }, 120_000);
});
