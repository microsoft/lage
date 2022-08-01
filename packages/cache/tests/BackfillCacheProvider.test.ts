import { Target } from "@lage-run/target-graph";

import { BackfillCacheProvider, createCacheConfig } from "../src/providers/BackfillCacheProvider";
import { Monorepo } from "@lage-run/monorepo-fixture";
import { _testResetEnvHash } from "../src/salt";
import path from "path";

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

    const root = monorepo.root;
    const config = createCacheConfig(root);
    const provider = new BackfillCacheProvider(root, config);

    const target: Target = {
      id: "a",
      cwd: path.join(monorepo.root, "packages/a"),
      dependencies: [],
      task: "command",
      label: "a - command",
    };

    const hash = await provider.hash(target);
    await expect(hash).toMatchInlineSnapshot(`"b6ab40b8acf59d71451c845ca9ba7dd468777b26"`);
    await monorepo.cleanup();
  });

  it("should generate a cache of the outputs as specified in the outputs folder in target", async () => {
    const monorepo = new Monorepo("generate-cache");

    await monorepo.init();
    await monorepo.install();

    await monorepo.addPackage("a");
    await monorepo.linkPackages();

    const root = monorepo.root;

    const config = {
      outputGlob: ["output.txt"],
    };

    const provider = new BackfillCacheProvider(root, config);

    const target: Target = {
      id: "a",
      cwd: path.join(monorepo.root, "packages/a"),
      dependencies: [],
      task: "command",
      label: "a - command",
    };

    const hash = "some-hash";

    await monorepo.writeFiles({
      "packages/a/node_modules/.cache/backfill/some-hash/output.txt": "output",
    });

    await provider.fetch(hash, target);

    const contents = await monorepo.readFiles(["packages/a/output.txt"]);

    expect(contents["packages/a/output.txt"]).toBe("output");

    await monorepo.cleanup();
  });
});
