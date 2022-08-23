// @ts-check

/** @type {import("lage").ConfigOptions} */
module.exports = {
  pipeline: {
    build: ["^build"],
    test: [],
    lint: [],
    start: [],
    
    "lage#test": ["build"],
    "@lage-run/e2e-tests#test": ["^build"],

    // TODO: a temporary hack to allow both of these projects to run build with lage
    "@lage-run/docs-beta#build": ["@lage/docs#build"]
  },
  npmClient: "yarn",
};
