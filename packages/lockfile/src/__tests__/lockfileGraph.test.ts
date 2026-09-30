import { describe, expect, it } from "@jest/globals";
import fs from "fs";
import path from "path";
import {
  parsePnpmLockfileGraph,
  diffPackageSignatures,
  mapImporterSignaturesToPackages,
  splitImporterSignatures,
} from "../loadLockfileGraph.js";
import { buildPnpmLockfileGraph, isSupportedPnpmLockfileVersion, type PnpmSnapshot } from "../pnpmLockfileGraph.js";
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

  it.each([
    ["missing importers", "lockfileVersion: '9.0'\nsnapshots: {}\n"],
    [
      "invalid importer dependency",
      `lockfileVersion: '9.0'
importers:
  packages/a:
    dependencies:
      semver: 7.5.4
snapshots: {}
`,
    ],
    [
      "unresolved importer dependency",
      `lockfileVersion: '9.0'
importers:
  packages/a:
    dependencies:
      semver:
        specifier: 7.5.4
        version: 7.5.4
snapshots: {}
`,
    ],
    [
      "unresolved snapshot dependency",
      `lockfileVersion: '9.0'
importers:
  packages/a:
    dependencies:
      semver:
        specifier: 7.5.4
        version: 7.5.4
snapshots:
  semver@7.5.4:
    dependencies:
      missing: 1.0.0
`,
    ],
  ])("returns 'unsupported' for %s", (_name, content) => {
    expect(parsePnpmLockfileGraph(content).status).toBe("unsupported");
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

  it("includes package artifact metadata in signatures", () => {
    const base = parsePnpmLockfileGraph(`lockfileVersion: '9.0'
importers:
  packages/a:
    dependencies:
      semver:
        specifier: 7.5.4
        version: 7.5.4
packages:
  semver@7.5.4:
    resolution:
      integrity: sha512-base
snapshots:
  semver@7.5.4: {}
`);
    const changed = parsePnpmLockfileGraph(`lockfileVersion: '9.0'
importers:
  packages/a:
    dependencies:
      semver:
        specifier: 7.5.4
        version: 7.5.4
packages:
  semver@7.5.4:
    resolution:
      integrity: sha512-changed
snapshots:
  semver@7.5.4: {}
`);

    expect(base.status).toBe("success");
    expect(changed.status).toBe("success");
    if (base.status === "success" && changed.status === "success") {
      expect(changed.graph.importerSignatures.get("packages/a")).not.toEqual(base.graph.importerSignatures.get("packages/a"));
    }
  });

  it.each([
    ["peer", "react-dom@18.3.1(react@18.3.1)", "react-dom@18.3.1"],
    ["patch", "react-dom@18.3.1(patch_hash=abc123)", "react-dom@18.3.1"],
    ["scoped peer", "@scope/pkg@1.0.0(react@18.3.1)", "@scope/pkg@1.0.0"],
  ])("associates %s snapshot keys with their package artifact metadata", (_name, snapshotKey, packageKey) => {
    const createLockfile = (integrity: string) => `lockfileVersion: '9.0'
importers:
  packages/a:
    dependencies:
      dependency:
        specifier: 1.0.0
        version: ${JSON.stringify(snapshotKey)}
packages:
  ${JSON.stringify(packageKey)}:
    resolution:
      integrity: ${integrity}
snapshots:
  ${JSON.stringify(snapshotKey)}: {}
`;
    const base = parsePnpmLockfileGraph(createLockfile("sha512-base"));
    const changed = parsePnpmLockfileGraph(createLockfile("sha512-changed"));

    expect(base.status).toBe("success");
    expect(changed.status).toBe("success");
    if (base.status === "success" && changed.status === "success") {
      expect(changed.graph.importerSignatures.get("packages/a")).not.toEqual(base.graph.importerSignatures.get("packages/a"));
    }
  });

  it("resolves aliases to the actual snapshot key", () => {
    const result = parsePnpmLockfileGraph(`lockfileVersion: '9.0'
importers:
  packages/a:
    dependencies:
      alias:
        specifier: npm:real-package@1.0.0
        version: real-package@1.0.0
snapshots:
  real-package@1.0.0: {}
`);
    expect(result.status).toBe("success");
  });

  it("includes top-level installation settings in the global signature", () => {
    const base = parsePnpmLockfileGraph(`lockfileVersion: '9.0'
settings:
  autoInstallPeers: true
importers:
  packages/a: {}
`);
    const changed = parsePnpmLockfileGraph(`lockfileVersion: '9.0'
settings:
  autoInstallPeers: false
importers:
  packages/a: {}
`);

    expect(base.status).toBe("success");
    expect(changed.status).toBe("success");
    if (base.status === "success" && changed.status === "success") {
      expect(changed.graph.globalSignature).not.toEqual(base.graph.globalSignature);
    }
  });

  it("propagates changes across cyclic dependency components", () => {
    const base = parsePnpmLockfileGraph(`lockfileVersion: '9.0'
importers:
  packages/app:
    dependencies:
      cyclic-b:
        specifier: 1.0.0
        version: 1.0.0
snapshots:
  cyclic-a@1.0.0:
    dependencies:
      cyclic-b: 1.0.0
      left-pad: 1.3.0
  cyclic-b@1.0.0:
    dependencies:
      cyclic-a: 1.0.0
  left-pad@1.3.0: {}
`);
    const changed = parsePnpmLockfileGraph(`lockfileVersion: '9.0'
importers:
  packages/app:
    dependencies:
      cyclic-b:
        specifier: 1.0.0
        version: 1.0.0
snapshots:
  cyclic-a@1.0.0:
    dependencies:
      cyclic-b: 1.0.0
      left-pad: 1.3.1
  cyclic-b@1.0.0:
    dependencies:
      cyclic-a: 1.0.0
  left-pad@1.3.1: {}
`);

    expect(base.status).toBe("success");
    expect(changed.status).toBe("success");
    if (base.status === "success" && changed.status === "success") {
      expect(changed.graph.importerSignatures.get("packages/app")).not.toEqual(base.graph.importerSignatures.get("packages/app"));
    }
  });

  it("handles a deeply nested dependency graph without overflowing the call stack", () => {
    const nodeCount = 20_000;
    const snapshots: Record<string, PnpmSnapshot> = {};
    for (let index = 0; index < nodeCount; index++) {
      snapshots[`dependency-${index}@1.0.0`] = index === nodeCount - 1 ? {} : { dependencies: { [`dependency-${index + 1}`]: "1.0.0" } };
    }

    const graph = buildPnpmLockfileGraph({
      lockfileVersion: "9.0",
      importers: {
        "packages/app": {
          dependencies: {
            "dependency-0": { specifier: "1.0.0", version: "1.0.0" },
          },
        },
      },
      snapshots,
    });

    expect(graph.importerSignatures.get("packages/app")).toMatch(/^[a-f0-9]{40}$/);
  });
});

describe("mapImporterSignaturesToPackages", () => {
  const packageInfos = {
    "pkg-a": { packageJsonPath: "/root/packages/a/package.json" },
    "pkg-b": { packageJsonPath: "/root/packages/b/package.json" },
    "pkg-c": { packageJsonPath: "/root/packages/c/package.json" },
  } as any;

  it("maps importer ids to workspace package names and tracks unknown importers separately", () => {
    const graph = graphOf("pnpm-lock-base");
    const signatures = mapImporterSignaturesToPackages(graph, packageInfos, "/root");
    const splitSignatures = splitImporterSignatures(graph, packageInfos, "/root");

    expect([...signatures.keys()].sort()).toEqual(["pkg-a", "pkg-b", "pkg-c"]);
    expect([...splitSignatures.packageSignatures.keys()].sort()).toEqual(["pkg-a", "pkg-b", "pkg-c"]);
    expect([...splitSignatures.unmappedImporterSignatures.keys()]).toEqual(["."]);
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
