import { afterEach, describe, expect, it } from "@jest/globals";
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { nativeTargets, writeArtifact, assembleArtifacts, validateVersions } from "../../native-packages.js";

const roots: string[] = [];

function fixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "native-packages-"));
  roots.push(root);
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  execFileSync(
    "git",
    ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "--allow-empty", "-m", "fixture", "--quiet"],
    {
      cwd: root,
    }
  );
  fs.writeFileSync(path.join(root, "LICENSE"), "MIT fixture");
  const wrapper = path.join(root, "packages/glob-hasher");
  fs.mkdirSync(wrapper, { recursive: true });
  fs.writeFileSync(
    path.join(wrapper, "package.json"),
    JSON.stringify({
      version: "1.4.3",
      optionalDependencies: Object.fromEntries(nativeTargets.map(({ suffix }) => [`glob-hasher-${suffix}`, "workspace:*"])),
    })
  );
  for (const { suffix } of nativeTargets) {
    const directory = path.join(root, "packages", `glob-hasher-${suffix}`);
    fs.mkdirSync(directory);
    fs.writeFileSync(path.join(directory, "package.json"), JSON.stringify({ version: "1.4.3" }));
    fs.writeFileSync(path.join(wrapper, `glob-hasher.${suffix}.node`), `binding for ${suffix}`);
  }
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("native release artifacts", () => {
  it("assembles all six targets and includes licenses", () => {
    const root = fixture();
    const artifacts = path.join(root, "artifacts");
    for (const { triple } of nativeTargets) {
      writeArtifact(root, triple, artifacts);
    }
    assembleArtifacts(root, artifacts);
    for (const { suffix } of nativeTargets) {
      const directory = path.join(root, "packages", `glob-hasher-${suffix}`);
      expect(fs.readFileSync(path.join(directory, `glob-hasher.${suffix}.node`), "utf8")).toBe(`binding for ${suffix}`);
      expect(fs.readFileSync(path.join(directory, "LICENSE"), "utf8")).toBe("MIT fixture");
    }
  });

  it("rejects an incomplete artifact set before staging any binary", () => {
    const root = fixture();
    const artifacts = path.join(root, "artifacts");
    writeArtifact(root, nativeTargets[0].triple, artifacts);
    expect(() => assembleArtifacts(root, artifacts)).toThrow(/ENOENT/);
    expect(fs.existsSync(path.join(root, "packages/glob-hasher-darwin-x64/glob-hasher.darwin-x64.node"))).toBe(false);
  });

  it.each(["revision", "sha256", "triple"])("rejects mismatched artifact %s", (key) => {
    const root = fixture();
    const { triple } = nativeTargets[0];
    const artifacts = path.join(root, "artifacts");
    writeArtifact(root, triple, artifacts);
    const metadataPath = path.join(artifacts, `glob-hasher-${triple}`, "artifact.json");
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    metadata[key] = "incorrect";
    fs.writeFileSync(metadataPath, JSON.stringify(metadata));
    expect(() => assembleArtifacts(root, artifacts, [triple])).toThrow(/does not match|checked-out revision/);
  });

  it("rejects version skew between the wrapper and a binary package", () => {
    const root = fixture();
    fs.writeFileSync(path.join(root, "packages/glob-hasher-linux-arm64-gnu/package.json"), JSON.stringify({ version: "1.4.2" }));
    expect(() => validateVersions(root)).toThrow(/must match glob-hasher's version/);
  });
});
