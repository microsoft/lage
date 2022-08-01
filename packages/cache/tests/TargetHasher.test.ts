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
      environmentGlob: ["**/*"],
      cacheKey: "",
    };

    const target: Target = {
      id: "a",
      cwd: path.join(monorepo.root, "packages/a"),
      dependencies: [],
      task: "command",
      label: "a - command",
    };

    const hash = await new TargetHasher(options).hash(target);
    await expect(hash).toMatchInlineSnapshot(`"b6ab40b8acf59d71451c845ca9ba7dd468777b26"`);
    await monorepo.cleanup();
  });
});
