import { filterPackages } from "../task/filterPackages";
import { PackageInfos, PackageInfo } from "workspace-tools";

describe("filterPackages", () => {
  it("intersecting scope and since with no overlap yields no packages", () => {
    const allPackages: PackageInfos = {
      foo: stubPackage("foo"),
      bar: stubPackage("bar"),
    };

    const scopedPackages = ["foo"];
    const changedPackages = ["bar"];

    const filtered = filterPackages({
      allPackages,
      deps: false,
      changedPackages,
      scopedPackages,
    });

    expect(filtered.length).toBe(0);
  });

  it("changed and scoped should yield intersection", () => {
    const allPackages: PackageInfos = {
      foo1: stubPackage("foo1"),
      foo2: stubPackage("foo2"),
    };

    const scopedPackages = ["foo1", "foo2"];
    const changedPackages = ["foo1"];

    const filtered = filterPackages({
      allPackages,
      deps: false,
      changedPackages,
      scopedPackages,
    });

    expect(filtered).toContain("foo1");
    expect(filtered).not.toContain("foo2");
  });

  it("changed dependencies should yield intersection of none if the scope does not contain it", () => {
    const allPackages: PackageInfos = {
      foo1: stubPackage("foo1", ["bar"]),
      foo2: stubPackage("foo2"),
      bar: stubPackage("bar"),
    };

    const scopedPackages = ["foo2"];
    const changedPackages = ["bar"];

    const filtered = filterPackages({
      allPackages,
      deps: false,
      changedPackages,
      scopedPackages,
    });

    expect(filtered).not.toContain("foo1");
    expect(filtered).not.toContain("foo2");
    expect(filtered).not.toContain("bar");
  });

  it("scoped will get its dependencies through the deps parameter", () => {
    const allPackages: PackageInfos = {
      foo1: stubPackage("foo1", ["bar"]),
      foo2: stubPackage("foo2"),
      bar: stubPackage("bar"),
    };

    const scopedPackages = ["bar"];
    const changedPackages = undefined;

    const filtered = filterPackages({
      allPackages,
      deps: true,
      changedPackages,
      scopedPackages,
    });

    expect(filtered).toContain("foo1");
    expect(filtered).not.toContain("foo2");
    expect(filtered).toContain("bar");
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
