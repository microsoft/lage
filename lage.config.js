// @ts-check

/** @type {import("lage").ConfigOptions} */
module.exports = {
  pipeline: {
    build: ["^build"],
    test: ["@lage-run/monorepo-fixture#build"],
    lint: [],
    start: [],

    // TODO: a temporary hack to allow both of these projects to run build with lage
    "@lage-run/docs-beta#build": ["@lage/docs#build"]
  },
  npmClient: "yarn",
};
