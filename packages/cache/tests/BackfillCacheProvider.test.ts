import { Target } from "@lage-run/target-graph";
import mockFs from "mock-fs";
import path from "path";

import { BackfillCacheProvider, createCacheConfig } from "../src/providers/BackfillCacheProvider";

describe("BackfillCacheProvider", () => {
  it("should generate a hash of the package contents", async () => {
    mockFs({
      "test-package": {
        ".cache": {},
        "package.json": {
          name: "a",
        },
      },
    });

    const root = path.join(process.cwd(), "test-package");
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
    mockFs.restore();

    expect(hash).toMatchInlineSnapshot();
  });
});

