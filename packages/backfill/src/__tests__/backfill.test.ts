import path from "path";
import fs from "fs-extra";

import { setupFixture } from "@lage-run/test-utilities";
import { createConfig } from "backfill-config";
import { makeLogger } from "backfill-logger";

import { backfill } from "../index.js";

const logger = makeLogger("mute");

describe("backfill", () => {
  it("with modified source files", async () => {
    //  Set up
    const fixtureLocation = setupFixture("basic");

    const config = createConfig(logger, fixtureLocation);
    config.outputGlob = ["src/*"];

    const salt = "fooBar";
    let buildCalled = 0;

    const initialContent = fs
      .readFileSync(path.join(fixtureLocation, "src", "index.ts"))
      .toString();

    const outputContent = `console.log("foo bar");`;
    const buildCommand = async (): Promise<void> => {
      await fs.writeFile(
        path.join(fixtureLocation, "src", "index.ts"),
        outputContent
      );
      buildCalled += 1;
    };

    // Execute
    await backfill(config, buildCommand, salt, logger);

    // Assert
    expect(buildCalled).toBe(1);
    expect(
      fs.readFileSync(path.join(fixtureLocation, "src", "index.ts")).toString()
    ).toBe(outputContent);

    // Reset
    buildCalled = 0;
    await fs.writeFile(
      path.join(fixtureLocation, "src", "index.ts"),
      initialContent
    );

    // Execute
    await backfill(config, buildCommand, salt, logger);

    // Assert
    expect(buildCalled).toBe(0);
    expect(
      fs.readFileSync(path.join(fixtureLocation, "src", "index.ts")).toString()
    ).toBe(outputContent);
  });
  it("with cache miss and then cache hit", async () => {
    //  Set up
    const fixtureLocation = setupFixture("basic");

    const config = createConfig(logger, fixtureLocation);

    const salt = "fooBar";
    let buildCalled = 0;
    const outputContent = `console.log("foo");`;
    const buildCommand = async (): Promise<void> => {
      await fs.mkdirp(path.join(fixtureLocation, "lib"));
      await fs.writeFile(
        path.join(fixtureLocation, "lib", "output.js"),
        outputContent
      );
      buildCalled += 1;
    };

    // Execute
    await backfill(config, buildCommand, salt, logger);

    // Assert
    expect(buildCalled).toBe(1);
    expect(
      fs.readFileSync(path.join(fixtureLocation, "lib", "output.js")).toString()
    ).toBe(outputContent);

    // Reset
    buildCalled = 0;
    await fs.writeFile(
      path.join(fixtureLocation, "lib", "output.js"),
      "This output should be overriden by backfill during fetch"
    );

    // Execute
    await backfill(config, buildCommand, salt, logger);

    // Assert
    expect(buildCalled).toBe(0);
    expect(
      fs.readFileSync(path.join(fixtureLocation, "lib", "output.js")).toString()
    ).toBe(outputContent);
  });

  it("should set the proper custom cache provider name", async () => {
    //  Set up
    const fixtureLocation = setupFixture("custom-cache-provider");

    const spyLogger = jest.spyOn(logger, "setCacheProvider");

    const config = createConfig(logger, fixtureLocation);

    config.outputGlob = ["src/*"];

    const salt = "fooBar";

    const buildCommand = () => Promise.resolve();

    // Execute
    await backfill(config, buildCommand, salt, logger);

    // Assert

    // See `packages/utils-test/__fixtures__/custom-cache-provider/backfill.config.js`'s provider.name
    expect(spyLogger).toHaveBeenCalledWith("custom-provider");
  });
});
