import { describe, expect, it, jest } from "@jest/globals";
import path from "path";
import type { PackageInfo } from "workspace-tools";
import { TargetFactory, type TargetFactoryOptions } from "../TargetFactory.js";
import type { Target } from "../types/Target.js";

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

  it.each(["package", "global"])("evaluates a %s target's functional weight immediately by default", (kind) => {
    const factory = new TargetFactory({ root, packageInfos: makePackages({ a: {} }), resolve });
    const weight = jest.fn((target: Target, _maxWorkers?: number) => {
      expect(target.weight).toBe(1);
      expect(target.dependencies).toEqual([]);
      return 3;
    });
    const config = { weight, maxWorkers: 4 };
    const target = kind === "package" ? factory.createPackageTarget("a", "build", config) : factory.createGlobalTarget("#build", config);

    expect(weight).toHaveBeenCalledTimes(1);
    expect(weight).toHaveBeenCalledWith(target, 4);
    expect(weight.mock.calls[0][0]).toBe(target);
    expect(target.weight).toBe(3);
    expect({ ...target }.weight).toBe(3);
    expect(weight).toHaveBeenCalledTimes(1);
  });

  it.each(["package", "global"])("evaluates a %s target's functional weight once on first use", (kind) => {
    const factory = new TargetFactory({
      root,
      packageInfos: makePackages({ a: { build: "echo build" } }),
      resolve,
      lazyWeights: true,
    });
    const weight = jest.fn<(target: Target, maxWorkers?: number) => number>(() => 3);
    const config = { weight, maxWorkers: 4, priority: 2 };
    const target = kind === "package" ? factory.createPackageTarget("a", "build", config) : factory.createGlobalTarget("#build", config);
    target.dependencies.push("__start");
    target.dependents.push("consumer#build");
    target.priority = 10;

    expect(weight).not.toHaveBeenCalled();
    expect(target.weight).toBe(3);
    expect({ ...target }.weight).toBe(3);
    expect(weight).toHaveBeenCalledTimes(1);
    expect(weight).toHaveBeenCalledWith(
      expect.objectContaining({ id: target.id, weight: 1, priority: 2, dependencies: [], dependents: [] }),
      4
    );
    target.weight = 5;
    expect(target.weight).toBe(5);
    expect(weight).toHaveBeenCalledTimes(1);
  });

  it("allows overriding a weight without evaluating the original function", () => {
    const factory = new TargetFactory({ root, packageInfos: makePackages({ a: {} }), resolve, lazyWeights: true });
    const weight = jest.fn(() => 3);
    const target = factory.createPackageTarget("a", "build", { weight });
    target.weight = 2;

    expect(target.weight).toBe(2);
    expect(weight).not.toHaveBeenCalled();
  });

  it("does not cache a failed weight evaluation", () => {
    const factory = new TargetFactory({ root, packageInfos: makePackages({ a: {} }), resolve, lazyWeights: true });
    const weight = jest
      .fn(() => 3)
      .mockImplementationOnce(() => {
        throw new Error("weight failed");
      });
    const target = factory.createPackageTarget("a", "build", { weight });

    expect(() => target.weight).toThrow("weight failed");
    expect(target.weight).toBe(3);
    expect(weight).toHaveBeenCalledTimes(2);
  });

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
