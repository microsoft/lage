import { describe, expect, it } from "@jest/globals";
import fs from "fs";
import path from "path";
import { parsePnpmLockfileGraph, diffPackageSignatures, mapImporterSignaturesToPackages } from "../loadLockfileGraph.js";
import { isSupportedPnpmLockfileVersion } from "../pnpmLockfileGraph.js";
import type { LockfileGraph } from "../types.js";

const fixturesDir = path.join(__dirname, "..", "__fixtures__");

function readFixture(name: string): string {
  return fs.readFileSync(path.join(fixturesDir, `${name}.yaml`), "utf8");
}

function graphOf(name: string): LockfileGraph {
  const result = parsePnpmLockfileGraph(readFixture(name));
  if (result.status !== "success") {
    throw new Error(`Expected success but got: ${JSON.stringify(result)}`);
  }
  return result.graph;
}

describe("isSupportedPnpmLockfileVersion", () => {
  it.each([
    ["9.0", true],
    ["9.1", true],
    [9, true],
    ["6.0", false],
    ["5.4", false],
    ["8.0", false],
    [undefined, false],
  ])("returns %s -> %s", (version, expected) => {
    expect(isSupportedPnpmLockfileVersion(version as string | number | undefined)).toBe(expected);
  });
});

describe("parsePnpmLockfileGraph", () => {
  it("parses a valid v9 lockfile and produces per-importer signatures", () => {
    const graph = graphOf("pnpm-lock-base");
    expect([...graph.importerSignatures.keys()].sort()).toEqual([".", "packages/a", "packages/b", "packages/c"]);
    for (const signature of graph.importerSignatures.values()) {
      expect(signature).toMatch(/^[a-f0-9]{40}$/);
    }
  });

  it("returns 'unsupported' for an older lockfile version", () => {
    const result = parsePnpmLockfileGraph("lockfileVersion: '5.4'\ndependencies: {}\n");
    expect(result.status).toBe("unsupported");
    if (result.status === "unsupported") {
      expect(result.reason).toContain("5.4");
    }
  });

  it("returns 'unsupported' for malformed content", () => {
    const result = parsePnpmLockfileGraph(":\n  : not yaml at all: [");
    expect(result.status).toBe("unsupported");
  });

  it("returns 'unsupported' for empty content", () => {
    const result = parsePnpmLockfileGraph("");
    expect(result.status).toBe("unsupported");
  });

  it("produces stable signatures across repeated parses", () => {
    const first = graphOf("pnpm-lock-simple-base");
    const second = graphOf("pnpm-lock-simple-base");
    expect([...second.importerSignatures]).toEqual([...first.importerSignatures]);
  });
});

describe("closure change detection", () => {
  it("only changes the affected package's signature for a direct dependency change", () => {
    const base = graphOf("pnpm-lock-base");
    const changed = graphOf("pnpm-lock-changed-c");

    // pkg-c bumped js-yaml; a and b are untouched.
    expect(changed.importerSignatures.get("packages/c")).not.toEqual(base.importerSignatures.get("packages/c"));
    expect(changed.importerSignatures.get("packages/a")).toEqual(base.importerSignatures.get("packages/a"));
    expect(changed.importerSignatures.get("packages/b")).toEqual(base.importerSignatures.get("packages/b"));
  });

  it("propagates a deep transitive change to the consuming package only", () => {
    const base = graphOf("pnpm-lock-simple-base");
    const changed = graphOf("pnpm-lock-simple-transitive");

    // color-name (chalk -> ansi-styles -> color-convert -> color-name) changed; only pkg-b consumes chalk.
    expect(changed.importerSignatures.get("packages/b")).not.toEqual(base.importerSignatures.get("packages/b"));
    expect(changed.importerSignatures.get("packages/a")).toEqual(base.importerSignatures.get("packages/a"));
    expect(changed.importerSignatures.get("packages/c")).toEqual(base.importerSignatures.get("packages/c"));
  });

  it("handles cyclic dependency graphs without infinite recursion", () => {
    const graph = graphOf("pnpm-lock-cycle");
    const signature = graph.importerSignatures.get("packages/app");
    expect(signature).toMatch(/^[a-f0-9]{40}$/);
  });
});

describe("mapImporterSignaturesToPackages", () => {
  const packageInfos = {
    "pkg-a": { packageJsonPath: "/root/packages/a/package.json" },
    "pkg-b": { packageJsonPath: "/root/packages/b/package.json" },
    "pkg-c": { packageJsonPath: "/root/packages/c/package.json" },
  } as any;

  it("maps importer ids to workspace package names and ignores unknown importers", () => {
    const graph = graphOf("pnpm-lock-base");
    const signatures = mapImporterSignaturesToPackages(graph, packageInfos, "/root");

    expect([...signatures.keys()].sort()).toEqual(["pkg-a", "pkg-b", "pkg-c"]);
    // The root importer "." has no matching workspace package and is dropped.
    expect(signatures.has(".")).toBe(false);
  });
});

describe("diffPackageSignatures", () => {
  it("returns packages with changed signatures", () => {
    const oldSig = new Map([
      ["pkg-a", "aaa"],
      ["pkg-b", "bbb"],
      ["pkg-c", "ccc"],
    ]);
    const newSig = new Map([
      ["pkg-a", "aaa"],
      ["pkg-b", "BBB"],
      ["pkg-c", "ccc"],
    ]);
    expect([...diffPackageSignatures(oldSig, newSig)]).toEqual(["pkg-b"]);
  });

  it("treats added and removed packages as changed", () => {
    const oldSig = new Map([
      ["pkg-a", "aaa"],
      ["pkg-removed", "xxx"],
    ]);
    const newSig = new Map([
      ["pkg-a", "aaa"],
      ["pkg-added", "yyy"],
    ]);
    expect([...diffPackageSignatures(oldSig, newSig)].sort()).toEqual(["pkg-added", "pkg-removed"]);
  });

  it("returns an empty set when nothing changed", () => {
    const sig = new Map([["pkg-a", "aaa"]]);
    expect(diffPackageSignatures(sig, new Map(sig)).size).toBe(0);
  });
});
