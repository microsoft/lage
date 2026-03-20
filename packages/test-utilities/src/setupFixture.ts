import path from "path";
import fs from "fs-extra";
import tempy from "tempy";
import execa from "execa";

/**
 * Directory containing test fixtures originally from the backfill project.
 * Some of these fixtures may be specific to backfill scenarios.
 */
const fixturesDir = path.resolve(__dirname, "../__fixtures__");

/**
 * Set up a test fixture by copying it to a temporary directory and initializing a git repo.
 *
 * This helper was originally part of the `backfill-utils-test` package, and some of the
 * fixtures it references may be specific to backfill scenarios.
 */
export function setupFixture(fixtureName: string): string {
  const fixturePath = path.join(fixturesDir, fixtureName);

  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Couldn't find fixture "${fixtureName}" in ${fixturesDir}`);
  }

  const tempDir = tempy.directory();
  const cwd = path.join(tempDir, `backfill-${fixtureName}`);

  fs.mkdirpSync(cwd);
  fs.copySync(fixturePath, cwd);

  execa.sync("git", ["init"], { cwd });
  execa.sync("git", ["config", "user.email", "test@testme.com"], { cwd });
  execa.sync("git", ["config", "user.name", "test fixture"], { cwd });
  execa.sync("git", ["add", "."], { cwd });
  execa.sync("git", ["commit", "-m", "test"], { cwd });

  return cwd;
}
