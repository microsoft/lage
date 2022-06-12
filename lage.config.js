// @ts-check

/** @type {import("lage").ConfigOptions} */
module.exports = {
  pipeline: {
    build: ["^build"],
    test: [],
    lint: [],
    start: [],
  },
  npmClient: "yarn",
};
