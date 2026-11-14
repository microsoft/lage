// @ts-check
/** @import { ConfigOptions, CacheOptions, TargetConfig, WorkerTargetOptions } from 'lage' */
const os = require("os");
const path = require("path");
const fastGlob = require("fast-glob");
const { hostTarget, nativeTargets } = require("./scripts/rust/constants.js");
const { isCI } = require("./scripts/isCI.js");

const rustTargetType = process.env.SKIP_RUST ? "noop" : "npmScript";

/** @type {TargetConfig} */
const baseTestTarget = {
  type: "worker",
  weight: (target) => {
    return fastGlob.sync("src/__tests__/**/*.test.ts", { cwd: target.cwd }).length;
  },
  options: /** @satisfies {WorkerTargetOptions} */ ({
    worker: path.join(__dirname, "scripts/worker/jest.js"),
  }),
  dependsOn: ["build", "glob-hasher#build"],
};

/**
 * Lage config (the types are slightly incorrect about what's required/optional)
 * @type {Partial<Omit<ConfigOptions, 'cacheOptions'>> & { cacheOptions?: Partial<CacheOptions> }}
 */
const config = {
  pipeline: {
    "lage#bundle": {
      dependsOn: ["^^transpile", "types", "glob-hasher#build"],
      outputs: ["dist/**/*"],
    },
    types: {
      type: "worker",
      options: /** @satisfies {WorkerTargetOptions} */ ({
        worker: path.join(__dirname, "scripts/worker/types.js"),
      }),
      dependsOn: ["^types"],
      outputs: ["lib/**/*.d.{ts,mts}"],
    },
    isolatedTypes: {
      type: "worker",
      options: /** @satisfies {WorkerTargetOptions} */ ({
        worker: path.join(__dirname, "scripts/worker/types.js"),
      }),
      dependsOn: [],
      outputs: ["lib/**/*.d.{ts,mts}"],
    },
    transpile: {
      type: "worker",
      options: /** @satisfies {WorkerTargetOptions} */ ({
        worker: path.join(__dirname, "scripts/worker/transpile.js"),
      }),
      outputs: ["lib/**/*.{js,map}"],
    },
    test: { ...baseTestTarget },
    build: {
      type: "noop",
      dependsOn: ["transpile", "types"],
    },
    api: {
      dependsOn: ["types"],
      outputs: ["etc/*.api.md", "temp/*.api.md"],
    },
    lint: {
      type: "worker",
      // currently, lint depends on types due to typed linting and not using a tsconfig which includes all packages
      dependsOn: ["types"],
      options: /** @satisfies {WorkerTargetOptions} */ ({
        worker: path.join(__dirname, "scripts/worker/lint.js"),
      }),
    },
    depcheck: {
      type: "worker",
      options: /** @satisfies {WorkerTargetOptions} */ ({
        worker: path.join(__dirname, "scripts/worker/depcheck.js"),
      }),
    },
    "glob-hasher#build": {
      type: rustTargetType,
      dependsOn: [],
      inputs: ["src/**/*", "Cargo.lock", "*.toml", "*.rs", "package.json"],
      outputs: ["glob-hasher.*.node", "index.js", "index.d.ts", "temp/**/*"],
    },
    "glob-hasher#test": {
      type: "npmScript",
      dependsOn: ["build", ...nativeTargets.map(({ suffix }) => `glob-hasher-${suffix}#build`)],
    },
    "glob-hasher#lint": {
      type: rustTargetType,
      dependsOn: ["glob-hasher#build"],
    },
    ...Object.fromEntries(
      nativeTargets.map(({ suffix }) => [
        `glob-hasher-${suffix}#build`,
        // This is not a cycle since glob-hasher#build has dependsOn: []
        { type: "npmScript", dependsOn: ["glob-hasher#build"], outputs: ["*.node"] },
      ])
    ),
    "@lage-run/e2e-tests#test": {
      ...baseTestTarget,
      dependsOn: ["^^transpile", "lage#bundle", "glob-hasher#build"],
      // weight is used in scripts/worker/jest.js to determine max jest workers.
      // Make this task run last and give it all available resources.
      // But on CI, allow only one worker since this runs lage which internally creates workers.
      weight: isCI() ? 1 : os.availableParallelism(),
      priority: -9999,
    },
  },
  npmClient: "yarn",
  cacheOptions: {
    cacheKey: JSON.stringify({ target: hostTarget().triple, ci: isCI(), skipRust: !!process.env.SKIP_RUST }),
    // These are relative to the git root, and affect the hash of the cache.
    // Changes to any of these files will invalidate the cache.
    environmentGlob: [
      // Folder globs MUST end with **/* to include all files!
      "!node_modules/**/*",
      "!**/node_modules/**/*",
      "!**/__fixtures__/**",
      ".github/workflows/*",
      ".swcrc",
      "beachball.config.js",
      "lage.config.js",
      "/package.json",
      "scripts/**/*",
      "yarn.lock",
      "*.yml",
    ],
    // The only targets with output files explicitly declare them as `outputs` above
    outputGlob: [],
  },
};

module.exports = config;
