import { describe, expect, it } from "@jest/globals";
import path from "path";
import { createPackageHashes } from "../createPackageHashes.js";

describe("createPackageHashes", () => {
  it("creates packages hashes for repo hashes", () => {
    const packageHashes = createPackageHashes(
      // Normalize paths for the OS
      path.resolve("/repo"),
      {
        "package-a": {
          name: "package-a",
          packageJsonPath: path.resolve(
            "/repo/packages/package-a/package.json"
          ),
          version: "1.0.0",
        },
        "package-b": {
          name: "package-b",
          packageJsonPath: path.resolve(
            "/repo/packages/package-b/package.json"
          ),
          version: "1.0.0",
        },
      },
      {
        // RepoHashes keys have forward slashes, and the values would be real hashes
        "packages/package-a/foo.ts": "hash-a-foo-ts",
        "packages/package-a/package.json": "hash-a-package-json",
        "packages/package-b/1.ts": "hash-b-1-ts",
        "packages/package-b/2.ts": "hash-b-2-ts",
        "packages/package-b/3.ts": "hash-b-3-ts",
        "other-file.js": "hash-other-file-js",
      }
    );

    // packageHashes["packageName"] is an array of tuples of the form [filePath, hash]
    expect(packageHashes).toEqual({
      "packages/package-a": [
        ["packages/package-a/foo.ts", "hash-a-foo-ts"],
        ["packages/package-a/package.json", "hash-a-package-json"],
      ],
      "packages/package-b": [
        ["packages/package-b/1.ts", "hash-b-1-ts"],
        ["packages/package-b/2.ts", "hash-b-2-ts"],
        ["packages/package-b/3.ts", "hash-b-3-ts"],
      ],
      "": [["other-file.js", "hash-other-file-js"]],
    });
  });
});
