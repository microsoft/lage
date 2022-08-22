import { filterPackages } from "../../src/filter/getFilteredPackages";
import { PackageInfos, PackageInfo } from "workspace-tools";
import { Logger } from "@lage-run/logger";

describe("filterPackages", () => {
  const logger = new Logger();
  it("intersecting scope and since with no overlap yields no packages", () => {
    const packageInfos: PackageInfos = {
      foo: stubPackage("foo"),
      bar: stubPackage("bar"),
    };

    const scopedPackages = ["foo"];
    const changedPackages = ["bar"];

    const filtered = filterPackages({
      packageInfos,
      includeDependents: false,
      changedPackages,
      scopedPackages,
      includeDependencies: false,
      logger,
    });

    expect(filtered.length).toBe(0);
  });

  it("changed and scoped should yield intersection", () => {
    const packageInfos: PackageInfos = {
      foo1: stubPackage("foo1"),
      foo2: stubPackage("foo2"),
    };

    const scopedPackages = ["foo1", "foo2"];
    const changedPackages = ["foo1"];

    const filtered = filterPackages({
      packageInfos,
      includeDependents: false,
      changedPackages,
      scopedPackages,
      includeDependencies: false,
      logger,
    });

    expect(filtered).toContain("foo1");
    expect(filtered).not.toContain("foo2");
  });

  it("changed dependencies should yield intersection of none if the scope does not contain it", () => {
    const packageInfos: PackageInfos = {
      foo1: stubPackage("foo1", ["bar"]),
      foo2: stubPackage("foo2"),
      bar: stubPackage("bar"),
    };

    const scopedPackages = ["foo2"];
    const changedPackages = ["bar"];

    const filtered = filterPackages({
      packageInfos,
      includeDependents: false,
      changedPackages,
      scopedPackages,
      includeDependencies: false,
      logger,
    });

    expect(filtered).not.toContain("foo1");
    expect(filtered).not.toContain("foo2");
    expect(filtered).not.toContain("bar");
  });

  it("scoped will get its dependencies through the deps parameter", () => {
    const packageInfos: PackageInfos = {
      foo1: stubPackage("foo1", ["bar"]),
      foo2: stubPackage("foo2"),
      bar: stubPackage("bar"),
    };

    const scopedPackages = ["bar"];
    const changedPackages = undefined;

    const filtered = filterPackages({
      packageInfos,
      includeDependents: true,
      changedPackages,
      scopedPackages,
      includeDependencies: false,
      logger,
    });

    expect(filtered).toContain("foo1");
    expect(filtered).not.toContain("foo2");
    expect(filtered).toContain("bar");
  });

  it("scoped will include transitive dependencies when includeDependencies is enabled", () => {
    const packageInfos: PackageInfos = {
      foo1: stubPackage("foo1", ["bar"]),
      foo2: stubPackage("foo2"),
      bar: stubPackage("bar", ["baz"]),
      baz: stubPackage("baz"),
    };

    const scopedPackages = ["foo1"];
    const changedPackages = undefined;

    const filtered = filterPackages({
      packageInfos,
      includeDependents: true,
      changedPackages,
      scopedPackages,
      includeDependencies: true,
      logger,
    });

    expect(filtered).toContain("foo1");
    expect(filtered).not.toContain("foo2");
    expect(filtered).toContain("bar");
    expect(filtered).toContain("baz");
  });
});

function stubPackage(name: string, deps: string[] = []) {
  return {
    name,
    packageJsonPath: `packages/${name}`,
    version: "1.0",
    dependencies: deps.reduce((depMap, dep) => ({ ...depMap, [dep]: "*" }), {}),
    devDependencies: {},
  } as PackageInfo;
}
