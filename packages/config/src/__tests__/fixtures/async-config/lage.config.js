module.exports = Promise.resolve({
  pipeline: {
    build: ["^build"],
    test: ["build"],
    lint: [],
    start: [],
  },
  npmClient: "yarn",
});
