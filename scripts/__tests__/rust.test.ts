import { afterEach, describe, expect, it, jest } from "@jest/globals";
import fs from "fs";
import os from "os";
import path from "path";
import { mockCIEnv } from "../isCI.js";
import { nativeTargets, hostTarget } from "../rust/constants.js";
import { copyBinding, syncGeneratedBindings, assembleArtifacts } from "../commands/rust.js";

let roots: string[] = [];

/**
 * Mimic this repo's `glob-hasher*` package layout, including mock `*.node` binding files in `glob-hasher`.
 * Return the repo root and register it for cleanup in afterEach.
 */
function createFixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "native-packages-"));
  roots.push(root);
  const wrapper = path.join(root, "packages/glob-hasher");
  fs.mkdirSync(wrapper, { recursive: true });
  fs.writeFileSync(
    path.join(wrapper, "package.json"),
    JSON.stringify({
      name: "glob-hasher",
      optionalDependencies: Object.fromEntries(nativeTargets.map(({ suffix }) => [`glob-hasher-${suffix}`, "workspace:*"])),
    })
  );
  for (const { suffix } of nativeTargets) {
    const directory = path.join(root, "packages/glob-hasher-native", `glob-hasher-${suffix}`);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(
      path.join(directory, "package.json"),
      JSON.stringify({ name: `glob-hasher-${suffix}`, main: `glob-hasher.${suffix}.node`, files: ["*.node"] })
    );
    fs.writeFileSync(path.join(wrapper, `glob-hasher.${suffix}.node`), `binding for ${suffix}`);
  }
  return root;
}

afterEach(() => {
  jest.restoreAllMocks();
  for (const root of roots) {
    fs.rmSync(root, { recursive: true, force: true });
  }
  roots = [];
});

describe("native binding copies", () => {
  it.each(nativeTargets)("copies the $suffix binding into its package", ({ suffix }) => {
    const root = createFixture();
    const directory = path.join(root, "packages/glob-hasher-native", `glob-hasher-${suffix}`);
    expect(copyBinding(directory, root)).toBe(true);
    expect(fs.readFileSync(path.join(directory, `glob-hasher.${suffix}.node`), "utf8")).toBe(`binding for ${suffix}`);
  });

  it.each([
    { scenario: "leaves an unbuilt package empty", existing: false },
    { scenario: "preserves an assembled binding", existing: true },
  ])("$scenario when the source binding is absent", ({ existing }) => {
    const root = createFixture();
    const { suffix } = nativeTargets[0];
    const filename = `glob-hasher.${suffix}.node`;
    const directory = path.join(root, "packages/glob-hasher-native", `glob-hasher-${suffix}`);
    const destination = path.join(directory, filename);
    fs.rmSync(path.join(root, "packages/glob-hasher", filename));
    if (existing) {
      fs.writeFileSync(destination, "assembled binding");
    }
    expect(copyBinding(directory, root)).toBe(false);
    if (existing) {
      expect(fs.readFileSync(destination, "utf8")).toBe("assembled binding");
    } else {
      expect(fs.existsSync(destination)).toBe(false);
    }
  });
});

describe("generated bindings", () => {
  it.each([
    { scenario: "updates changed bindings locally", ci: "", checkedIn: "old\n", generated: "new\n", updates: true },
    { scenario: "leaves matching bindings untouched locally", ci: "", checkedIn: "same\n", generated: "same\n", updates: false },
    { scenario: "ignores checkout line endings locally", ci: "", checkedIn: "same\r\n", generated: "same\n", updates: false },
    { scenario: "accepts matching bindings in CI", ci: "1", checkedIn: "same\n", generated: "same\n", updates: false },
    { scenario: "ignores checkout line endings in CI", ci: "1", checkedIn: "same\r\n", generated: "same\n", updates: false },
  ])("$scenario", ({ ci, checkedIn, generated, updates }) => {
    const root = createFixture();
    const directory = path.join(root, "packages/glob-hasher");
    fs.mkdirSync(path.join(directory, "temp"));
    for (const filename of ["index.js", "index.d.ts"]) {
      fs.writeFileSync(path.join(directory, filename), checkedIn);
      fs.writeFileSync(path.join(directory, "temp", filename), generated);
    }
    jest.replaceProperty(process, "env", { ...process.env, ...mockCIEnv(ci) });
    const write = jest.spyOn(fs, "writeFileSync");
    syncGeneratedBindings(directory);
    expect(write).toHaveBeenCalledTimes(updates ? 2 : 0);
    for (const filename of ["index.js", "index.d.ts"]) {
      expect(fs.readFileSync(path.join(directory, filename), "utf8")).toBe(updates ? generated : checkedIn);
    }
  });

  it.each(["index.js", "index.d.ts"])("rejects changed %s in CI without rewriting either binding", (changed) => {
    const root = createFixture();
    const directory = path.join(root, "packages/glob-hasher");
    fs.mkdirSync(path.join(directory, "temp"));
    for (const filename of ["index.js", "index.d.ts"]) {
      fs.writeFileSync(path.join(directory, filename), filename === changed ? "old\n" : "same\n");
      fs.writeFileSync(path.join(directory, "temp", filename), "same\n");
    }
    jest.replaceProperty(process, "env", { ...process.env, ...mockCIEnv("1") });
    const write = jest.spyOn(fs, "writeFileSync");
    expect(() => syncGeneratedBindings(directory)).toThrow(`Generated ${changed} changed`);
    expect(write).not.toHaveBeenCalled();
    for (const filename of ["index.js", "index.d.ts"]) {
      expect(fs.readFileSync(path.join(directory, filename), "utf8")).toBe(filename === changed ? "old\n" : "same\n");
    }
  });
});

describe("native host targets", () => {
  it.each([
    { scenario: "x64 glibc", arch: "x64", glibcVersionRuntime: "2.17", suffix: "linux-x64-gnu" },
    { scenario: "ARM64 glibc", arch: "arm64", glibcVersionRuntime: "2.17", suffix: "linux-arm64-gnu" },
    { scenario: "x64 musl", arch: "x64", glibcVersionRuntime: undefined, suffix: "linux-x64-musl" },
  ])("selects the $scenario package on Linux", ({ arch, glibcVersionRuntime, suffix }) => {
    const target = hostTarget({
      platform: "linux",
      arch,
      report: { getReport: () => ({ header: { glibcVersionRuntime } }) },
    });
    expect(target.suffix).toBe(suffix);
  });

  it("rejects unpublished ARM64 musl hosts", () => {
    expect(() =>
      hostTarget({
        platform: "linux",
        arch: "arm64",
        report: { getReport: () => ({ header: {} }) },
      })
    ).toThrow("Unsupported native host: linux-arm64-musl");
  });
});

describe("native build artifacts", () => {
  it("keeps NAPI targets and optional dependency names aligned", () => {
    const root = path.resolve(__dirname, "../..");
    const wrapper = JSON.parse(fs.readFileSync(path.join(root, "packages/glob-hasher/package.json"), "utf8"));
    expect(wrapper.engines.node).toBe(">=22.18.0");
    expect(wrapper.napi.binaryName).toBe("glob-hasher");
    expect(wrapper.napi.targets.sort()).toEqual(nativeTargets.map(({ triple }) => triple).sort());
    expect(Object.keys(wrapper.optionalDependencies).sort()).toEqual(nativeTargets.map(({ suffix }) => `glob-hasher-${suffix}`).sort());
    for (const { suffix } of nativeTargets) {
      const manifest = JSON.parse(
        fs.readFileSync(path.join(root, "packages/glob-hasher-native", `glob-hasher-${suffix}`, "package.json"), "utf8")
      );
      expect(manifest.engines.node).toBe(wrapper.engines.node);
      expect(manifest.scripts.build).toBe("monorepo-scripts rust copy");
      expect(manifest.scripts.test).toBeUndefined();
      expect(manifest.devDependencies["@lage-run/monorepo-scripts"]).toBe("workspace:^");
    }
  });

  it("assembles all supported targets into nested platform packages and restores the host binding", () => {
    const root = createFixture();
    const artifacts = path.join(root, "artifacts");
    for (const { triple, suffix } of nativeTargets) {
      const directory = path.join(artifacts, `glob-hasher-${triple}`);
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(path.join(directory, `glob-hasher.${suffix}.node`), `binding for ${suffix}`);
    }
    const hostBinding = path.join(root, "packages/glob-hasher", `glob-hasher.${hostTarget().suffix}.node`);
    fs.rmSync(hostBinding);
    assembleArtifacts(root, artifacts);
    expect(fs.readFileSync(hostBinding, "utf8")).toBe(`binding for ${hostTarget().suffix}`);
    for (const { suffix } of nativeTargets) {
      const directory = path.join(root, "packages/glob-hasher-native", `glob-hasher-${suffix}`);
      expect(fs.readFileSync(path.join(directory, `glob-hasher.${suffix}.node`), "utf8")).toBe(`binding for ${suffix}`);
    }
  });

  it("rejects a missing musl artifact before staging any binary", () => {
    const root = createFixture();
    const artifacts = path.join(root, "artifacts");
    for (const { triple, suffix } of nativeTargets.filter((target) => target.suffix !== "linux-x64-musl")) {
      const directory = path.join(artifacts, `glob-hasher-${triple}`);
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(path.join(directory, `glob-hasher.${suffix}.node`), `binding for ${suffix}`);
    }
    expect(() => assembleArtifacts(root, artifacts)).toThrow(/ENOENT/);
    expect(fs.existsSync(path.join(root, "packages/glob-hasher-native/glob-hasher-darwin-x64/glob-hasher.darwin-x64.node"))).toBe(false);
  });
});
