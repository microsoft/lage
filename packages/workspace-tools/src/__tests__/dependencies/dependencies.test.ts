import { describe, expect, it } from "@jest/globals";
import type { PackageInfo } from "../../types/PackageInfo.js";
import { getTransitiveConsumers, getTransitiveProviders } from "../../dependencies/index.js";

describe("getTransitiveConsumers", () => {
  it("can get linear transitive consumers", () => {
    const allPackages = {
      a: stubPackage("a", ["b"]),
      b: stubPackage("b", ["c"]),
      c: stubPackage("c"),
    };

    const actual = getTransitiveConsumers(["c"], allPackages);

    expect(actual).toContain("a");
    expect(actual).toContain("b");
  });

  it("can get linear transitive consumers with scope", () => {
    const allPackages = {
      grid: stubPackage("grid", ["foo"]),
      word: stubPackage("word", ["bar"]),
      foo: stubPackage("foo", ["core"]),
      bar: stubPackage("bar", ["core"]),
      core: stubPackage("core"),
      demo: stubPackage("demo", ["grid", "word"]),
    };

    const actual = getTransitiveConsumers(["core"], allPackages, ["grid", "word"]);

    expect(actual).toContain("foo");
    expect(actual).toContain("bar");
    expect(actual).toContain("grid");
    expect(actual).toContain("word");
    expect(actual).not.toContain("demo");
  });

  it("can get transitive consumer with deps", () => {
    /*
      [b, a]
      [d, a]
      [c, b]
      [e, b]
      [f, d]
      [c, g]

      expected: a, b, g (orignates from c)
    */

    const allPackages = {
      a: stubPackage("a", ["b", "d"]),
      b: stubPackage("b", ["c", "e"]),

      c: stubPackage("c"),

      d: stubPackage("d", ["f"]),
      e: stubPackage("e"),
      f: stubPackage("f"),
      g: stubPackage("g", ["c"]),
    };

    const actual = getTransitiveConsumers(["c"], allPackages);

    expect(actual).toContain("a");
    expect(actual).toContain("b");
    expect(actual).toContain("g");

    expect(actual).not.toContain("d");
    expect(actual).not.toContain("e");
    expect(actual).not.toContain("f");
    expect(actual).not.toContain("c");
  });
});

describe("getTransitiveProviders", () => {
  it("can get linear transitive providers", () => {
    const allPackages = {
      a: stubPackage("a", ["b"]),
      b: stubPackage("b", ["c"]),
      c: stubPackage("c"),
    };

    const actual = getTransitiveProviders(["a"], allPackages);

    expect(actual).toContain("b");
    expect(actual).toContain("c");
  });

  it("can get transitive providers with deps", () => {
    /*
      [b, a]
      [c, b]
      [e, c]
      [f, c]
      [f, e]
      [g, f]

      expected: e, f, g
    */

    const allPackages = {
      a: stubPackage("a", ["b"]),
      b: stubPackage("b", ["c"]),

      c: stubPackage("c", ["e", "f"]),
      d: stubPackage("d"),
      e: stubPackage("e", ["f"]),
      f: stubPackage("f", ["g"]),
      g: stubPackage("g"),
    };

    const actual = getTransitiveProviders(["c"], allPackages);

    expect(actual).toContain("e");
    expect(actual).toContain("f");
    expect(actual).toContain("g");

    expect(actual).not.toContain("a");
    expect(actual).not.toContain("b");
    expect(actual).not.toContain("d");
    expect(actual).not.toContain("c");
  });

  it("can get transitive consumers with deps and scope", () => {
    /*
      [b, a]
      [c, b]
      [e, c]
      [f, c]
      [f, e]
      [g, f]

      expected: e, f, g
    */

    const allPackages = {
      a: stubPackage("a", ["b", "h"]),
      b: stubPackage("b", ["c"]),

      c: stubPackage("c", ["e", "f"]),
      d: stubPackage("d"),
      e: stubPackage("e", ["f"]),
      f: stubPackage("f", ["g"]),
      g: stubPackage("g"),
      h: stubPackage("h", ["i"]),
      i: stubPackage("i", ["f"]),
    };

    const actual = getTransitiveConsumers(["f"], allPackages, ["b"]);

    expect(actual).toContain("e");
    expect(actual).toContain("c");
    expect(actual).toContain("b");
    expect(actual).not.toContain("h");
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
