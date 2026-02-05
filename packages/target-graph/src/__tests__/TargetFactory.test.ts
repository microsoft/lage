import path from "path";
import { TargetFactory } from "../TargetFactory.js";

describe("TargetFactory", () => {
  it("should give a type of 'npmScript' if one of the packages contain that script", () => {
    const factory = new TargetFactory({
      root: "root",
      packageInfos: {
        a: {
          name: "a",
          packageJsonPath: "root/a/package.json",
          version: "1.0.0",
          scripts: {
            build: "echo build",
          },
        },
      },
      resolve(packageName) {
        return path.join("root", packageName);
      },
    });

    const target = factory.createPackageTarget("a", "build", {
      dependsOn: ["^build"],
    });

    expect(target.type).toBe("npmScript");
  });

  it("should give a type of 'noop' if one of the packages contain that script", () => {
    const factory = new TargetFactory({
      root: "root",
      packageInfos: {
        a: {
          name: "a",
          packageJsonPath: "root/a/package.json",
          version: "1.0.0",
          scripts: {
            build: "echo build",
          },
        },
        b: {
          name: "b",
          packageJsonPath: "root/a/package.json",
          version: "1.0.0",
          scripts: {
            build: "echo build",
          },
          dependencies: {
            a: "1.0.0",
          },
        },
      },
      resolve(packageName) {
        return path.join("root", packageName);
      },
    });

    const target = factory.createPackageTarget("a", "unknown", {
      dependsOn: ["^build"],
    });

    expect(target.type).toBe("noop");
  });
});
