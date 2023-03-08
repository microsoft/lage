import { _testResetEnvHash } from "../src/salt";
import { Monorepo } from "@lage-run/monorepo-fixture";
import { TargetHasher, TargetHasherOptions } from "../src/TargetHasher";
import path from "path";
import type { Target } from "@lage-run/target-graph";

describe("BackfillCacheProvider", () => {
  beforeEach(() => {
    _testResetEnvHash();
  });

  it("should generate a hash of the package contents", async () => {
    const monorepo = new Monorepo("generate-hash");

    await monorepo.init();
    await monorepo.install();

    await monorepo.addPackage("a");
    await monorepo.linkPackages();

    const options: TargetHasherOptions = {
      root: monorepo.root,
      environmentGlob: ["lage.config.js"],
      cacheKey: "",
    };

    const target: Target = {
      id: "a",
      cwd: path.join(monorepo.root, "packages/a"),
      depSpecs: [],
      dependencies: [],
      dependents: [],
      task: "command",
      label: "a - command",
    };

    const hash = await new TargetHasher(options).hash(target);
    // This hash is dependent on the underlying hash algorithm. The last change here was due to us switching from sha1 to git hash.
    // git hash is sha1("blob {byte count}\0{content}")
    await expect(hash).toMatchInlineSnapshot(`"03577ca79ad4a10f67831e169f58f0aff9eefa74"`);
    await monorepo.cleanup();
  });
});
