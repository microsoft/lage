import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    repo: { type: "string" },
    cli: { type: "string", default: fileURLToPath(new URL("../packages/lage/dist/lage.js", import.meta.url)) },
    runs: { type: "string", default: "3" },
    warmup: { type: "string", default: "1" },
    "max-seconds": { type: "string", default: "5" },
    "expected-targets": { type: "string" },
    native: { type: "string" },
    output: { type: "string" },
  },
});

if (!values.repo) {
  throw new Error("Usage: node benchmark/cache-hit.mjs --repo <repository> [--max-seconds 5] [--output <external JSON file>]");
}

const repo = path.resolve(values.repo);
const cli = path.resolve(values.cli);
const runs = Number(values.runs);
const warmup = Number(values.warmup);
const maxSeconds = Number(values["max-seconds"]);
let expectedTargets = values["expected-targets"] === undefined ? undefined : Number(values["expected-targets"]);
const nativeValidation = values.native ?? process.env.BACKFILL_CACHE_NATIVE ?? "auto";

if (!["auto", "0", "1", "false", "true"].includes(nativeValidation)) {
  throw new Error("native must be auto, 0/false (JavaScript), or 1/true (require Rust).");
}

if (
  !Number.isInteger(runs) ||
  runs < 1 ||
  !Number.isInteger(warmup) ||
  warmup < 0 ||
  !Number.isFinite(maxSeconds) ||
  maxSeconds <= 0 ||
  (expectedTargets !== undefined && (!Number.isInteger(expectedTargets) || expectedTargets < 1))
) {
  throw new Error("runs and expected-targets must be positive integers, warmup a nonnegative integer, and max-seconds positive.");
}

if (values.output) {
  const relative = path.relative(repo, path.resolve(values.output));
  if (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative)) {
    throw new Error("Write benchmark results outside the measured repository so they cannot invalidate its cache.");
  }
}

function fileHash(filename) {
  return createHash("sha256").update(fs.readFileSync(filename)).digest("hex");
}

function nativeArtifact() {
  const filename = `cache-validator-${process.platform}-${process.arch}.node`;
  for (const directory of [path.dirname(cli), path.dirname(path.dirname(cli))]) {
    const candidate = path.join(directory, "native", filename);
    if (fs.existsSync(candidate)) {
      return { path: candidate, sha256: fileHash(candidate) };
    }
  }
  return null;
}

const cliSha256 = fileHash(cli);
const nativeBinary = nativeArtifact();

function runBuild() {
  const start = performance.now();
  const result = spawnSync(process.execPath, [cli, "run", "build", "--reporter", "json", "--log-level", "error"], {
    cwd: repo,
    env: { ...process.env, BACKFILL_CACHE_NATIVE: nativeValidation },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
  const seconds = (performance.now() - start) / 1000;
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Build failed (${result.signal || result.status}):\n${result.stdout}\n${result.stderr}`);
  }
  const summaryLine = result.stdout.split(/\r?\n/).findLast((line) => line.startsWith('{"summary":'));
  if (!summaryLine) {
    throw new Error(`Build did not emit a JSON summary:\n${result.stdout}\n${result.stderr}`);
  }
  const { summary } = JSON.parse(summaryLine);
  if (fileHash(cli) !== cliSha256 || JSON.stringify(nativeArtifact()) !== JSON.stringify(nativeBinary)) {
    throw new Error("CLI or native binary changed during the benchmark; rerun with stable build artifacts.");
  }
  const counts = Object.fromEntries(Object.entries(summary).filter(([key]) => key.endsWith("Targets")));
  const targets = Object.values(counts).reduce((sum, count) => sum + count, 0);
  if (!targets || (expectedTargets !== undefined && targets !== expectedTargets)) {
    throw new Error(`Unexpected target count: ${targets}; expected ${expectedTargets ?? "at least one"}.`);
  }
  expectedTargets ??= targets;
  return { seconds, schedulerSeconds: Number(summary.duration), targets, counts };
}

const warmups = Array.from({ length: warmup }, runBuild);
const measurements = Array.from({ length: runs }, runBuild);
const allCached = measurements.every(({ counts }) => counts.skippedTargets === expectedTargets);
const worstSeconds = Math.max(...measurements.map(({ seconds }) => seconds));
const report = {
  repo,
  cli,
  cliSha256,
  nativeBinary,
  node: process.version,
  requestedNativeValidation: nativeValidation,
  command: [process.execPath, cli, "run", "build", "--reporter", "json", "--log-level", "error"],
  expectedTargets,
  maxSeconds,
  allCached,
  worstSeconds,
  passed: allCached && worstSeconds <= maxSeconds,
  warmups,
  measurements,
};

const json = JSON.stringify(report, null, 2);
if (values.output) {
  fs.writeFileSync(path.resolve(values.output), `${json}\n`);
}
console.log(json);
if (!report.passed) {
  process.exitCode = 1;
}
