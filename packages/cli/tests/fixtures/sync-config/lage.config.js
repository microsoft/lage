module.exports = {
  pipeline: {
    build: ["^build"],
    test: ["build"],
    lint: [],
    start: [],
  },
  npmClient: "yarn",
};
