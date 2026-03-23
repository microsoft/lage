import path from "path";
import fs from "fs-extra";
import execa from "execa";
import { createTempDir } from "./createTempDir.js";

/**
 * Directory containing test fixtures originally from the backfill project.
 * Some of these fixtures may be specific to backfill scenarios.
 */
const fixturesDir = path.resolve(__dirname, "../__fixtures__");

/**
 * Valid fixture names to use with `setupFixture`.
 * Some of these fixtures may be specific to backfill scenarios.
 */
export type FixtureName =
  | "basic"
  | "config"
  | "custom-cache-provider"
  | "empty"
  | "hasher-nested-test-project"
  | "hasher-test-project"
  | "many-dependencies"
  | "monorepo"
  | "monorepo-pnpm"
  | "monorepo-rush-pnpm"
  | "monorepo-rush-yarn"
  | "multiple-output-folders"
  | "multiple-output-folders-with-cache"
  | "pre-built"
  | "pre-built-dist"
  | "with-cache"
  | "with-cache-dist";

/**
 * Set up a test fixture by copying it to a temporary directory and initializing a git repo.
 *
 * This helper was originally part of the `backfill-utils-test` package, and some of the
 * fixtures it references may be specific to backfill scenarios.
 */
export function setupFixture(fixtureName: FixtureName): string {
  const fixturePath = path.join(fixturesDir, fixtureName);

  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Couldn't find fixture "${fixtureName}" in ${fixturesDir}`);
  }

  const tempDir = createTempDir({ prefix: `backfill-${fixtureName}-` });
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
