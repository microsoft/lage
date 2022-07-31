import { Target } from "@lage-run/target-graph";

import { BackfillCacheProvider, createCacheConfig } from "../src/providers/BackfillCacheProvider";
import { Monorepo } from "@lage-run/monorepo-fixture";

describe("BackfillCacheProvider", () => {
  it("should generate a hash of the package contents", async () => {
    const monorepo = new Monorepo("cache-generate-hash");

    monorepo.init();

    monorepo.addPackage("a");
    monorepo.linkPackages();

    const root = monorepo.root;
    const config = createCacheConfig(root);
    const provider = new BackfillCacheProvider(root, config);

    const target: Target = {
      id: "a",
      cwd: process.cwd(),
      dependencies: [],
      task: "command",
      label: "a - command",
    };

    const hash = await provider.hash(target);

    expect(hash).toMatchInlineSnapshot(`"7d298ad969a814c086629f20556afa07f2bb7d25"`);

    monorepo.cleanup();
  });
});
