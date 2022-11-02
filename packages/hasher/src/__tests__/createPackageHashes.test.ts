import { createPackageHashes } from "../createPackageHashes";

describe("createPackageHashes", () => {
  it("creates packages hashes for repo hashes", () => {
    const packageHashes = createPackageHashes(
      "/repo",
      [
        {
          path: "/repo/packages/package-a",
          name: "package-a",
          packageJson: {
            name: "package-a",
            packageJsonPath: "/packages/package-a/package.json",
            version: "1.0.0",
          },
        },
        {
          path: "/repo/packages/package-b",
          name: "package-b",
          packageJson: {
            name: "package-b",
            packageJsonPath: "/packages/package-b/package.json",
            version: "1.0.0",
          },
        },
      ],
      {
        "packages/package-a/foo.ts": "hash-a-foo.ts",
        "packages/package-a/package.json": "hash-a-package.json",
        "packages/package-b/1.ts": "hash-b-1.ts",
        "packages/package-b/2.ts": "hash-b-2.ts",
        "packages/package-b/3.ts": "hash-b-3.ts",
      }
    );
    expect(packageHashes["packages/package-a"].length).toEqual(2);

    // packageHashes["packageName"] is an array of tuples of the form [filePath, hash]
    expect(packageHashes["packages/package-a"][0][1]).toEqual("hash-a-foo.ts");
    expect(packageHashes["packages/package-a"][1][1]).toEqual("hash-a-package.json");

    expect(packageHashes["packages/package-b"].length).toEqual(3);

    // packageHashes["packageName"] is an array of tuples of the form [filePath, hash]
    expect(packageHashes["packages/package-b"][0][1]).toEqual("hash-b-1.ts");
    expect(packageHashes["packages/package-b"][1][1]).toEqual("hash-b-2.ts");
    expect(packageHashes["packages/package-b"][2][1]).toEqual("hash-b-3.ts");
  });
});
