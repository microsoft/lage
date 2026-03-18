import path from "path";
import type { PackageInfo } from "workspace-tools";
import { TargetFactory, type TargetFactoryOptions } from "../TargetFactory.js";

describe("TargetFactory", () => {
  const root = path.resolve("/fake/root");

  /** Make packages from a mapping of package name to scripts */
  function makePackages(packages: Record<string, Record<string, string>>): Record<string, PackageInfo> {
    const result: Record<string, PackageInfo> = {};
    for (const [name, scripts] of Object.entries(packages)) {
      result[name] = {
        name,
        version: "1.0.0",
        packageJsonPath: path.join(root, name, "package.json"),
        scripts,
      };
    }
    return result;
  }

  const resolve: TargetFactoryOptions["resolve"] = (packageName) => path.join(root, packageName);

  it("should give a type of 'npmScript' if the package contains that script", () => {
    const factory = new TargetFactory({
      root,
      packageInfos: makePackages({
        a: { build: "echo build" },
      }),
      resolve,
    });

    const target = factory.createPackageTarget("a", "build", {
      dependsOn: ["^build"],
    });

    expect(target.type).toBe("npmScript");
  });

  it("should give a type of 'npmScript' if a different package contains that script", () => {
    const factory = new TargetFactory({
      root,
      packageInfos: makePackages({
        a: { test: "echo test" },
        b: { build: "echo build" },
      }),
      resolve,
    });

    const target = factory.createPackageTarget("a", "build", {
      dependsOn: ["^build"],
    });

    expect(target.type).toBe("npmScript");
  });

  it("should give a type of 'noop' if no packages contain that script", () => {
    const factory = new TargetFactory({
      root,
      packageInfos: makePackages({
        a: { test: "echo test" },
        b: { build: "echo build" },
      }),
      resolve,
    });

    const target = factory.createPackageTarget("a", "lint", {
      dependsOn: ["^lint"],
    });

    expect(target.type).toBe("noop");
  });

  it("uses type npmScript for global target with matching script in some package", () => {
    const factory = new TargetFactory({
      root,
      packageInfos: makePackages({
        a: { build: "echo build" },
        b: { test: "echo test" },
      }),
      resolve,
    });

    const target = factory.createPackageTarget("root", "test", {
      dependsOn: ["^test"],
    });

    expect(target.type).toBe("npmScript");
  });
});
