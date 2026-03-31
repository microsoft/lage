import { afterAll, describe, expect, it } from "@jest/globals";
import { cleanupFixtures, setupFixture } from "../setupFixture.js";
import { getBranchChanges } from "../../git/gitUtilities.js";

// Most of the logic for this is tested in getChangesBetweenRefs.test.ts
describe("getBranchChanges", () => {
  afterAll(() => {
    cleanupFixtures();
  });

  it("passes correct args through to getChangesBetweenRefs", () => {
    const cwd = setupFixture();

    // This will fail since it's not a git repo.
    // Verify the throwOnError option is true by default.
    expect(() => getBranchChanges({ branch: "foo", cwd })).toThrow(
      // The message shows the ref was passed through
      "Gathering information about changes between refs (foo...) failed"
    );
  });
});
